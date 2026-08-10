from domus_knowledge.context_orchestrator import ContextOrchestrator


def test_context_orchestrator_filters_unauthorized_chunks():
    orchestrator = ContextOrchestrator(policy_version="2.17.0")
    evidences = [
        {
            "chunk_id": "c1",
            "source_id": "s1",
            "text": "Conteúdo público",
            "required_role": "user",
        },
        {
            "chunk_id": "c2",
            "source_id": "s2",
            "text": "Conteúdo secreto",
            "required_role": "admin",
        },
    ]

    result = orchestrator.orchestrate(
        query="Qual o resumo?",
        user_roles=["user"],
        evidences=evidences,
    )

    assert result.authorized_chunk_count == 1
    assert result.policy_version == "2.17.0"
    assert "Conteúdo público" in result.messages[1]["content"]
    assert "Conteúdo secreto" not in result.messages[1]["content"]


def test_context_orchestrator_enforces_budget_limits():
    orchestrator = ContextOrchestrator()
    result = orchestrator.orchestrate(
        query="Teste budget",
        user_roles=["user"],
        evidences=[],
        max_tokens=4096,
    )
    assert result.maximum_output_tokens == 4096
