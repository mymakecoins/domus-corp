from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from domus_knowledge.knowledge_governance import (
    Actor,
    GovernanceRecord,
    approve,
    effective_cutover,
    freshness,
    open_conflict,
    reject,
    resolve_conflict,
    revoke,
)

NOW = datetime(2026, 8, 9, 12, tzinfo=UTC)


def candidate(**changes: object) -> GovernanceRecord:
    values: dict[str, object] = {
        "tenant_id": "22222222-2222-4222-8222-222222222222",
        "workspace_id": "33333333-3333-4333-8333-333333333333",
        "source_id": "66666666-6666-4666-8666-666666666666",
        "asset_id": "77777777-7777-4777-8777-777777777777",
        "version_id": "88888888-8888-4888-8888-888888888888",
        "owner_id": "55555555-5555-4555-8555-555555555555",
        "submitter_id": "44444444-4444-4444-8444-444444444444",
        "classification": "confidential",
        "original_checksum": "sha256:" + "a" * 64,
        "normalized_checksum": "sha256:" + "b" * 64,
        "policy_version": "policy-v1",
        "parser_version": "1.0.0",
        "observed_at": NOW - timedelta(hours=1),
        "valid_from": NOW,
        "valid_until": NOW + timedelta(days=30),
        "freshness_sla_seconds": 86400,
    }
    values.update(changes)
    return GovernanceRecord(**values)  # type: ignore[arg-type]


OWNER = Actor("55555555-5555-4555-8555-555555555555", "owner", "restricted", True)


def test_owner_approves_then_atomic_cutover_supersedes_previous() -> None:
    approved = approve(candidate(), OWNER, "Conteúdo validado pelo owner.", NOW)
    assert approved.state == "APPROVED" and approved.governance_version == 2
    previous = candidate(
        version_id="99999999-9999-4999-8999-999999999999",
        state="EFFECTIVE",
        governance_version=4,
    )
    effective, superseded = effective_cutover(approved, previous, NOW)
    assert effective.state == "EFFECTIVE"
    assert superseded is not None and superseded.state == "SUPERSEDED"


def test_approval_requires_authority_segregation_clearance_and_current_version() -> None:
    submitter = Actor(candidate().submitter_id, "owner", "restricted", True)
    with pytest.raises(ValueError, match="SEGREGATION"):
        approve(candidate(), submitter, "Justificativa suficientemente longa.", NOW)
    with pytest.raises(ValueError, match="AUTHORITY"):
        approve(
            candidate(), Actor(OWNER.user_id, "viewer", "restricted", True), "Validado agora.", NOW
        )
    with pytest.raises(ValueError, match="CLEARANCE"):
        approve(
            candidate(), Actor(OWNER.user_id, "owner", "internal", True), "Validado agora.", NOW
        )
    with pytest.raises(ValueError, match="VERSION_CONFLICT"):
        approve(candidate(), OWNER, "Validado agora.", NOW, expected_version=2)


def test_rejection_and_revocation_are_terminal_and_preserve_hashes() -> None:
    rejected = reject(candidate(), OWNER, "Documento inválido para publicação.", NOW)
    assert (
        rejected.state == "REJECTED" and rejected.original_checksum == candidate().original_checksum
    )
    with pytest.raises(ValueError, match="TERMINAL"):
        approve(rejected, OWNER, "Nova tentativa indevida.", NOW, expected_version=2)
    effective = candidate(state="EFFECTIVE", governance_version=3)
    revoked = revoke(effective, OWNER, "Fonte revogada pelo responsável.", NOW, expected_version=3)
    assert revoked.state == "REVOKED"


def test_freshness_is_server_derived_and_unknown_fails_closed() -> None:
    assert freshness(candidate(), NOW) == "FRESH"
    assert freshness(candidate(observed_at=NOW - timedelta(days=2)), NOW) == "STALE"
    assert freshness(candidate(valid_until=NOW), NOW) == "EXPIRED"
    with pytest.raises(ValueError, match="FRESHNESS_UNKNOWN"):
        freshness(candidate(freshness_sla_seconds=None), NOW)


def test_overlapping_divergent_versions_open_and_resolve_conflict() -> None:
    left = candidate(state="APPROVED", governance_version=2)
    right = candidate(
        version_id="99999999-9999-4999-8999-999999999999",
        normalized_checksum="sha256:" + "c" * 64,
        state="APPROVED",
        governance_version=2,
    )
    conflict, blocked_left, blocked_right = open_conflict(left, right, NOW)
    assert conflict.state == "OPEN"
    assert blocked_left.state == blocked_right.state == "CONFLICTED"
    winner, loser, resolved = resolve_conflict(
        conflict,
        blocked_left,
        blocked_right,
        OWNER,
        "PUBLISH_CANDIDATE",
        "A versão candidata foi conferida e deve prevalecer.",
        NOW,
    )
    assert winner.version_id == right.version_id and winner.state == "APPROVED"
    assert loser.state == "REJECTED" and resolved.state == "RESOLVED"


def test_no_conflict_for_same_hash_or_non_overlapping_interval() -> None:
    with pytest.raises(ValueError, match="CONFLICT_NOT_FOUND"):
        open_conflict(
            candidate(), candidate(version_id="99999999-9999-4999-8999-999999999999"), NOW
        )
    future = candidate(
        version_id="99999999-9999-4999-8999-999999999999",
        normalized_checksum="sha256:" + "c" * 64,
        valid_from=NOW + timedelta(days=31),
        valid_until=NOW + timedelta(days=60),
    )
    with pytest.raises(ValueError, match="CONFLICT_NOT_FOUND"):
        open_conflict(candidate(), future, NOW)
