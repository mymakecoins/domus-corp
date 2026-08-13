from app.services.meetings.consent import ConsentManager
from app.services.meetings.task_extractor import MeetingTaskExtractor
from app.services.meetings.transcription import TranscriptionService, TranscriptSegment
from fastapi.testclient import TestClient

from domus_knowledge.main import app


def test_consent_manager_blocks_unconsented_meeting() -> None:
    consent_mgr = ConsentManager()
    assert consent_mgr.can_process({"consent_granted": False}) is False
    assert consent_mgr.can_process({"consent_granted": True}) is True


def test_transcription_adapter_generates_segments() -> None:
    svc = TranscriptionService()
    transcript = svc.transcribe_audio("dummy_key")
    assert len(transcript.segments) > 0
    assert isinstance(transcript.segments[0], TranscriptSegment)


def test_task_extractor_parses_draft_tasks() -> None:
    extractor = MeetingTaskExtractor()
    draft_tasks = extractor.extract_tasks(
        meeting_id="m1",
        full_text=(
            "Precisamos atualizar a documentação até sexta-feira. João fica responsável por essa"
            " tarefa."
        ),
    )
    assert len(draft_tasks) > 0
    assert draft_tasks[0].title != ""
    assert draft_tasks[0].confidence_score > 0.0


def test_meeting_router_blocks_unconsented_ingestion() -> None:
    client = TestClient(app)
    response = client.post(
        "/v1/meetings/ingest",
        json={
            "meeting_id": "00000000-0000-0000-0000-000000000001",
            "tenant_id": "00000000-0000-0000-0000-000000000002",
            "workspace_id": "00000000-0000-0000-0000-000000000003",
            "owner_id": "00000000-0000-0000-0000-000000000004",
            "title": "Sprint Planning",
            "consent_granted": False,
        },
    )
    assert response.status_code == 400
    assert "Consent not granted" in response.json()["detail"]


def test_meeting_router_processes_consented_meeting() -> None:
    client = TestClient(app)
    response = client.post(
        "/v1/meetings/ingest",
        json={
            "meeting_id": "00000000-0000-0000-0000-000000000001",
            "tenant_id": "00000000-0000-0000-0000-000000000002",
            "workspace_id": "00000000-0000-0000-0000-000000000003",
            "owner_id": "00000000-0000-0000-0000-000000000004",
            "title": "Sprint Planning",
            "consent_granted": True,
            "audio_object_key": "audio/meeting1.mp3",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "processed"
    assert "transcript" in data
    assert "draft_tasks" in data
    assert len(data["draft_tasks"]) > 0


def test_meeting_router_approves_draft_task() -> None:
    client = TestClient(app)
    response = client.post(
        "/v1/meetings/tasks/00000000-0000-0000-0000-000000000010/approve",
    )
    assert response.status_code == 200
    assert response.json()["status"] == "approved"
