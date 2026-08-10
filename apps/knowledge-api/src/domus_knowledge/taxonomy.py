"""Versioned corporate taxonomy and monotonic asset classification."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, replace
from typing import Literal

from .objects import Classification

TaxonomyState = Literal["DRAFT", "IN_REVIEW", "PUBLISHED", "SUPERSEDED", "RETIRED"]
AssignmentState = Literal["UNCLASSIFIED", "CANDIDATE", "REVIEWED", "CONFIRMED"]
Method = Literal["RULE", "HUMAN", "MODEL_SUGGESTION"]
AssetType = Literal["policy", "procedure", "report", "record", "dataset"]
LEVEL = {"public": 0, "internal": 1, "confidential": 2, "restricted": 3}


@dataclass(frozen=True)
class TaxonomyTerm:
    canonical_key: str
    label: str
    definition: str
    parent_key: str | None
    synonyms: tuple[str, ...]
    status: Literal["ACTIVE", "DEPRECATED"] = "ACTIVE"
    replacement_key: str | None = None


@dataclass(frozen=True)
class TaxonomyVersion:
    taxonomy_id: str
    tenant_id: str
    workspace_id: str
    version_id: str
    owner_id: str
    author_id: str
    version: int
    state: TaxonomyState
    terms: tuple[TaxonomyTerm, ...]
    governance_version: int = 1
    reason_hash: str | None = None


@dataclass(frozen=True)
class Publisher:
    user_id: str
    role: Literal["owner", "manager", "admin", "viewer"]
    clearance: Classification
    active: bool


@dataclass(frozen=True)
class AssignmentCandidate:
    asset_id: str
    version_id: str
    source_classification: Classification
    asset_type: AssetType
    term_keys: tuple[str, ...]
    method: Method
    confidence: float


@dataclass(frozen=True)
class AssetTaxonomyAssignment:
    assignment_id: str
    asset_id: str
    version_id: str
    taxonomy_id: str
    taxonomy_version_id: str
    asset_type: AssetType
    term_keys: tuple[str, ...]
    classification: Classification
    method: Method
    confidence: float
    state: AssignmentState


@dataclass(frozen=True)
class ReprocessingPlan:
    plan_id: str
    taxonomy_id: str
    from_version_id: str
    to_version_id: str
    estimated_assets: int
    batch_size: int
    state: Literal["PENDING", "RUNNING", "COMPLETED", "FAILED"]


def _validate(version: TaxonomyVersion) -> None:
    if not version.terms or len(version.terms) > 10_000:
        raise ValueError("TAXONOMY_SIZE_INVALID")
    by_key = {term.canonical_key: term for term in version.terms}
    if len(by_key) != len(version.terms):
        raise ValueError("TAXONOMY_DUPLICATE_KEY")
    for term in version.terms:
        if not 2 <= len(term.canonical_key) <= 80 or not 2 <= len(term.label) <= 120:
            raise ValueError("TAXONOMY_TERM_INVALID")
        if not 10 <= len(term.definition) <= 2_000 or len(term.synonyms) > 20:
            raise ValueError("TAXONOMY_TERM_INVALID")
        if len(set(value.casefold() for value in term.synonyms)) != len(term.synonyms):
            raise ValueError("TAXONOMY_DUPLICATE_SYNONYM")
        if term.parent_key is not None and term.parent_key not in by_key:
            raise ValueError("TAXONOMY_PARENT_UNKNOWN")
        seen: set[str] = set()
        current: TaxonomyTerm | None = term
        depth = 0
        while current is not None and current.parent_key is not None:
            if current.canonical_key in seen:
                raise ValueError("TAXONOMY_CYCLE")
            seen.add(current.canonical_key)
            depth += 1
            if depth > 8:
                raise ValueError("TAXONOMY_DEPTH_EXCEEDED")
            current = by_key[current.parent_key]


def _reason_hash(reason: str) -> str:
    clean = " ".join(reason.split())
    if len(clean) < 10 or len(clean) > 1_000:
        raise ValueError("TAXONOMY_REASON_INVALID")
    return f"sha256:{hashlib.sha256(clean.encode()).hexdigest()}"


def publish_taxonomy(
    candidate: TaxonomyVersion,
    publisher: Publisher,
    reason: str,
    expected_version: int,
    current: TaxonomyVersion | None,
) -> tuple[TaxonomyVersion, TaxonomyVersion | None]:
    if candidate.state != "IN_REVIEW":
        raise ValueError("TAXONOMY_STATE_INVALID")
    if candidate.governance_version != expected_version:
        raise ValueError("TAXONOMY_VERSION_CONFLICT")
    if publisher.user_id == candidate.author_id:
        raise ValueError("TAXONOMY_SEGREGATION_DENIED")
    if (
        not publisher.active
        or publisher.role not in {"owner", "manager", "admin"}
        or (publisher.role == "owner" and publisher.user_id != candidate.owner_id)
    ):
        raise ValueError("TAXONOMY_AUTHORITY_DENIED")
    _validate(candidate)
    published = replace(
        candidate,
        state="PUBLISHED",
        governance_version=expected_version + 1,
        reason_hash=_reason_hash(reason),
    )
    if current is None:
        return published, None
    if current.state != "PUBLISHED" or current.taxonomy_id != candidate.taxonomy_id:
        raise ValueError("TAXONOMY_PUBLICATION_CONFLICT")
    return published, replace(
        current, state="SUPERSEDED", governance_version=current.governance_version + 1
    )


def assign_asset(
    taxonomy: TaxonomyVersion,
    candidate: AssignmentCandidate,
    proposed_classification: Classification,
) -> AssetTaxonomyAssignment:
    if taxonomy.state != "PUBLISHED":
        raise ValueError("TAXONOMY_NOT_PUBLISHED")
    _validate(taxonomy)
    known = {term.canonical_key for term in taxonomy.terms if term.status == "ACTIVE"}
    if (
        not candidate.term_keys
        or len(candidate.term_keys) > 20
        or not set(candidate.term_keys) <= known
    ):
        raise ValueError("TAXONOMY_TERM_UNKNOWN")
    if not 0 <= candidate.confidence <= 1:
        raise ValueError("TAXONOMY_CONFIDENCE_INVALID")
    classification = max((candidate.source_classification, proposed_classification), key=LEVEL.get)  # type: ignore[arg-type]
    state: AssignmentState = (
        "CANDIDATE"
        if candidate.method == "MODEL_SUGGESTION" or candidate.confidence < 1
        else "CONFIRMED"
    )
    identity = ":".join((candidate.version_id, taxonomy.version_id, *candidate.term_keys))
    return AssetTaxonomyAssignment(
        hashlib.sha256(identity.encode()).hexdigest(),
        candidate.asset_id,
        candidate.version_id,
        taxonomy.taxonomy_id,
        taxonomy.version_id,
        candidate.asset_type,
        tuple(sorted(set(candidate.term_keys))),
        classification,
        candidate.method,
        candidate.confidence,
        state,
    )


def build_reprocessing_plan(
    old: TaxonomyVersion, new: TaxonomyVersion, estimated_assets: int
) -> ReprocessingPlan:
    if (
        old.taxonomy_id != new.taxonomy_id
        or old.version_id == new.version_id
        or old.state != "PUBLISHED"
        or new.state != "PUBLISHED"
        or estimated_assets < 0
    ):
        raise ValueError("TAXONOMY_REPROCESSING_INVALID")
    identity = f"{old.taxonomy_id}:{old.version_id}:{new.version_id}:{estimated_assets}"
    return ReprocessingPlan(
        hashlib.sha256(identity.encode()).hexdigest(),
        old.taxonomy_id,
        old.version_id,
        new.version_id,
        estimated_assets,
        100,
        "PENDING",
    )
