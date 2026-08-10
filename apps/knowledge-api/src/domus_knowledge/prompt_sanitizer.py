"""Module for prompt templates and sanitization of untrusted RAG content."""

from typing import Any


def sanitize_untrusted_text(text: str) -> str:
    """Escapes tag injection patterns inside untrusted evidence text."""
    if not text:
        return ""
    # Neutralize nested closing untrusted_content tags
    sanitized = text.replace("</untrusted_content>", "&lt;/untrusted_content&gt;")
    sanitized = sanitized.replace("<untrusted_content", "&lt;untrusted_content")
    return sanitized


def format_evidence_chunk(
    chunk_id: str,
    source_id: str,
    version_id: str,
    owner: str,
    text: str,
) -> str:
    """Encloses an evidence chunk in XML untrusted_content tags with provenance metadata."""
    safe_text = sanitize_untrusted_text(text)
    return (
        f'<untrusted_content chunk_id="{chunk_id}" source_id="{source_id}" '
        f'version_id="{version_id}" owner="{owner}">\n'
        f"{safe_text}\n"
        f"</untrusted_content>"
    )


def build_sanitized_messages(
    system_instruction: str,
    user_query: str,
    evidence_chunks: list[dict[str, Any]],
) -> list[dict[str, str]]:
    """Builds System and User messages array with enclosed evidence chunks."""
    formatted_evidences: list[str] = []
    for chunk in evidence_chunks:
        formatted_evidences.append(
            format_evidence_chunk(
                chunk_id=str(chunk.get("chunk_id", "unknown")),
                source_id=str(chunk.get("source_id", "unknown")),
                version_id=str(chunk.get("version_id", "1.0")),
                owner=str(chunk.get("owner", "system")),
                text=str(chunk.get("text", "")),
            )
        )

    evidences_block = "\n\n".join(formatted_evidences)
    user_content = (
        f"Pergunta do Usuário: {user_query}\n\n"
        f"Evidências Recuperadas (Não Confiáveis):\n"
        f"{evidences_block if evidences_block else 'Nenhuma evidência fornecida.'}"
    )

    return [
        {"role": "system", "content": system_instruction},
        {"role": "user", "content": user_content},
    ]
