"""Knowledge Gap Detector for V1-506."""

from typing import Any, Optional
from uuid import uuid4
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from domus_knowledge.prompt_sanitizer import PromptSanitizer


class KnowledgeGap(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    tenant_id: str
    workspace_ids: list[str] = Field(default_factory=list)
    topic: str
    sample_queries: list[str] = Field(default_factory=list)
    frequency: int = 1
    impact_score: float = 1.0
    candidate_sources: list[str] = Field(default_factory=list)
    status: str = "open"  # open, in_review, resolved, ignored
    assigned_owner: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class KnowledgeGapDetector:
    def __init__(self, sanitizer: Optional[PromptSanitizer] = None):
        self.sanitizer = sanitizer or PromptSanitizer()
        self._gaps: list[KnowledgeGap] = []

    async def detect_gaps(self, tenant_id: str, retrieval_logs: list[dict[str, Any]], min_frequency: int = 1) -> list[KnowledgeGap]:
        no_evidence_logs = [
            l for l in retrieval_logs
            if l.get("tenant_id") == tenant_id and (l.get("semantic_state") in ("no_evidence", "insufficient") or l.get("confidence", 1.0) < 0.3)
        ]

        clusters: dict[str, list[dict[str, Any]]] = {}
        for log in no_evidence_logs:
            raw_query = log.get("query", "")
            sanitized = self.sanitizer.sanitize(raw_query)
            topic_key = " ".join(sanitized.lower().split()[:4]) or "lacuna sem tema"
            if topic_key not in clusters:
                clusters[topic_key] = []
            clusters[topic_key].append({"ws": log.get("workspace_id", "default"), "query": sanitized})

        detected: list[KnowledgeGap] = []
        for topic, entries in clusters.items():
            if len(entries) >= min_frequency:
                ws_set = list({e["ws"] for e in entries})
                queries = [e["query"] for e in entries]

                existing = [g for g in self._gaps if g.tenant_id == tenant_id and g.topic == topic]
                if existing:
                    gap = existing[0]
                    gap.frequency += len(entries)
                    gap.impact_score += float(len(entries))
                    gap.sample_queries = list(set(gap.sample_queries + queries))
                    gap.updated_at = datetime.now(timezone.utc).isoformat()
                    detected.append(gap)
                else:
                    gap = KnowledgeGap(
                        tenant_id=tenant_id,
                        workspace_ids=ws_set,
                        topic=topic,
                        sample_queries=queries,
                        frequency=len(entries),
                        impact_score=float(len(entries)),
                    )
                    self._gaps.append(gap)
                    detected.append(gap)

        return detected

    async def list_gaps(self, tenant_id: str, status: Optional[str] = None) -> list[KnowledgeGap]:
        results = [g for g in self._gaps if g.tenant_id == tenant_id]
        if status:
            results = [g for g in results if g.status == status]
        return results

    async def update_gap(
        self,
        gap_id: str,
        status: Optional[str] = None,
        assigned_owner: Optional[str] = None,
        candidate_sources: Optional[list[str]] = None
    ) -> KnowledgeGap:
        for gap in self._gaps:
            if gap.id == gap_id:
                if status:
                    gap.status = status
                if assigned_owner:
                    gap.assigned_owner = assigned_owner
                if candidate_sources is not None:
                    gap.candidate_sources = candidate_sources
                gap.updated_at = datetime.now(timezone.utc).isoformat()
                return gap
        raise ValueError(f"Knowledge Gap {gap_id} not found")
