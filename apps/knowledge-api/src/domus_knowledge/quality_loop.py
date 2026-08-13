"""Quality Loop Engine for V1-505 feedback and revision workflow."""

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field


class FeedbackRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    tenant_id: str
    workspace_id: str
    user_id: str
    target_id: str
    target_type: str  # response, evidence, claim, process, policy
    feedback_type: str  # error, missing_source, outdated, low_utility, policy_issue
    rating: int | None = None
    comment: str | None = None
    evidence_version: str | None = None
    status: str = "pending"  # pending, under_review, resolved, dismissed
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())


class QualityLoopSuggestion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    tenant_id: str
    target_type: str
    target_id: str
    suggested_action: str
    recommended_owner: str = "Knowledge Owner"
    frequency_count: int = 1
    impact_score: float = 1.0
    status: str = "open"  # open, in_review, resolved, dismissed
    before_state: dict[str, Any] | None = None
    after_state: dict[str, Any] | None = None
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())


class QualityLoopEngine:
    def __init__(self):
        self._feedbacks: list[FeedbackRecord] = []
        self._suggestions: list[QualityLoopSuggestion] = []

    async def submit_feedback(self, feedback: FeedbackRecord) -> FeedbackRecord:
        self._feedbacks.append(feedback)
        await self._aggregate_feedback(feedback)
        return feedback

    async def _aggregate_feedback(self, feedback: FeedbackRecord) -> None:
        matching = [s for s in self._suggestions if s.tenant_id == feedback.tenant_id and s.target_id == feedback.target_id]
        if matching:
            sug = matching[0]
            sug.frequency_count += 1
            sug.impact_score += 1.0
            sug.updated_at = datetime.now(UTC).isoformat()
        else:
            sug = QualityLoopSuggestion(
                tenant_id=feedback.tenant_id,
                target_type=feedback.target_type,
                target_id=feedback.target_id,
                suggested_action=f"Revisar {feedback.target_type} ({feedback.feedback_type}): {feedback.comment or 'Sem comentário'}",
                recommended_owner="Knowledge Owner",
                frequency_count=1,
                impact_score=1.0,
            )
            self._suggestions.append(sug)

    async def list_feedbacks(self, tenant_id: str, workspace_id: str | None = None, status: str | None = None) -> list[FeedbackRecord]:
        results = [f for f in self._feedbacks if f.tenant_id == tenant_id]
        if workspace_id:
            results = [f for f in results if f.workspace_id == workspace_id]
        if status:
            results = [f for f in results if f.status == status]
        return results

    async def list_suggestions(self, tenant_id: str, status: str | None = None) -> list[QualityLoopSuggestion]:
        results = [s for s in self._suggestions if s.tenant_id == tenant_id]
        if status:
            results = [s for s in results if s.status == status]
        return results

    async def resolve_suggestion(
        self,
        suggestion_id: str,
        before_state: dict[str, Any],
        after_state: dict[str, Any],
        owner: str = "Knowledge Owner"
    ) -> QualityLoopSuggestion:
        for sug in self._suggestions:
            if sug.id == suggestion_id:
                sug.status = "resolved"
                sug.before_state = before_state
                sug.after_state = after_state
                sug.recommended_owner = owner
                sug.updated_at = datetime.now(UTC).isoformat()
                return sug
        raise ValueError(f"Suggestion {suggestion_id} not found")
