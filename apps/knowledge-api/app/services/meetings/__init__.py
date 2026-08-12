"""Meetings services package."""

from app.services.meetings.consent import ConsentManager
from app.services.meetings.task_extractor import DraftTask, MeetingTaskExtractor
from app.services.meetings.transcription import (
    TranscriptionService,
    TranscriptResult,
    TranscriptSegment,
)

__all__ = [
    "ConsentManager",
    "TranscriptionService",
    "TranscriptSegment",
    "TranscriptResult",
    "MeetingTaskExtractor",
    "DraftTask",
]
