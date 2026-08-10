import uuid
from datetime import datetime, timezone
from typing import Literal, Optional
from pydantic import BaseModel, Field

SeverityLevel = Literal["low", "medium", "high", "critical"]
InsightStatus = Literal["draft", "under_review", "published", "dismissed"]

class OperationalInsight(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    workspace_id: str
    title: str
    description: str
    rule_id: str
    severity: SeverityLevel
    confidence: float = 1.0
    time_window: str = "7d"
    evidences: list[dict] = Field(default_factory=list)
    recommended_owner: Optional[str] = None
    recommended_action: Optional[str] = None
    status: InsightStatus = "draft"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class InsightThreshold(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    rule_id: str
    version: int = 1
    threshold_value: float
    is_active: bool = True
    updated_by: str = "system"
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class InsightFeedback(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    insight_id: str
    user_id: str
    feedback_type: str  # false_positive, true_positive, inaccurate_severity
    comment: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class InsightRepository:
    def __init__(self):
        self._insights: dict[str, OperationalInsight] = {}
        self._thresholds: dict[tuple[str, str], InsightThreshold] = {}
        self._feedbacks: list[InsightFeedback] = []

    def save_insight(self, insight: OperationalInsight) -> OperationalInsight:
        self._insights[insight.id] = insight
        return insight

    def get_insight(self, insight_id: str) -> Optional[OperationalInsight]:
        return self._insights.get(insight_id)

    def list_insights(self, tenant_id: str, workspace_id: Optional[str] = None) -> list[OperationalInsight]:
        return [
            i for i in self._insights.values()
            if i.tenant_id == tenant_id and (workspace_id is None or i.workspace_id == workspace_id)
        ]

    def set_threshold(self, threshold: InsightThreshold) -> InsightThreshold:
        self._thresholds[(threshold.tenant_id, threshold.rule_id)] = threshold
        return threshold

    def get_threshold(self, tenant_id: str, rule_id: str) -> Optional[InsightThreshold]:
        return self._thresholds.get((tenant_id, rule_id))

    def save_feedback(self, feedback: InsightFeedback) -> InsightFeedback:
        self._feedbacks.append(feedback)
        return feedback

class OperationalInsightsEngine:
    def __init__(self, repository: Optional[InsightRepository] = None):
        self.repo = repository or InsightRepository()

    def evaluate_signals(self, tenant_id: str, workspace_id: str, signals: list[dict]) -> list[OperationalInsight]:
        insights = []
        for sig in signals:
            rule_id = sig["rule_id"]
            val = sig.get("value", 1.0)
            threshold = self.repo.get_threshold(tenant_id, rule_id)
            min_val = threshold.threshold_value if threshold else 0.5

            if val >= min_val:
                sev: SeverityLevel = sig.get("severity", "medium")
                conf = sig.get("confidence", 0.9)
                
                # Regra: alto impacto ou baixa confiança iniciam em draft/under_review
                status: InsightStatus = "draft" if (sev in ["high", "critical"] or conf < 0.75) else "published"

                insight = OperationalInsight(
                    tenant_id=tenant_id,
                    workspace_id=workspace_id,
                    title=sig.get("title", "Insight Operacional"),
                    description=sig.get("description", "Sinal detectado por limiar de monitoramento."),
                    rule_id=rule_id,
                    severity=sev,
                    confidence=conf,
                    time_window=sig.get("time_window", "7d"),
                    evidences=sig.get("evidences", []),
                    recommended_owner=sig.get("recommended_owner", "ops-lead@domus.com"),
                    recommended_action=sig.get("recommended_action", "Revisar normas de compliance e atualizar fontes."),
                    status=status
                )
                self.repo.save_insight(insight)
                insights.append(insight)
        return insights

    def review_insight(self, insight_id: str, status: InsightStatus, reviewer: str) -> Optional[OperationalInsight]:
        insight = self.repo.get_insight(insight_id)
        if not insight:
            return None
        insight.status = status
        return self.repo.save_insight(insight)

    def submit_feedback(self, insight_id: str, user_id: str, feedback_type: str, comment: Optional[str] = None) -> InsightFeedback:
        fb = InsightFeedback(insight_id=insight_id, user_id=user_id, feedback_type=feedback_type, comment=comment)
        self.repo.save_feedback(fb)
        
        # Ajuste adaptativo de limiar em caso de falso positivo
        if feedback_type == "false_positive":
            insight = self.repo.get_insight(insight_id)
            if insight:
                thresh = self.repo.get_threshold(insight.tenant_id, insight.rule_id)
                current_val = thresh.threshold_value if thresh else 0.5
                new_thresh = InsightThreshold(
                    tenant_id=insight.tenant_id,
                    rule_id=insight.rule_id,
                    version=(thresh.version + 1) if thresh else 2,
                    threshold_value=current_val * 1.1,
                    updated_by=user_id
                )
                self.repo.set_threshold(new_thresh)
        return fb
