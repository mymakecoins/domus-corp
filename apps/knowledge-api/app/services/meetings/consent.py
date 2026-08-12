"""Meeting consent management service."""

from typing import Any

from pydantic import BaseModel


class ConsentManager:
    """Manages consent verification for meeting ingestion and processing."""

    def can_process(self, meeting_data: dict[str, Any] | BaseModel) -> bool:
        """Check whether consent has been granted for meeting processing.

        Args:
            meeting_data: Dictionary or Pydantic model containing meeting metadata.

        Returns:
            True if consent_granted is True, False otherwise.
        """
        if isinstance(meeting_data, BaseModel):
            return getattr(meeting_data, "consent_granted", False) is True
        elif isinstance(meeting_data, dict):
            return meeting_data.get("consent_granted") is True
        return False
