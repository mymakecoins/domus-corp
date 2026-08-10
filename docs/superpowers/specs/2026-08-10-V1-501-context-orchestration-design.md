# Design Specification: V1-501 — Context Orchestrator & TS Model Gateway Client

## Executive Summary

This specification defines the implementation of issue **V1-501** within `apps/knowledge-api`. It establishes the Python Context Orchestration layer, Prompt Sanitization engine, and Fail-Closed TypeScript Model Gateway HTTP Client for Wave 5 (E5: Intelligence Plane).

---

## 1. System Architecture & Module Boundaries

The implementation extends `apps/knowledge-api/src/domus_knowledge` with three new focused modules:

```
apps/knowledge-api/src/domus_knowledge/
├── prompt_sanitizer.py       # Prompt templates & untrusted content sanitization
├── context_orchestrator.py   # Context assembly, ACL metadata enforcement, budget limits
├── model_gateway_client.py   # Fail-closed HTTP client for Control-Plane TS Model Gateway
└── main.py                   # FastAPI routing for intelligence endpoints
```

### Inviolable Architectural Constraints
1. **No External Provider Egress**: The Python runtime must NEVER hold direct LLM provider credentials (OpenAI, Anthropic, Gemini, etc.) and must NEVER make direct outbound HTTP requests to external AI providers.
2. **Mandatory Routing via TS Model Gateway**: All model inferences must route strictly through Control-Plane (`http://control-plane...` or configured `CONTROL_PLANE_URL`).
3. **Fail-Closed Guarantee**: If Control-Plane is unreachable, times out, or returns a policy/budget rejection, the client fails immediately with `ModelGatewayError` without falling back to external providers.
4. **Prompt Injection Boundary**: All retrieved evidence chunks must be sanitized and enclosed within explicit `<untrusted_content>` tags, escaping any nested closing tags.

---

## 2. Component Design

### 2.1 Prompt Sanitizer (`prompt_sanitizer.py`)
- **Sanitizes Content**: Replaces any closing `</untrusted_content>` or malicious XML/tag injection sequences inside retrieved text.
- **Encloses Evidence**: Wraps each evidence chunk in:
  ```xml
  <untrusted_content source_id="{source_id}" version_id="{version_id}" chunk_id="{chunk_id}" owner="{owner}">
  {sanitized_text}
  </untrusted_content>
  ```
- **Builds Messages**: Assembles system instructions (non-overridable rules) and user prompt containing the enclosed evidence chunks.

### 2.2 Context Orchestrator (`context_orchestrator.py`)
- **Input**: User query/intent, tenant/user context, and retrieved evidence items (`RetrievalPage` / `Citation`).
- **Processing**:
  - Filters out any un-authorized items.
  - Formats provenance metadata per chunk.
  - Evaluates token budget limits and policy versioning.
- **Output**: `OrchestratedContextResult` containing structured system/user prompt messages and token allocation estimates.

### 2.3 Fail-Closed Model Gateway Client (`model_gateway_client.py`)
- **Transport**: `httpx.AsyncClient` communicating with `/v1/model/responses` (unary) and `/v1/model/responses/stream` (SSE).
- **Request Schema** (v2.17.0 alignment):
  ```json
  {
    "schema_version": "1.0.0",
    "idempotency_key": "<uuid>",
    "task": "chat",
    "messages": [ ... ],
    "required_capabilities": ["CHAT", "STREAMING"],
    "maximum_output_tokens": 1024
  }
  ```
- **Error Handling**: Raises `ModelGatewayError` on connection failure, non-200 responses, or SSE format violations.

### 2.4 API Routes (`main.py`)
- `POST /v1/intelligence/orchestrate`: Orchestrates context and invokes unary Model Gateway response.
- `POST /v1/intelligence/orchestrate/stream`: Orchestrates context and streams SSE response.

---

## 3. Test Strategy & Double Verification

1. **Unit Tests**:
   - `test_prompt_sanitizer.py`: Tests tag escaping, XML injection defenses, and message assembly.
   - `test_context_orchestrator.py`: Tests ACL filtering enforcement and provenance metadata binding.
   - `test_model_gateway_client.py`: Tests contract serialization, SSE stream parsing, and fail-closed exception raising on server errors.
2. **Integration Tests**:
   - `test_intelligence_endpoints.py`: End-to-end FastAPI endpoint tests using `httpx.MockTransport` (zero external network traffic).

---

## 4. Spec Self-Review
- **Placeholders**: None.
- **Internal Consistency**: Aligns 100% with ADR-001, JSON Schema v2.17.0, and Wave 5 readiness requirements.
- **Scope Check**: Single implementation plan focused purely on V1-501.
- **Ambiguity Check**: Fail-closed rules, payload schemas, and module locations are explicitly defined.
