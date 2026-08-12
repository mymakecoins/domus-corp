"""Transcription service adapter (Whisper integration mock/implementation)."""

from pydantic import BaseModel, Field


class TranscriptSegment(BaseModel):
    """Represents a temporalized audio transcript segment."""

    start_time_ms: int = Field(0, description="Start timestamp in milliseconds")
    end_time_ms: int = Field(0, description="End timestamp in milliseconds")
    speaker: str = Field("Speaker 1", description="Identified speaker name or ID")
    text: str = Field(..., description="Transcribed segment text")
    confidence: float = Field(1.0, ge=0.0, le=1.0, description="Confidence score")


class TranscriptResult(BaseModel):
    """Represents the complete transcription result of a meeting."""

    meeting_id: str = Field(..., description="ID of the meeting")
    language: str = Field("pt", description="Language of transcription")
    full_text: str = Field(..., description="Complete aggregated transcript text")
    segments: list[TranscriptSegment] = Field(
        default_factory=list, description="Timestamped segments"
    )


class TranscriptionService:
    """Service to transcribe meeting audio into temporalized transcript segments."""

    def transcribe_audio(
        self, audio_object_key: str, meeting_id: str = "m1", language: str = "pt"
    ) -> TranscriptResult:
        """Transcribe meeting audio specified by MinIO object key.

        Args:
            audio_object_key: MinIO object key pointing to meeting audio.
            meeting_id: Unique meeting identifier.
            language: Target language code (default 'pt').

        Returns:
            TranscriptResult containing full text and segment details.
        """
        segments = [
            TranscriptSegment(
                start_time_ms=0,
                end_time_ms=5000,
                speaker="Speaker 1",
                text="Precisamos atualizar a documentação até sexta-feira.",
                confidence=0.95,
            ),
            TranscriptSegment(
                start_time_ms=5100,
                end_time_ms=9000,
                speaker="Speaker 2",
                text="João fica responsável por essa tarefa.",
                confidence=0.92,
            ),
        ]
        full_text = " ".join(seg.text for seg in segments)

        return TranscriptResult(
            meeting_id=meeting_id,
            language=language,
            full_text=full_text,
            segments=segments,
        )
