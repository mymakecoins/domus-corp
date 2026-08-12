"""FastAPI router for V1-610 meetings processing endpoints."""

from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.services.meetings.consent import ConsentManager
from app.services.meetings.task_extractor import DraftTask, MeetingTaskExtractor
from app.services.meetings.transcription import TranscriptionService, TranscriptResult

router = APIRouter(prefix="/v1/meetings", tags=["meetings"])

consent_manager = ConsentManager()
transcription_service = TranscriptionService()
task_extractor = MeetingTaskExtractor()


class MeetingIngestionRequest(BaseModel):
    """Payload for ingesting and processing meeting audio."""

    meeting_id: str = Field(..., description="UUID of meeting")
    tenant_id: str = Field(..., description="UUID of tenant")
    workspace_id: str = Field(..., description="UUID of workspace")
    owner_id: str = Field(..., description="UUID of owner")
    title: str = Field(..., description="Meeting title")
    audio_object_key: str | None = Field(None, description="MinIO audio object key")
    duration_seconds: int | None = Field(0, description="Meeting duration in seconds")
    consent_granted: bool = Field(
        False, description="Whether participant consent was granted"
    )
    consent_timestamp: str | None = Field(None, description="ISO 8601 consent timestamp")
    retention_days: int | None = Field(30, description="Audio retention period in days")
    participants: list[str] = Field(
        default_factory=list, description="Participant list"
    )


class ExtractTasksRequest(BaseModel):
    """Payload for extracting draft tasks from meeting transcript."""

    meeting_id: str = Field(..., description="UUID of meeting")
    full_text: str = Field(..., description="Full text transcript of meeting")


@router.post("/ingest", response_model=dict[str, Any])
@router.post("/", response_model=dict[str, Any])
async def ingest_meeting(req: MeetingIngestionRequest) -> dict[str, Any]:
    """Ingest meeting metadata, verify consent, generate transcript and extract draft tasks."""
    if not consent_manager.can_process(req):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Consent not granted for meeting processing",
        )

    audio_key = req.audio_object_key or f"audio/{req.meeting_id}.mp3"
    transcript: TranscriptResult = transcription_service.transcribe_audio(
        audio_object_key=audio_key,
        meeting_id=req.meeting_id,
    )

    draft_tasks: list[DraftTask] = task_extractor.extract_tasks(
        meeting_id=req.meeting_id,
        full_text=transcript.full_text,
    )

    return {
        "meeting_id": req.meeting_id,
        "tenant_id": req.tenant_id,
        "workspace_id": req.workspace_id,
        "title": req.title,
        "status": "processed",
        "consent_granted": True,
        "transcript": transcript.model_dump(),
        "draft_tasks": [task.model_dump() for task in draft_tasks],
    }


@router.post("/{meeting_id}/tasks/extract", response_model=list[DraftTask])
async def extract_meeting_tasks(
    meeting_id: str, req: ExtractTasksRequest
) -> list[DraftTask]:
    """Extract draft tasks directly from transcript text."""
    return task_extractor.extract_tasks(meeting_id=meeting_id, full_text=req.full_text)


@router.post("/tasks/{task_id}/approve", response_model=dict[str, str])
async def approve_draft_task(task_id: str) -> dict[str, str]:
    """Approve a draft task for handoff to Action Gateway."""
    return {
        "task_id": task_id,
        "status": "approved",
        "message": f"Task {task_id} approved for Action Gateway handoff.",
    }
