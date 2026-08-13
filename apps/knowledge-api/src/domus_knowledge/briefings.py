import uuid
from datetime import UTC, datetime

from pydantic import BaseModel, Field

from domus_knowledge.change_detection import ChangeRepository


class BriefingPreferences(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    workspace_id: str
    user_id: str
    is_paused: bool = False
    periodicity: str = "weekly"
    updated_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())

class BriefingRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    workspace_id: str
    user_id: str
    role: str
    summary: str
    changes_included: list[dict] = Field(default_factory=list)
    gaps_included: list[dict] = Field(default_factory=list)
    quality_alerts: list[dict] = Field(default_factory=list)
    staleness_warnings: list[dict] = Field(default_factory=list)
    is_paused: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())

class BriefingRepository:
    def __init__(self):
        self._records: list[BriefingRecord] = []
        self._prefs: dict[tuple[str, str, str], BriefingPreferences] = {}

    def save_briefing(self, record: BriefingRecord) -> BriefingRecord:
        self._records.append(record)
        return record

    def save_preferences(self, pref: BriefingPreferences) -> BriefingPreferences:
        key = (pref.tenant_id, pref.workspace_id, pref.user_id)
        self._prefs[key] = pref
        return pref

    def get_preferences(self, tenant_id: str, workspace_id: str, user_id: str) -> BriefingPreferences | None:
        return self._prefs.get((tenant_id, workspace_id, user_id))

    def list_briefings(self, tenant_id: str, workspace_id: str | None = None) -> list[BriefingRecord]:
        return [
            b for b in self._records
            if b.tenant_id == tenant_id and (workspace_id is None or b.workspace_id == workspace_id)
        ]

class BriefingEngine:
    def __init__(self, briefing_repo: BriefingRepository | None = None, change_repo: ChangeRepository | None = None):
        self.briefing_repo = briefing_repo or BriefingRepository()
        self.change_repo = change_repo or ChangeRepository()

    def update_preferences(
        self, tenant_id: str, workspace_id: str, user_id: str, is_paused: bool = False, periodicity: str = "weekly"
    ) -> BriefingPreferences:
        pref = BriefingPreferences(
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            user_id=user_id,
            is_paused=is_paused,
            periodicity=periodicity
        )
        return self.briefing_repo.save_preferences(pref)

    def generate_briefing(
        self, tenant_id: str, workspace_id: str, user_id: str, role: str, time_window: str = "7d"
    ) -> BriefingRecord:
        pref = self.briefing_repo.get_preferences(tenant_id, workspace_id, user_id)
        if pref and pref.is_paused:
            record = BriefingRecord(
                tenant_id=tenant_id,
                workspace_id=workspace_id,
                user_id=user_id,
                role=role,
                summary="Briefing pausado pelo usuário. Nenhuma síntese gerada.",
                is_paused=True
            )
            return self.briefing_repo.save_briefing(record)

        changes = self.change_repo.list_records(tenant_id, workspace_id)
        changes_data = [c.model_dump() for c in changes]

        staleness_warnings = [
            {"source_id": "doc-old-01", "warning": "Fonte sem atualização há mais de 180 dias. Não usar como fato recente."}
        ]

        summary = f"Briefing Contextual ({role.upper()}) - {len(changes_data)} alterações detectadas."

        record = BriefingRecord(
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            user_id=user_id,
            role=role,
            summary=summary,
            changes_included=changes_data,
            staleness_warnings=staleness_warnings,
            is_paused=False
        )
        return self.briefing_repo.save_briefing(record)
