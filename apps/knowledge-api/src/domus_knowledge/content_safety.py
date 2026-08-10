"""Deterministic indirect prompt-injection assessment for untrusted knowledge data."""

from __future__ import annotations

import hashlib
import html
import re
from dataclasses import dataclass, replace
from datetime import datetime
from typing import Literal

from .objects import Classification

Decision = Literal["ALLOW_WITH_MARKERS", "REVIEW_REQUIRED", "QUARANTINE", "BLOCK"]
Category = Literal[
    "INSTRUCTION_OVERRIDE", "EXFILTRATION", "TOOL_COERCION", "OBFUSCATION", "ROLE_SPOOFING"
]
ReviewDecision = Literal["RELEASE", "KEEP_QUARANTINED", "REJECT"]
Role = Literal["security", "knowledge", "viewer"]
LEVEL = {"public": 0, "internal": 1, "confidential": 2, "restricted": 3}
KNOWN_SCANNERS = frozenset({("default", "1.0.0")})


@dataclass(frozen=True)
class SafetyInput:
    tenant_id: str
    workspace_id: str
    source_id: str
    asset_id: str
    version_id: str
    owner_id: str
    normalized_checksum: str
    classification: Classification
    policy_version: str
    scanner_profile: str
    scanner_version: str


@dataclass(frozen=True)
class Finding:
    finding_id: str
    category: Category
    severity: Literal["MEDIUM", "CRITICAL"]
    confidence: float
    locator: str


@dataclass(frozen=True)
class SafetyAssessment:
    assessment_id: str
    tenant_id: str
    workspace_id: str
    source_id: str
    asset_id: str
    version_id: str
    owner_id: str
    normalized_checksum: str
    classification: Classification
    policy_version: str
    scanner_profile: str
    scanner_version: str
    trust_origin: Literal["UNTRUSTED_EXTERNAL_DATA"]
    score: float
    decision: Decision
    findings: tuple[Finding, ...]
    assessed_at: datetime
    version: int = 1
    reviewed_by: str | None = None
    reviewed_at: datetime | None = None
    review_reason_hash: str | None = None


@dataclass(frozen=True)
class Reviewer:
    user_id: str
    role: Role
    clearance: Classification
    active: bool


PATTERNS: tuple[tuple[Category, Literal["MEDIUM", "CRITICAL"], float, re.Pattern[str]], ...] = (
    (
        "INSTRUCTION_OVERRIDE",
        "CRITICAL",
        0.95,
        re.compile(
            r"\b(ignore|disregard).{0,40}\b(instructions?|policy)|\boverride.{0,20}\b(system|policy)",
            re.I,
        ),
    ),
    (
        "EXFILTRATION",
        "CRITICAL",
        0.95,
        re.compile(
            r"\b(reveal|expose|print|return).{0,40}\b"
            r"(system prompt|secrets?|credentials?|api keys?)",
            re.I,
        ),
    ),
    (
        "TOOL_COERCION",
        "CRITICAL",
        0.90,
        re.compile(r"\b(call|invoke|execute|run).{0,30}\b(tool|action|command|external)", re.I),
    ),
    (
        "ROLE_SPOOFING",
        "CRITICAL",
        0.90,
        re.compile(
            r"\b(system|assistant)\s*:|\byou are now\b.{0,30}\b(admin|owner)|\bclearance\b", re.I
        ),
    ),
)


def _identifier(source: str) -> str:
    return hashlib.sha256(source.encode()).hexdigest()


def scan_content(
    source: SafetyInput, content: bytes, now: datetime, *, policy_valid: bool = True
) -> SafetyAssessment:
    actual = f"sha256:{hashlib.sha256(content).hexdigest()}"
    if actual != source.normalized_checksum:
        raise RuntimeError("CONTENT_SAFETY_INTEGRITY_MISMATCH")
    if (source.scanner_profile, source.scanner_version) not in KNOWN_SCANNERS:
        raise ValueError("CONTENT_SAFETY_SCANNER_VERSION_UNKNOWN")
    assessment_id = _identifier(
        f"{source.version_id}:{source.normalized_checksum}:{source.scanner_profile}:"
        f"{source.scanner_version}"
    )
    if not policy_valid or not source.policy_version:
        return SafetyAssessment(
            assessment_id,
            source.tenant_id,
            source.workspace_id,
            source.source_id,
            source.asset_id,
            source.version_id,
            source.owner_id,
            source.normalized_checksum,
            source.classification,
            source.policy_version,
            source.scanner_profile,
            source.scanner_version,
            "UNTRUSTED_EXTERNAL_DATA",
            1.0,
            "BLOCK",
            (),
            now,
        )
    text = content.decode("utf-8", errors="replace")
    findings: list[Finding] = []
    for category, severity, confidence, pattern in PATTERNS:
        for match in pattern.finditer(text):
            locator = f"char:{match.start()}-{match.end()}"
            findings.append(
                Finding(
                    _identifier(f"{actual}:{category}:{locator}:{source.scanner_version}"),
                    category,
                    severity,
                    confidence,
                    locator,
                )
            )
    invisible = sum(text.count(character) for character in ("\u200b", "\u200c", "\u200d", "\ufeff"))
    if invisible >= 3:
        locator = "document:invisible-characters"
        findings.append(
            Finding(
                _identifier(f"{actual}:OBFUSCATION:{locator}:{source.scanner_version}"),
                "OBFUSCATION",
                "MEDIUM",
                0.5,
                locator,
            )
        )
    findings.sort(key=lambda item: (item.category, item.locator, item.finding_id))
    score = max((finding.confidence for finding in findings), default=0.0)
    decision: Decision = (
        "QUARANTINE"
        if any(item.severity == "CRITICAL" for item in findings) or score >= 0.8
        else "REVIEW_REQUIRED"
        if score >= 0.4
        else "ALLOW_WITH_MARKERS"
    )
    return SafetyAssessment(
        assessment_id,
        source.tenant_id,
        source.workspace_id,
        source.source_id,
        source.asset_id,
        source.version_id,
        source.owner_id,
        source.normalized_checksum,
        source.classification,
        source.policy_version,
        source.scanner_profile,
        source.scanner_version,
        "UNTRUSTED_EXTERNAL_DATA",
        score,
        decision,
        tuple(findings[:100]),
        now,
    )


def review_assessment(
    assessment: SafetyAssessment,
    reviewer: Reviewer,
    decision: ReviewDecision,
    reason: str,
    now: datetime,
    expected_version: int,
) -> SafetyAssessment:
    if assessment.decision == "BLOCK":
        raise ValueError("CONTENT_SAFETY_BLOCK_TERMINAL")
    if assessment.decision not in {"REVIEW_REQUIRED", "QUARANTINE"}:
        raise ValueError("CONTENT_SAFETY_REVIEW_NOT_REQUIRED")
    if assessment.version != expected_version:
        raise ValueError("CONTENT_SAFETY_VERSION_CONFLICT")
    if reviewer.user_id == assessment.owner_id:
        raise ValueError("CONTENT_SAFETY_SEGREGATION_DENIED")
    if not reviewer.active or reviewer.role not in {"security", "knowledge"}:
        raise ValueError("CONTENT_SAFETY_AUTHORITY_DENIED")
    if LEVEL[reviewer.clearance] < LEVEL[assessment.classification]:
        raise ValueError("CONTENT_SAFETY_CLEARANCE_DENIED")
    clean_reason = " ".join(reason.split())
    if len(clean_reason) < 10 or len(clean_reason) > 1000:
        raise ValueError("CONTENT_SAFETY_REASON_INVALID")
    target: Decision = (
        "ALLOW_WITH_MARKERS"
        if decision == "RELEASE"
        else "QUARANTINE"
        if decision == "KEEP_QUARANTINED"
        else "BLOCK"
    )
    return replace(
        assessment,
        decision=target,
        version=assessment.version + 1,
        reviewed_by=reviewer.user_id,
        reviewed_at=now,
        review_reason_hash=f"sha256:{hashlib.sha256(clean_reason.encode()).hexdigest()}",
    )


def build_untrusted_envelope(assessment: SafetyAssessment, content: bytes) -> bytes:
    if assessment.decision != "ALLOW_WITH_MARKERS":
        raise ValueError("CONTENT_SAFETY_NOT_ELIGIBLE")
    actual = f"sha256:{hashlib.sha256(content).hexdigest()}"
    if actual != assessment.normalized_checksum:
        raise RuntimeError("CONTENT_SAFETY_INTEGRITY_MISMATCH")
    boundary = _identifier(f"{assessment.assessment_id}:{assessment.version}")
    header = (
        f'<domus-untrusted-data boundary="{boundary}" asset="{assessment.asset_id}" '
        f'version="{assessment.version_id}" classification="{assessment.classification}">'
    )
    escaped = html.escape(content.decode("utf-8", errors="replace"), quote=False)
    return f"{header}{escaped}</domus-untrusted-data>".encode()
