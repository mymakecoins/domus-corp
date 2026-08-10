import pytest
from domus_knowledge.briefings import BriefingEngine, BriefingRepository
from domus_knowledge.change_detection import ChangeRepository, ChangeImpactDetector

def test_generate_briefing_honors_paused_state():
    b_repo = BriefingRepository()
    c_repo = ChangeRepository()
    
    engine = BriefingEngine(briefing_repo=b_repo, change_repo=c_repo)
    
    engine.update_preferences("t1", "ws1", "u1", is_paused=True)
    
    briefing = engine.generate_briefing("t1", "ws1", "u1", role="gestor")
    assert briefing.is_paused is True
    assert "Briefing pausado pelo usuário" in briefing.summary

def test_generate_active_briefing_includes_changes_and_warnings():
    b_repo = BriefingRepository()
    c_repo = ChangeRepository()
    c_detector = ChangeImpactDetector(c_repo)
    
    c_detector.detect_change("t1", "ws1", "p1", "policy", "regra antiga", "regra nova com norma obrigatória")
    
    engine = BriefingEngine(briefing_repo=b_repo, change_repo=c_repo)
    briefing = engine.generate_briefing("t1", "ws1", "u1", role="diretoria")
    
    assert briefing.is_paused is False
    assert len(briefing.changes_included) == 1
    assert len(briefing.staleness_warnings) >= 1
    assert "DIRETORIA" in briefing.summary
