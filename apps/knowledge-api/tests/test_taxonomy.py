from __future__ import annotations

from dataclasses import replace

import pytest

from domus_knowledge.taxonomy import (
    AssignmentCandidate,
    Publisher,
    TaxonomyTerm,
    TaxonomyVersion,
    assign_asset,
    build_reprocessing_plan,
    publish_taxonomy,
)


def version(*terms: TaxonomyTerm, **changes: object) -> TaxonomyVersion:
    values: dict[str, object] = {
        "taxonomy_id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "tenant_id": "22222222-2222-4222-8222-222222222222",
        "workspace_id": "33333333-3333-4333-8333-333333333333",
        "version_id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        "owner_id": "55555555-5555-4555-8555-555555555555",
        "author_id": "44444444-4444-4444-8444-444444444444",
        "version": 1,
        "state": "IN_REVIEW",
        "terms": terms,
    }
    values.update(changes)
    return TaxonomyVersion(**values)  # type: ignore[arg-type]


ROOT = TaxonomyTerm("governance", "Governança", "Práticas de governança corporativa.", None, ())
CHILD = TaxonomyTerm(
    "policy", "Política", "Documento normativo aprovado pelo owner.", "governance", ("norma",)
)
OWNER = Publisher("55555555-5555-4555-8555-555555555555", "owner", "restricted", True)


def test_valid_taxonomy_is_published_and_previous_is_superseded() -> None:
    current = version(ROOT, CHILD, state="PUBLISHED", governance_version=3)
    candidate = version(
        ROOT,
        replace(CHILD, label="Política corporativa"),
        version_id="cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        version=2,
    )
    published, superseded = publish_taxonomy(
        candidate, OWNER, "Vocabulário revisado pelo Knowledge Owner.", 1, current
    )
    assert published.state == "PUBLISHED" and published.governance_version == 2
    assert superseded is not None and superseded.state == "SUPERSEDED"


def test_publication_rejects_self_approval_cycles_duplicates_and_depth() -> None:
    with pytest.raises(ValueError, match="SEGREGATION"):
        publish_taxonomy(
            version(ROOT),
            Publisher("44444444-4444-4444-8444-444444444444", "owner", "restricted", True),
            "Tentativa de autoaprovação indevida.",
            1,
            None,
        )
    cyclic = version(replace(ROOT, parent_key="policy"), CHILD)
    with pytest.raises(ValueError, match="CYCLE"):
        publish_taxonomy(cyclic, OWNER, "Ciclo deve ser rejeitado integralmente.", 1, None)
    duplicate = version(ROOT, replace(CHILD, canonical_key="governance"))
    with pytest.raises(ValueError, match="DUPLICATE"):
        publish_taxonomy(duplicate, OWNER, "Duplicidade deve falhar fechado.", 1, None)


def test_assignment_never_lowers_classification_and_model_only_suggests() -> None:
    published = version(ROOT, CHILD, state="PUBLISHED")
    candidate = AssignmentCandidate(
        "77777777-7777-4777-8777-777777777777",
        "88888888-8888-4888-8888-888888888888",
        "confidential",
        "policy",
        ("policy",),
        "MODEL_SUGGESTION",
        0.98,
    )
    assignment = assign_asset(published, candidate, proposed_classification="internal")
    assert assignment.classification == "confidential"
    assert assignment.state == "CANDIDATE"
    confirmed = assign_asset(
        published,
        replace(candidate, method="HUMAN", confidence=1.0),
        proposed_classification="restricted",
    )
    assert confirmed.state == "CONFIRMED" and confirmed.classification == "restricted"


def test_unknown_or_unpublished_terms_fail_closed() -> None:
    candidate = AssignmentCandidate(
        "77777777-7777-4777-8777-777777777777",
        "88888888-8888-4888-8888-888888888888",
        "internal",
        "report",
        ("missing",),
        "RULE",
        1.0,
    )
    with pytest.raises(ValueError, match="TAXONOMY_NOT_PUBLISHED"):
        assign_asset(version(ROOT), candidate, "internal")
    with pytest.raises(ValueError, match="TERM_UNKNOWN"):
        assign_asset(version(ROOT, state="PUBLISHED"), candidate, "internal")


def test_reprocessing_plan_is_versioned_and_idempotent() -> None:
    old = version(ROOT, CHILD, state="PUBLISHED")
    new = version(
        ROOT,
        replace(CHILD, parent_key=None),
        version_id="cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        version=2,
        state="PUBLISHED",
    )
    plan = build_reprocessing_plan(old, new, estimated_assets=200)
    assert plan.state == "PENDING" and plan.batch_size == 100
    assert plan == build_reprocessing_plan(old, new, estimated_assets=200)
