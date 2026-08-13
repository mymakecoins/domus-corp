from domus_knowledge.operational_insights import InsightRepository, OperationalInsightsEngine


def test_high_severity_insight_goes_to_draft():
    repo = InsightRepository()
    engine = OperationalInsightsEngine(repository=repo)
    
    signals = [{
        "rule_id": "rule-gap-spike",
        "value": 0.85,
        "title": "Pico de dúvidas sem evidência em Reembolso",
        "description": "85% das pesquisas sobre reembolso não possuem documentos vigentes associados.",
        "severity": "high",
        "confidence": 0.9
    }]
    
    insights = engine.evaluate_signals("tenant-1", "ws-ops", signals)
    assert len(insights) == 1
    assert insights[0].status == "draft"

def test_false_positive_feedback_adjusts_threshold():
    repo = InsightRepository()
    engine = OperationalInsightsEngine(repository=repo)
    
    signals = [{
        "rule_id": "r1",
        "value": 0.6,
        "title": "Alerta Medio",
        "severity": "medium"
    }]
    insights = engine.evaluate_signals("t1", "ws1", signals)
    insight_id = insights[0].id
    
    fb = engine.submit_feedback(insight_id, "user1", "false_positive", "Nao e relevante")
    assert fb.feedback_type == "false_positive"
    
    new_thresh = repo.get_threshold("t1", "r1")
    assert new_thresh is not None
    assert new_thresh.threshold_value > 0.5
