import uuid
from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, Field

ChangeType = Literal["structural", "normative", "informative", "irrelevant"]
ChangeStatus = Literal["pending", "reviewed", "grouped"]

class ChangeRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    workspace_id: str
    source_id: str
    source_type: str  # document, process, policy, claim
    change_type: ChangeType
    impact_score: float = 0.0
    impacted_domains: list[str] = Field(default_factory=list)
    impacted_owners: list[str] = Field(default_factory=list)
    before_digest: str | None = None
    after_digest: str | None = None
    status: ChangeStatus = "pending"
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())

class ChangeRepository:
    def __init__(self):
        self._records: list[ChangeRecord] = []

    def save(self, record: ChangeRecord) -> ChangeRecord:
        self._records.append(record)
        return record

    def list_records(self, tenant_id: str, workspace_id: str | None = None) -> list[ChangeRecord]:
        return [
            r for r in self._records
            if r.tenant_id == tenant_id and (workspace_id is None or r.workspace_id == workspace_id)
        ]

class ChangeImpactDetector:
    def __init__(self, repository: ChangeRepository | None = None):
        self.repo = repository or ChangeRepository()

    def detect_change(
        self,
        tenant_id: str,
        workspace_id: str,
        source_id: str,
        source_type: str,
        before_content: str,
        after_content: str,
        affected_domains: list[str] | None = None,
        owners: list[str] | None = None
    ) -> ChangeRecord:
        normative_keywords = ["política", "regra", "obrigatório", "proibido", "limite", "norma", "deve"]
        is_normative = any(kw in (before_content + after_content).lower() for kw in normative_keywords)
        
        if before_content == after_content:
            c_type: ChangeType = "irrelevant"
            score = 0.0
        elif is_normative:
            c_type = "normative"
            score = 0.8
        elif abs(len(after_content) - len(before_content)) > 200:
            c_type = "structural"
            score = 0.6
        else:
            c_type = "informative"
            score = 0.3

        record = ChangeRecord(
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            source_id=source_id,
            source_type=source_type,
            change_type=c_type,
            impact_score=score,
            impacted_domains=affected_domains or ["Operações"],
            impacted_owners=owners or ["knowledge-owner@domus.com"],
            before_digest=before_content[:100],
            after_digest=after_content[:100],
            status="pending"
        )
        return self.repo.save(record)

    def group_similar_changes(self, tenant_id: str, workspace_id: str) -> list[ChangeRecord]:
        records = self.repo.list_records(tenant_id, workspace_id)
        grouped = []
        seen = set()
        for r in records:
            key = (r.source_id, r.change_type)
            if key in seen:
                r.status = "grouped"
            else:
                seen.add(key)
                grouped.append(r)
        return grouped
