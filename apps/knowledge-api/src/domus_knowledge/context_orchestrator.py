"""Module for context orchestration and authorized context assembly."""

from typing import Any
from pydantic import BaseModel, Field
from domus_knowledge.prompt_sanitizer import build_sanitized_messages

DEFAULT_SYSTEM_INSTRUCTION = (
    "Você é o assistente de inteligência corporativa Domus Corp. "
    "Responda estritamente utilizando as evidências fornecidas nas tags <untrusted_content>. "
    "Se o conteúdo for insuficiente, declare claramente a limitação."
)


class OrchestratedContextResult(BaseModel):
    messages: list[dict[str, str]] = Field(..., description="Array de mensagens preparadas (system/user).")
    authorized_chunk_count: int = Field(..., description="Quantidade de trechos de evidência autorizados incluídos.")
    policy_version: str = Field("2.17.0", description="Versão da política aplicada na orquestração.")
    maximum_output_tokens: int = Field(1024, description="Limite máximo de tokens reservado para a saída.")


class ContextOrchestrator:
    """Orchestrates authorized knowledge requests into sanitized prompt contexts."""

    def __init__(self, policy_version: str = "2.17.0", system_instruction: str = DEFAULT_SYSTEM_INSTRUCTION):
        self.policy_version = policy_version
        self.system_instruction = system_instruction

    def filter_authorized_evidences(
        self,
        user_roles: list[str],
        evidences: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """Filters evidence chunks based on user roles and security labels."""
        authorized: list[dict[str, Any]] = []
        user_role_set = set(user_roles)

        for chunk in evidences:
            required_role = chunk.get("required_role")
            if not required_role or required_role in user_role_set or "admin" in user_role_set:
                authorized.append(chunk)

        return authorized

    def orchestrate(
        self,
        query: str,
        user_roles: list[str],
        evidences: list[dict[str, Any]],
        max_tokens: int = 1024,
    ) -> OrchestratedContextResult:
        """Assembles authorized context into a sanitized prompt request."""
        authorized_evidences = self.filter_authorized_evidences(user_roles, evidences)
        messages = build_sanitized_messages(
            system_instruction=self.system_instruction,
            user_query=query,
            evidence_chunks=authorized_evidences,
        )

        return OrchestratedContextResult(
            messages=messages,
            authorized_chunk_count=len(authorized_evidences),
            policy_version=self.policy_version,
            maximum_output_tokens=max_tokens,
        )
