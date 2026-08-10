import pytest
from domus_knowledge.knowledge_gaps import KnowledgeGapDetector, KnowledgeGap

@pytest.mark.anyio
async def test_detect_gaps_and_sanitize_queries():
    detector = KnowledgeGapDetector()
    logs = [
        {
            "tenant_id": "tenant-1",
            "workspace_id": "ws-finance",
            "query": "Como declarar o relatório fiscal de 2026 com CPF 123.456.789-00?",
            "semantic_state": "no_evidence",
            "confidence": 0.1
        },
        {
            "tenant_id": "tenant-1",
            "workspace_id": "ws-finance",
            "query": "Como declarar o relatório fiscal de 2026?",
            "semantic_state": "no_evidence",
            "confidence": 0.2
        }
    ]
    gaps = await detector.detect_gaps(tenant_id="tenant-1", retrieval_logs=logs, min_frequency=1)
    assert len(gaps) >= 1
    gap = gaps[0]
    assert gap.frequency == 2
    # Ensure CPF was sanitized from sample_queries
    for q in gap.sample_queries:
        assert "123.456.789-00" not in q

@pytest.mark.anyio
async def test_update_gap_status_and_owner():
    detector = KnowledgeGapDetector()
    logs = [{"tenant_id": "tenant-1", "workspace_id": "ws-1", "query": "Politica de reembolso viagem internacional", "semantic_state": "no_evidence", "confidence": 0.0}]
    await detector.detect_gaps("tenant-1", logs, min_frequency=1)
    gaps = await detector.list_gaps("tenant-1")
    gap_id = gaps[0].id

    updated = await detector.update_gap(gap_id, status="in_review", assigned_owner="owner@domus.corp", candidate_sources=["DOC-RH-009"])
    assert updated.status == "in_review"
    assert updated.assigned_owner == "owner@domus.corp"
    assert "DOC-RH-009" in updated.candidate_sources
