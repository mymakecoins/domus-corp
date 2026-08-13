import pytest

from domus_knowledge.quality_loop import FeedbackRecord, QualityLoopEngine


@pytest.mark.anyio
async def test_submit_feedback_and_suggestion_aggregation():
    engine = QualityLoopEngine()
    fb = FeedbackRecord(
        tenant_id="tenant-1",
        workspace_id="ws-1",
        user_id="user-1",
        target_id="doc-123",
        target_type="evidence",
        feedback_type="outdated",
        rating=1,
        comment="Esta norma foi substituída pela versão 2026."
    )
    saved = await engine.submit_feedback(fb)
    assert saved.id is not None
    assert saved.status == "pending"

    suggestions = await engine.list_suggestions("tenant-1")
    assert len(suggestions) >= 1
    assert suggestions[0].target_id == "doc-123"

@pytest.mark.anyio
async def test_resolve_suggestion_preserves_history():
    engine = QualityLoopEngine()
    fb = FeedbackRecord(
        tenant_id="tenant-1",
        workspace_id="ws-1",
        user_id="user-1",
        target_id="claim-456",
        target_type="claim",
        feedback_type="error",
        rating=-1,
        comment="Valor do teto incorreto."
    )
    await engine.submit_feedback(fb)
    suggestions = await engine.list_suggestions("tenant-1")
    sug_id = suggestions[0].id

    resolved = await engine.resolve_suggestion(
        suggestion_id=sug_id,
        before_state={"value": 100},
        after_state={"value": 150},
        owner="owner@domus.corp"
    )
    assert resolved.status == "resolved"
    assert resolved.before_state == {"value": 100}
    assert resolved.after_state == {"value": 150}
