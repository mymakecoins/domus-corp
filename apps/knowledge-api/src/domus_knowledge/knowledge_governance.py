"""Version approval, validity, freshness and deterministic conflict governance."""

from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import datetime
from typing import Literal
from uuid import uuid4

from .objects import Classification

GovernanceState = Literal[
    "PENDING_REVIEW",
    "APPROVED",
    "EFFECTIVE",
    "CONFLICTED",
    "REJECTED",
    "SUPERSEDED",
    "EXPIRED",
    "REVOKED",
]
Freshness = Literal["FRESH", "STALE", "EXPIRED"]
Role = Literal["owner", "manager", "admin", "viewer"]
ConflictState = Literal["OPEN", "RESOLVED"]
Resolution = Literal["KEEP_EXISTING", "PUBLISH_CANDIDATE", "REJECT_BOTH"]
TERMINAL = frozenset({"REJECTED", "SUPERSEDED", "EXPIRED", "REVOKED"})
LEVEL = {"public": 0, "internal": 1, "confidential": 2, "restricted": 3}


@dataclass(frozen=True)
class Actor:
    user_id: str
    role: Role
    clearance: Classification
    active: bool


@dataclass(frozen=True)
class GovernanceRecord:
    tenant_id: str
    workspace_id: str
    source_id: str
    asset_id: str
    version_id: str
    owner_id: str
    submitter_id: str
    classification: Classification
    original_checksum: str
    normalized_checksum: str
    policy_version: str
    parser_version: str
    observed_at: datetime
    valid_from: datetime
    valid_until: datetime | None
    freshness_sla_seconds: int | None
    state: GovernanceState = "PENDING_REVIEW"
    governance_version: int = 1
    decided_by: str | None = None
    decided_at: datetime | None = None
    reason_hash: str | None = None


@dataclass(frozen=True)
class Conflict:
    conflict_id: str
    tenant_id: str
    workspace_id: str
    asset_id: str
    existing_version_id: str
    candidate_version_id: str
    state: ConflictState
    version: int = 1
    resolved_by: str | None = None


def _hash_reason(reason: str) -> str:
    import hashlib

    clean = " ".join(reason.split())
    if len(clean) < 10 or len(clean) > 1000:
        raise ValueError("GOVERNANCE_REASON_INVALID")
    return f"sha256:{hashlib.sha256(clean.encode()).hexdigest()}"


def _authorize(record: GovernanceRecord, actor: Actor) -> None:
    if actor.user_id == record.submitter_id:
        raise ValueError("GOVERNANCE_SEGREGATION_DENIED")
    if not actor.active or actor.role not in {"owner", "manager", "admin"}:
        raise ValueError("GOVERNANCE_AUTHORITY_DENIED")
    if actor.role == "owner" and actor.user_id != record.owner_id:
        raise ValueError("GOVERNANCE_AUTHORITY_DENIED")
    if LEVEL[actor.clearance] < LEVEL[record.classification]:
        raise ValueError("GOVERNANCE_CLEARANCE_DENIED")


def _decide(
    record: GovernanceRecord,
    actor: Actor,
    reason: str,
    now: datetime,
    state: Literal["APPROVED", "REJECTED"],
    expected_version: int,
) -> GovernanceRecord:
    if record.state in TERMINAL:
        raise ValueError("GOVERNANCE_TERMINAL")
    if record.state != "PENDING_REVIEW":
        raise ValueError("GOVERNANCE_STATE_INVALID")
    if record.governance_version != expected_version:
        raise ValueError("GOVERNANCE_VERSION_CONFLICT")
    _authorize(record, actor)
    return replace(
        record,
        state=state,
        governance_version=expected_version + 1,
        decided_by=actor.user_id,
        decided_at=now,
        reason_hash=_hash_reason(reason),
    )


def approve(
    record: GovernanceRecord, actor: Actor, reason: str, now: datetime, expected_version: int = 1
) -> GovernanceRecord:
    return _decide(record, actor, reason, now, "APPROVED", expected_version)


def reject(
    record: GovernanceRecord, actor: Actor, reason: str, now: datetime, expected_version: int = 1
) -> GovernanceRecord:
    return _decide(record, actor, reason, now, "REJECTED", expected_version)


def effective_cutover(
    candidate: GovernanceRecord, previous: GovernanceRecord | None, now: datetime
) -> tuple[GovernanceRecord, GovernanceRecord | None]:
    if candidate.state != "APPROVED" or candidate.valid_from > now:
        raise ValueError("GOVERNANCE_CUTOVER_DENIED")
    if candidate.valid_until is not None and candidate.valid_until <= now:
        raise ValueError("GOVERNANCE_CUTOVER_DENIED")
    effective = replace(
        candidate, state="EFFECTIVE", governance_version=candidate.governance_version + 1
    )
    if previous is None:
        return effective, None
    if previous.state != "EFFECTIVE" or previous.asset_id != candidate.asset_id:
        raise ValueError("GOVERNANCE_CUTOVER_CONFLICT")
    return effective, replace(
        previous, state="SUPERSEDED", governance_version=previous.governance_version + 1
    )


def revoke(
    record: GovernanceRecord, actor: Actor, reason: str, now: datetime, expected_version: int
) -> GovernanceRecord:
    if record.state not in {"APPROVED", "EFFECTIVE", "CONFLICTED"}:
        raise ValueError("GOVERNANCE_TERMINAL")
    if record.governance_version != expected_version:
        raise ValueError("GOVERNANCE_VERSION_CONFLICT")
    _authorize(record, actor)
    return replace(
        record,
        state="REVOKED",
        governance_version=expected_version + 1,
        decided_by=actor.user_id,
        decided_at=now,
        reason_hash=_hash_reason(reason),
    )


def freshness(record: GovernanceRecord, now: datetime) -> Freshness:
    if record.freshness_sla_seconds is None or record.freshness_sla_seconds < 300:
        raise ValueError("FRESHNESS_UNKNOWN")
    if record.valid_until is not None and now >= record.valid_until:
        return "EXPIRED"
    if (now - record.observed_at).total_seconds() > record.freshness_sla_seconds:
        return "STALE"
    return "FRESH"


def _overlaps(left: GovernanceRecord, right: GovernanceRecord) -> bool:
    maximum = datetime.max.replace(tzinfo=left.valid_from.tzinfo)
    return left.valid_from < (right.valid_until or maximum) and right.valid_from < (
        left.valid_until or maximum
    )


def open_conflict(
    left: GovernanceRecord, right: GovernanceRecord, now: datetime
) -> tuple[Conflict, GovernanceRecord, GovernanceRecord]:
    del now
    if (
        left.asset_id != right.asset_id
        or left.version_id == right.version_id
        or left.normalized_checksum == right.normalized_checksum
        or not _overlaps(left, right)
    ):
        raise ValueError("GOVERNANCE_CONFLICT_NOT_FOUND")
    if left.state not in {"PENDING_REVIEW", "APPROVED"} or right.state not in {
        "PENDING_REVIEW",
        "APPROVED",
    }:
        raise ValueError("GOVERNANCE_CONFLICT_STATE")
    conflict = Conflict(
        str(uuid4()),
        left.tenant_id,
        left.workspace_id,
        left.asset_id,
        left.version_id,
        right.version_id,
        "OPEN",
    )
    return (
        conflict,
        replace(left, state="CONFLICTED", governance_version=left.governance_version + 1),
        replace(right, state="CONFLICTED", governance_version=right.governance_version + 1),
    )


def resolve_conflict(
    conflict: Conflict,
    existing: GovernanceRecord,
    candidate: GovernanceRecord,
    actor: Actor,
    resolution: Resolution,
    reason: str,
    now: datetime,
) -> tuple[GovernanceRecord, GovernanceRecord, Conflict]:
    if (
        conflict.state != "OPEN"
        or existing.state != "CONFLICTED"
        or candidate.state != "CONFLICTED"
    ):
        raise ValueError("GOVERNANCE_CONFLICT_STATE")
    _authorize(candidate, actor)
    reason_hash = _hash_reason(reason)

    def decision(record: GovernanceRecord, state: GovernanceState) -> GovernanceRecord:
        return replace(
            record,
            state=state,
            governance_version=record.governance_version + 1,
            decided_by=actor.user_id,
            decided_at=now,
            reason_hash=reason_hash,
        )

    if resolution == "KEEP_EXISTING":
        winner, loser = existing, candidate
    elif resolution == "PUBLISH_CANDIDATE":
        winner, loser = candidate, existing
    else:
        winner, loser = existing, candidate
        return (
            decision(winner, "REJECTED"),
            decision(loser, "REJECTED"),
            replace(conflict, state="RESOLVED", version=2, resolved_by=actor.user_id),
        )
    return (
        decision(winner, "APPROVED"),
        decision(loser, "REJECTED"),
        replace(conflict, state="RESOLVED", version=2, resolved_by=actor.user_id),
    )
