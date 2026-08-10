"""Evidence-bound claims for the PostgreSQL Knowledge Graph Lite."""

from __future__ import annotations

import hashlib
import unicodedata
from dataclasses import dataclass, replace
from datetime import datetime
from typing import Literal

from .objects import Classification

ClaimKind = Literal["FACT", "INFERENCE", "RULE_CANDIDATE"]
ClaimState = Literal["CANDIDATE", "IN_REVIEW", "PUBLISHED", "CONFLICTED", "REJECTED", "REVOKED"]
EvidenceStatus = Literal["VALID", "INVALID"]
LEVEL = {"public": 0, "internal": 1, "confidential": 2, "restricted": 3}


@dataclass(frozen=True)
class Evidence:
    evidence_id: str
    tenant_id: str
    workspace_id: str
    source_id: str
    asset_id: str
    version_id: str
    classification: Classification
    locator_kind: Literal["page", "section", "record", "offset"]
    locator_value: str
    start_offset: int
    end_offset: int
    original_checksum: str
    normalized_checksum: str
    excerpt_hash: str
    valid_from: datetime
    valid_until: datetime | None
    status: EvidenceStatus
    invalidated_at: datetime | None = None
    invalidation_reason: str | None = None


@dataclass(frozen=True)
class ClaimCandidate:
    claim_id: str
    owner_id: str
    author_id: str
    kind: ClaimKind
    statement: str
    confidence: float
    evidences: tuple[Evidence, ...]
    valid_from: datetime
    valid_until: datetime | None


@dataclass(frozen=True)
class Claim:
    claim_id: str
    tenant_id: str
    workspace_id: str
    owner_id: str
    author_id: str
    kind: ClaimKind
    canonical_hash: str
    statement_hash: str
    confidence: float
    evidence_ids: tuple[str, ...]
    classification: Classification
    valid_from: datetime
    valid_until: datetime | None
    state: ClaimState = "CANDIDATE"
    version: int = 1
    reviewed_by: str | None = None
    reason_hash: str | None = None


@dataclass(frozen=True)
class Reviewer:
    user_id: str
    role: Literal["owner", "manager", "admin", "viewer"]
    clearance: Classification
    active: bool


def canonical_claim_hash(statement: str) -> str:
    normalized = " ".join(unicodedata.normalize("NFKC", statement).casefold().split())
    return f"sha256:{hashlib.sha256(normalized.encode()).hexdigest()}"


def _evidence_valid(item: Evidence, now: datetime) -> bool:
    return (
        item.status == "VALID"
        and item.start_offset >= 0
        and item.end_offset > item.start_offset
        and item.valid_from <= now
        and (item.valid_until is None or now < item.valid_until)
        and len(item.locator_value) <= 256
    )


def create_claim(candidate: ClaimCandidate, now: datetime) -> Claim:
    if not candidate.evidences or len(candidate.evidences) > 50:
        raise ValueError("CLAIM_EVIDENCE_REQUIRED")
    if not all(_evidence_valid(item, now) for item in candidate.evidences):
        raise ValueError("CLAIM_EVIDENCE_INVALID")
    scopes = {(item.tenant_id, item.workspace_id) for item in candidate.evidences}
    if len(scopes) != 1:
        raise ValueError("CLAIM_EVIDENCE_SCOPE_MISMATCH")
    if not candidate.statement.strip() or len(candidate.statement) > 8_000:
        raise ValueError("CLAIM_STATEMENT_INVALID")
    if not 0 <= candidate.confidence <= 1:
        raise ValueError("CLAIM_CONFIDENCE_INVALID")
    tenant_id, workspace_id = next(iter(scopes))
    classification = max((item.classification for item in candidate.evidences), key=LEVEL.get)  # type: ignore[arg-type]
    evidence_ids = tuple(sorted({item.evidence_id for item in candidate.evidences}))
    return Claim(
        candidate.claim_id,
        tenant_id,
        workspace_id,
        candidate.owner_id,
        candidate.author_id,
        candidate.kind,
        canonical_claim_hash(candidate.statement),
        f"sha256:{hashlib.sha256(candidate.statement.encode()).hexdigest()}",
        candidate.confidence,
        evidence_ids,
        classification,
        candidate.valid_from,
        candidate.valid_until,
    )


def publish_claim(
    claim: Claim, reviewer: Reviewer, reason: str, now: datetime, expected_version: int
) -> Claim:
    del now
    if claim.state not in {"CANDIDATE", "IN_REVIEW"}:
        raise ValueError("CLAIM_STATE_INVALID")
    if claim.version != expected_version:
        raise ValueError("CLAIM_VERSION_CONFLICT")
    if claim.confidence < 0.70:
        raise ValueError("CLAIM_CONFIDENCE_TOO_LOW")
    if reviewer.user_id == claim.author_id:
        raise ValueError("CLAIM_SEGREGATION_DENIED")
    if (
        not reviewer.active
        or reviewer.role not in {"owner", "manager", "admin"}
        or LEVEL[reviewer.clearance] < LEVEL[claim.classification]
    ):
        raise ValueError("CLAIM_AUTHORITY_DENIED")
    clean = " ".join(reason.split())
    if len(clean) < 10 or len(clean) > 1_000:
        raise ValueError("CLAIM_REASON_INVALID")
    return replace(
        claim,
        state="PUBLISHED",
        version=expected_version + 1,
        reviewed_by=reviewer.user_id,
        reason_hash=f"sha256:{hashlib.sha256(clean.encode()).hexdigest()}",
    )


def invalidate_evidence(item: Evidence, reason: str, now: datetime) -> Evidence:
    if item.status != "VALID" or reason not in {
        "SOURCE_REVOKED",
        "VERSION_EXPIRED",
        "SAFETY_BLOCKED",
        "INTEGRITY_MISMATCH",
    }:
        raise ValueError("EVIDENCE_INVALIDATION_DENIED")
    return replace(item, status="INVALID", invalidated_at=now, invalidation_reason=reason)
