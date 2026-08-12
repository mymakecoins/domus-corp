"""Meeting draft task extractor service."""

import re
import uuid
from typing import Any
from pydantic import BaseModel, Field


class DraftTask(BaseModel):
    """Represents a draft task extracted from a meeting transcript."""

    task_id: str = Field(
        default_factory=lambda: str(uuid.uuid4()), description="Unique task identifier"
    )
    meeting_id: str = Field(..., description="ID of the meeting source")
    title: str = Field(..., description="Task title")
    description: str | None = Field("", description="Detailed task description")
    suggested_assignee: str | None = Field(
        None, description="Suggested assignee email or name"
    )
    due_date: str | None = Field(None, description="Suggested due date (YYYY-MM-DD)")
    confidence_score: float = Field(
        ..., ge=0.0, le=1.0, description="Extraction confidence score"
    )
    provenance_quote: str = Field(
        ..., description="Verbatim transcript quote establishing provenance"
    )
    provenance_timestamp_ms: int = Field(
        0, description="Timestamp in milliseconds where task was spoken"
    )
    status: str = Field(
        "proposed", description="Draft task status (proposed, approved, rejected, converted)"
    )
    external_task_id: str | None = Field(
        None, description="ID of created external task if converted"
    )


class MeetingTaskExtractor:
    """Extracts draft tasks and action items from meeting transcript text."""

    def extract_tasks(
        self, meeting_id: str, full_text: str, segments: list[Any] | None = None
    ) -> list[DraftTask]:
        """Extract draft tasks from transcript text.

        Args:
            meeting_id: ID of the meeting.
            full_text: Complete transcript text.
            segments: Optional list of timestamped transcript segments.

        Returns:
            List of extracted DraftTask objects.
        """
        tasks: list[DraftTask] = []
        sentences = [s.strip() for s in re.split(r"[.!?]", full_text) if s.strip()]
        keywords = ["precisamos", "tarefa", "responsável", "atualizar", "fazer", "deve"]

        for sentence in sentences:
            sentence_lower = sentence.lower()
            if any(kw in sentence_lower for kw in keywords):
                title = sentence
                if "precisamos" in sentence_lower:
                    match = re.search(
                        r"precisamos\s+(.*?)(?:\s+até|\s+por|$)", sentence, re.IGNORECASE
                    )
                    if match:
                        title = match.group(1).capitalize()
                elif "responsável" in sentence_lower:
                    title = sentence

                assignee = None
                name_match = re.search(r"([A-Z][a-z]+)\s+fica\s+responsável", sentence)
                if name_match:
                    assignee = name_match.group(1)

                tasks.append(
                    DraftTask(
                        meeting_id=meeting_id,
                        title=title,
                        description=f"Item de ação extraído da reunião: {sentence}",
                        suggested_assignee=assignee,
                        confidence_score=0.88,
                        provenance_quote=sentence,
                        provenance_timestamp_ms=0,
                        status="proposed",
                    )
                )

        if not tasks and full_text.strip():
            tasks.append(
                DraftTask(
                    meeting_id=meeting_id,
                    title=full_text[:50],
                    description=full_text,
                    confidence_score=0.70,
                    provenance_quote=full_text,
                    provenance_timestamp_ms=0,
                    status="proposed",
                )
            )

        return tasks
