from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from domus_knowledge.knowledge_graph import (
    ClaimCandidate,
    Evidence,
    Reviewer,
    canonical_claim_hash,
    create_claim,
    invalidate_evidence,
    publish_claim,
)

NOW = datetime(2026, 8, 10, 12, tzinfo=UTC)


def evidence(**changes: object) -> Evidence:
    values: dict[str, object] = {
        "evidence_id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "tenant_id": "22222222-2222-4222-8222-222222222222",
        "workspace_id": "33333333-3333-4333-8333-333333333333",
        "source_id": "66666666-6666-4666-8666-666666666666",
        "asset_id": "77777777-7777-4777-8777-777777777777",
        "version_id": "88888888-8888-4888-8888-888888888888",
        "classification": "confidential",
        "locator_kind": "page",
        "locator_value": "3",
        "start_offset": 10,
        "end_offset": 80,
        "original_checksum": "sha256:" + "a" * 64,
        "normalized_checksum": "sha256:" + "b" * 64,
        "excerpt_hash": "sha256:" + "c" * 64,
        "valid_from": NOW - timedelta(days=1),
        "valid_until": NOW + timedelta(days=30),
        "status": "VALID",
    }
    values.update(changes)
    return Evidence(**values)  # type: ignore[arg-type]


def candidate(**changes: object) -> ClaimCandidate:
    values: dict[str, object] = {
        "claim_id": "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        "owner_id": "55555555-5555-4555-8555-555555555555",
        "author_id": "44444444-4444-4444-8444-444444444444",
        "kind": "FACT",
        "statement": "A política de viagens exige aprovação prévia.",
        "confidence": 0.9,
        "evidences": (evidence(),),
        "valid_from": NOW,
        "valid_until": NOW + timedelta(days=30),
    }
    values.update(changes)
    return ClaimCandidate(**values)  # type: ignore[arg-type]


OWNER = Reviewer("55555555-5555-4555-8555-555555555555", "owner", "restricted", True)


def test_claim_requires_valid_evidence_and_preserves_fact_kind() -> None:
    claim = create_claim(candidate(), NOW)
    assert claim.state == "CANDIDATE" and claim.kind == "FACT"
    assert claim.canonical_hash == canonical_claim_hash(candidate().statement)
    assert claim.evidence_ids == (evidence().evidence_id,)
    with pytest.raises(ValueError, match="EVIDENCE_REQUIRED"):
        create_claim(candidate(evidences=()), NOW)
    with pytest.raises(ValueError, match="EVIDENCE_INVALID"):
        create_claim(candidate(evidences=(evidence(status="INVALID"),)), NOW)


def test_inference_never_becomes_fact_and_publish_is_human_segregated() -> None:
    inference = create_claim(candidate(kind="INFERENCE"), NOW)
    published = publish_claim(
        inference, OWNER, "Inferência revisada com evidência suficiente.", NOW, 1
    )
    assert published.state == "PUBLISHED" and published.kind == "INFERENCE"
    with pytest.raises(ValueError, match="SEGREGATION"):
        publish_claim(
            create_claim(candidate(), NOW),
            Reviewer(candidate().author_id, "owner", "restricted", True),
            "Autor não pode publicar o próprio claim.",
            NOW,
            1,
        )


def test_low_confidence_and_expired_evidence_fail_closed() -> None:
    with pytest.raises(ValueError, match="CONFIDENCE"):
        publish_claim(
            create_claim(candidate(confidence=0.69), NOW), OWNER, "Baixa confiança.", NOW, 1
        )
    with pytest.raises(ValueError, match="EVIDENCE_INVALID"):
        create_claim(candidate(evidences=(evidence(valid_until=NOW),)), NOW)


def test_evidence_invalidation_revokes_eligibility_without_deleting_lineage() -> None:
    invalid = invalidate_evidence(evidence(), "SOURCE_REVOKED", NOW)
    assert invalid.status == "INVALID" and invalid.invalidated_at == NOW
    assert invalid.excerpt_hash == evidence().excerpt_hash


def test_canonical_hash_deduplicates_spacing_and_case() -> None:
    assert canonical_claim_hash("  Política   APROVADA ") == canonical_claim_hash(
        "política aprovada"
    )
