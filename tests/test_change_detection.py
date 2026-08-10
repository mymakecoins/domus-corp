import pytest
from domus_knowledge.change_detection import ChangeImpactDetector, ChangeRepository, ChangeRecord

def test_detect_normative_change():
    repo = ChangeRepository()
    detector = ChangeImpactDetector(repository=repo)
    
    before = "Política de reembolso: limite R$ 100 sem nota."
    after = "Política de reembolso: limite R$ 200 obriga nota fiscal para tudo."
    
    change = detector.detect_change(
        tenant_id="tenant-1",
        workspace_id="ws-finance",
        source_id="policy-refund-01",
        source_type="policy",
        before_content=before,
        after_content=after,
        affected_domains=["Financeiro", "Compliance"],
        owners=["owner-compliance@domus.com"]
    )
    
    assert change.change_type == "normative"
    assert change.impact_score > 0.5
    assert "Financeiro" in change.impacted_domains
    assert change.status == "pending"

def test_group_similar_changes():
    repo = ChangeRepository()
    detector = ChangeImpactDetector(repository=repo)
    
    detector.detect_change("t1", "ws1", "doc1", "document", "before", "after longo " + "x"*300)
    detector.detect_change("t1", "ws1", "doc1", "document", "before", "after longo " + "x"*400)
    
    grouped = detector.group_similar_changes("t1", "ws1")
    assert len(grouped) == 1
    assert repo.list_records("t1", "ws1")[1].status == "grouped"
