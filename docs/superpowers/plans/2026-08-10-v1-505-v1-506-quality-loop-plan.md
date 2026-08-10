# V1-505 + V1-506 — Feedback, Quality Loop & Knowledge Gaps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement response feedback, Quality Loop revision workflow (V1-505), and automated Knowledge Gaps detection (V1-506) with PostgreSQL persistence, JSON contracts, Python engines, and FastAPI REST endpoints.

**Architecture:** Create migration `000022_v1_505_v1_506_quality_loop.up.sql` for PostgreSQL persistence of `feedback_records`, `quality_loop_suggestions`, and `knowledge_gaps`. Implement `QualityLoopEngine` and `KnowledgeGapDetector` in `apps/knowledge-api/src/domus_knowledge/` with RLS/tenant filtering, prompt PII sanitization, non-destructive version tracking, and expose full REST APIs in FastAPI.

**Tech Stack:** Python 3.12, FastAPI, Pydantic v2, PostgreSQL (SQL/psycopg/asyncpg or SQLite in-memory double for unit tests), JSON Schema v1, pytest.

## Global Constraints

- Fail-closed security and mandatory tenant isolation (`tenant_id` and `workspace_ids`).
- Non-destructive history: Quality Loop suggestions save `before_state` and `after_state` without overwriting originals.
- Privacy guardrail: Knowledge Gaps use `PromptSanitizer` to redact sensitive terms from query samples before storing.
- Code style & typing: Strict type annotations in Python and Pydantic v2 schemas.

---

### Task 1: PostgreSQL Database Migration (`000022_v1_505_v1_506_quality_loop`)

**Files:**
- Create: `migrations/000022_v1_505_v1_506_quality_loop.up.sql`
- Create: `migrations/000022_v1_505_v1_506_quality_loop.down.sql`
- Modify: `migrations/manifest.json`
- Test: `tests/migrations/test_v1_505_v1_506_quality_loop.py`

**Interfaces:**
- Consumes: PostgreSQL schema base
- Produces: Tables `feedback_records`, `quality_loop_suggestions`, `knowledge_gaps`

- [ ] **Step 1: Write failing migration test**

```python
# tests/migrations/test_v1_505_v1_506_quality_loop.py
from pathlib import Path

def test_migration_files_exist():
    up_sql = Path("migrations/000022_v1_505_v1_506_quality_loop.up.sql")
    down_sql = Path("migrations/000022_v1_505_v1_506_quality_loop.down.sql")
    assert up_sql.exists()
    assert down_sql.exists()
    assert "feedback_records" in up_sql.read_text()
    assert "quality_loop_suggestions" in up_sql.read_text()
    assert "knowledge_gaps" in up_sql.read_text()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/migrations/test_v1_505_v1_506_quality_loop.py`
Expected: FAIL (File not found)

- [ ] **Step 3: Create migration files and update manifest**

`migrations/000022_v1_505_v1_506_quality_loop.up.sql`:
```sql
CREATE TABLE IF NOT EXISTS feedback_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL,
    workspace_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    target_id VARCHAR(128) NOT NULL,
    target_type VARCHAR(32) NOT NULL,
    feedback_type VARCHAR(32) NOT NULL,
    rating INT CHECK (rating BETWEEN -1 AND 5),
    comment TEXT,
    evidence_version VARCHAR(64),
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quality_loop_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL,
    target_type VARCHAR(32) NOT NULL,
    target_id VARCHAR(128) NOT NULL,
    suggested_action TEXT NOT NULL,
    recommended_owner VARCHAR(128) NOT NULL,
    frequency_count INT NOT NULL DEFAULT 1,
    impact_score FLOAT NOT NULL DEFAULT 0.0,
    status VARCHAR(32) NOT NULL DEFAULT 'open',
    before_state JSONB,
    after_state JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_gaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL,
    workspace_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    topic VARCHAR(255) NOT NULL,
    sample_queries JSONB NOT NULL DEFAULT '[]'::jsonb,
    frequency INT NOT NULL DEFAULT 1,
    impact_score FLOAT NOT NULL DEFAULT 0.0,
    candidate_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(32) NOT NULL DEFAULT 'open',
    assigned_owner VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_tenant_ws ON feedback_records(tenant_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_quality_loop_tenant_status ON quality_loop_suggestions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_tenant_status ON knowledge_gaps(tenant_id, status);
```

`migrations/000022_v1_505_v1_506_quality_loop.down.sql`:
```sql
DROP TABLE IF EXISTS knowledge_gaps;
DROP TABLE IF EXISTS quality_loop_suggestions;
DROP TABLE IF EXISTS feedback_records;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/migrations/test_v1_505_v1_506_quality_loop.py`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add migrations/000022_v1_505_v1_506_quality_loop.* tests/migrations/test_v1_505_v1_506_quality_loop.py
git commit -m "feat(db): add migration 000022 for V1-505 and V1-506 quality loop and knowledge gaps"
```

---

### Task 2: JSON Schema Contracts (`feedback-record`, `quality-loop-suggestion`, `knowledge-gap`)

**Files:**
- Create: `contracts/json-schema/v1/feedback-record.schema.json`
- Create: `contracts/json-schema/v1/quality-loop-suggestion.schema.json`
- Create: `contracts/json-schema/v1/knowledge-gap.schema.json`
- Test: `tests/contracts/validate_contracts.py`

**Interfaces:**
- Consumes: `contracts/json-schema/v1/common.schema.json`
- Produces: Contract schemas for V1-505 and V1-506

- [ ] **Step 1: Write failing contract validation test entry**

Verify `tests/contracts/validate_contracts.py` includes validation for new schema files.

- [ ] **Step 2: Create JSON schema contract files**

`contracts/json-schema/v1/feedback-record.schema.json`:
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "FeedbackRecord",
  "type": "object",
  "required": ["tenant_id", "workspace_id", "user_id", "target_id", "target_type", "feedback_type"],
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "tenant_id": { "type": "string" },
    "workspace_id": { "type": "string" },
    "user_id": { "type": "string" },
    "target_id": { "type": "string" },
    "target_type": { "type": "string", "enum": ["response", "evidence", "claim", "process", "policy"] },
    "feedback_type": { "type": "string", "enum": ["error", "missing_source", "outdated", "low_utility", "policy_issue"] },
    "rating": { "type": "integer" },
    "comment": { "type": "string" },
    "evidence_version": { "type": "string" },
    "status": { "type": "string", "enum": ["pending", "under_review", "resolved", "dismissed"] },
    "created_at": { "type": "string", "format": "date-time" }
  }
}
```

`contracts/json-schema/v1/quality-loop-suggestion.schema.json`:
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "QualityLoopSuggestion",
  "type": "object",
  "required": ["tenant_id", "target_type", "target_id", "suggested_action", "recommended_owner"],
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "tenant_id": { "type": "string" },
    "target_type": { "type": "string" },
    "target_id": { "type": "string" },
    "suggested_action": { "type": "string" },
    "recommended_owner": { "type": "string" },
    "frequency_count": { "type": "integer" },
    "impact_score": { "type": "number" },
    "status": { "type": "string", "enum": ["open", "in_review", "resolved", "dismissed"] },
    "before_state": { "type": "object" },
    "after_state": { "type": "object" },
    "created_at": { "type": "string", "format": "date-time" },
    "updated_at": { "type": "string", "format": "date-time" }
  }
}
```

`contracts/json-schema/v1/knowledge-gap.schema.json`:
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "KnowledgeGap",
  "type": "object",
  "required": ["tenant_id", "workspace_ids", "topic", "sample_queries"],
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "tenant_id": { "type": "string" },
    "workspace_ids": { "type": "array", "items": { "type": "string" } },
    "topic": { "type": "string" },
    "sample_queries": { "type": "array", "items": { "type": "string" } },
    "frequency": { "type": "integer" },
    "impact_score": { "type": "number" },
    "candidate_sources": { "type": "array", "items": { "type": "string" } },
    "status": { "type": "string", "enum": ["open", "in_review", "resolved", "ignored"] },
    "assigned_owner": { "type": "string" },
    "created_at": { "type": "string", "format": "date-time" },
    "updated_at": { "type": "string", "format": "date-time" }
  }
}
```

- [ ] **Step 3: Run contract validator**

Run: `uv run python tests/contracts/validate_contracts.py`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add contracts/json-schema/v1/feedback-record.schema.json contracts/json-schema/v1/quality-loop-suggestion.schema.json contracts/json-schema/v1/knowledge-gap.schema.json
git commit -m "feat(contracts): add schemas for V1-505 and V1-506 quality loop and knowledge gaps"
```

---

### Task 3: Quality Loop Engine (`domus_knowledge.quality_loop`)

**Files:**
- Create: `apps/knowledge-api/src/domus_knowledge/quality_loop.py`
- Create: `apps/knowledge-api/tests/test_quality_loop.py`

**Interfaces:**
- Consumes: Pydantic v2 BaseModel
- Produces: `QualityLoopEngine`, `FeedbackRecord`, `QualityLoopSuggestion`, `FeedbackRepository`

- [ ] **Step 1: Write failing unit tests**

`apps/knowledge-api/tests/test_quality_loop.py`:
```python
import pytest
from domus_knowledge.quality_loop import QualityLoopEngine, FeedbackRecord, QualityLoopSuggestion

@pytest.mark.asyncio
async def test_submit_feedback_and_suggestion_aggregation():
    engine = QualityLoopEngine()
    fb = FeedbackRecord(
        tenant_id="tenant-1",
        workspace_id="ws-1",
        user_id="user-1",
        target_id="doc-123",
        target_type="evidence",
        feedback_type="outdated",
        rating=1,
        comment="Esta norma foi substituída pela versão 2026."
    )
    saved = await engine.submit_feedback(fb)
    assert saved.id is not None
    assert saved.status == "pending"

    suggestions = await engine.list_suggestions("tenant-1")
    assert len(suggestions) >= 1
    assert suggestions[0].target_id == "doc-123"

@pytest.mark.asyncio
async def test_resolve_suggestion_preserves_history():
    engine = QualityLoopEngine()
    fb = FeedbackRecord(
        tenant_id="tenant-1",
        workspace_id="ws-1",
        user_id="user-1",
        target_id="claim-456",
        target_type="claim",
        feedback_type="error",
        rating=-1,
        comment="Valor do teto incorreto."
    )
    await engine.submit_feedback(fb)
    suggestions = await engine.list_suggestions("tenant-1")
    sug_id = suggestions[0].id

    resolved = await engine.resolve_suggestion(
        suggestion_id=sug_id,
        before_state={"value": 100},
        after_state={"value": 150},
        owner="owner@domus.corp"
    )
    assert resolved.status == "resolved"
    assert resolved.before_state == {"value": 100}
    assert resolved.after_state == {"value": 150}
```

- [ ] **Step 2: Run test to verify failure**

Run: `uv run pytest apps/knowledge-api/tests/test_quality_loop.py`
Expected: FAIL (Module not found)

- [ ] **Step 3: Implement `QualityLoopEngine`**

`apps/knowledge-api/src/domus_knowledge/quality_loop.py`:
```python
"""Quality Loop Engine for V1-505 feedback and revision workflow."""

from typing import Any, Optional, List
from uuid import uuid4
from datetime import datetime, timezone
from pydantic import BaseModel, Field


class FeedbackRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    tenant_id: str
    workspace_id: str
    user_id: str
    target_id: str
    target_type: str  # response, evidence, claim, process, policy
    feedback_type: str  # error, missing_source, outdated, low_utility, policy_issue
    rating: Optional[int] = None
    comment: Optional[str] = None
    evidence_version: Optional[str] = None
    status: str = "pending"  # pending, under_review, resolved, dismissed
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class QualityLoopSuggestion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    tenant_id: str
    target_type: str
    target_id: str
    suggested_action: str
    recommended_owner: str = "Knowledge Owner"
    frequency_count: int = 1
    impact_score: float = 1.0
    status: str = "open"  # open, in_review, resolved, dismissed
    before_state: Optional[dict[str, Any]] = None
    after_state: Optional[dict[str, Any]] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class QualityLoopEngine:
    def __init__(self):
        self._feedbacks: list[FeedbackRecord] = []
        self._suggestions: list[QualityLoopSuggestion] = []

    async def submit_feedback(self, feedback: FeedbackRecord) -> FeedbackRecord:
        self._feedbacks.append(feedback)
        await self._aggregate_feedback(feedback)
        return feedback

    async def _aggregate_feedback(self, feedback: FeedbackRecord) -> None:
        matching = [s for s in self._suggestions if s.tenant_id == feedback.tenant_id and s.target_id == feedback.target_id]
        if matching:
            sug = matching[0]
            sug.frequency_count += 1
            sug.impact_score += 1.0
            sug.updated_at = datetime.now(timezone.utc).isoformat()
        else:
            sug = QualityLoopSuggestion(
                tenant_id=feedback.tenant_id,
                target_type=feedback.target_type,
                target_id=feedback.target_id,
                suggested_action=f"Revisar {feedback.target_type} ({feedback.feedback_type}): {feedback.comment or 'Sem comentário'}",
                recommended_owner="Knowledge Owner",
                frequency_count=1,
                impact_score=1.0,
            )
            self._suggestions.append(sug)

    async def list_feedbacks(self, tenant_id: str, workspace_id: Optional[str] = None, status: Optional[str] = None) -> list[FeedbackRecord]:
        results = [f for f in self._feedbacks if f.tenant_id == tenant_id]
        if workspace_id:
            results = [f for f in results if f.workspace_id == workspace_id]
        if status:
            results = [f for f in results if f.status == status]
        return results

    async def list_suggestions(self, tenant_id: str, status: Optional[str] = None) -> list[QualityLoopSuggestion]:
        results = [s for s in self._suggestions if s.tenant_id == tenant_id]
        if status:
            results = [s for s in results if s.status == status]
        return results

    async def resolve_suggestion(
        self,
        suggestion_id: str,
        before_state: dict[str, Any],
        after_state: dict[str, Any],
        owner: str = "Knowledge Owner"
    ) -> QualityLoopSuggestion:
        for sug in self._suggestions:
            if sug.id == suggestion_id:
                sug.status = "resolved"
                sug.before_state = before_state
                sug.after_state = after_state
                sug.recommended_owner = owner
                sug.updated_at = datetime.now(timezone.utc).isoformat()
                return sug
        raise ValueError(f"Suggestion {suggestion_id} not found")
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest apps/knowledge-api/tests/test_quality_loop.py`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/knowledge-api/src/domus_knowledge/quality_loop.py apps/knowledge-api/tests/test_quality_loop.py
git commit -m "feat(knowledge-api): implement QualityLoopEngine for V1-505"
```

---

### Task 4: Knowledge Gap Detector Engine (`domus_knowledge.knowledge_gaps`)

**Files:**
- Create: `apps/knowledge-api/src/domus_knowledge/knowledge_gaps.py`
- Create: `apps/knowledge-api/tests/test_knowledge_gaps.py`

**Interfaces:**
- Consumes: `domus_knowledge.prompt_sanitizer.PromptSanitizer`
- Produces: `KnowledgeGapDetector`, `KnowledgeGap`

- [ ] **Step 1: Write failing unit tests**

`apps/knowledge-api/tests/test_knowledge_gaps.py`:
```python
import pytest
from domus_knowledge.knowledge_gaps import KnowledgeGapDetector, KnowledgeGap

@pytest.mark.asyncio
async def test_detect_gaps_and_sanitize_queries():
    detector = KnowledgeGapDetector()
    logs = [
        {
            "tenant_id": "tenant-1",
            "workspace_id": "ws-finance",
            "query": "Como declarar o relatório fiscal de 2026 com CPF 123.456.789-00?",
            "semantic_state": "no_evidence",
            "confidence": 0.1
        },
        {
            "tenant_id": "tenant-1",
            "workspace_id": "ws-finance",
            "query": "Como declarar o relatório fiscal de 2026?",
            "semantic_state": "no_evidence",
            "confidence": 0.2
        }
    ]
    gaps = await detector.detect_gaps(tenant_id="tenant-1", retrieval_logs=logs, min_frequency=1)
    assert len(gaps) >= 1
    gap = gaps[0]
    assert gap.frequency == 2
    # Ensure CPF was sanitized from sample_queries
    for q in gap.sample_queries:
        assert "123.456.789-00" not in q

@pytest.mark.asyncio
async def test_update_gap_status_and_owner():
    detector = KnowledgeGapDetector()
    logs = [{"tenant_id": "tenant-1", "workspace_id": "ws-1", "query": "Politica de reembolso viagem internacional", "semantic_state": "no_evidence", "confidence": 0.0}]
    await detector.detect_gaps("tenant-1", logs, min_frequency=1)
    gaps = await detector.list_gaps("tenant-1")
    gap_id = gaps[0].id

    updated = await detector.update_gap(gap_id, status="in_review", assigned_owner="owner@domus.corp", candidate_sources=["DOC-RH-009"])
    assert updated.status == "in_review"
    assert updated.assigned_owner == "owner@domus.corp"
    assert "DOC-RH-009" in updated.candidate_sources
```

- [ ] **Step 2: Run test to verify failure**

Run: `uv run pytest apps/knowledge-api/tests/test_knowledge_gaps.py`
Expected: FAIL (Module not found)

- [ ] **Step 3: Implement `KnowledgeGapDetector`**

`apps/knowledge-api/src/domus_knowledge/knowledge_gaps.py`:
```python
"""Knowledge Gap Detector for V1-506."""

from typing import Any, Optional
from uuid import uuid4
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from domus_knowledge.prompt_sanitizer import PromptSanitizer


class KnowledgeGap(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    tenant_id: str
    workspace_ids: list[str] = Field(default_factory=list)
    topic: str
    sample_queries: list[str] = Field(default_factory=list)
    frequency: int = 1
    impact_score: float = 1.0
    candidate_sources: list[str] = Field(default_factory=list)
    status: str = "open"  # open, in_review, resolved, ignored
    assigned_owner: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class KnowledgeGapDetector:
    def __init__(self, sanitizer: Optional[PromptSanitizer] = None):
        self.sanitizer = sanitizer or PromptSanitizer()
        self._gaps: list[KnowledgeGap] = []

    async def detect_gaps(self, tenant_id: str, retrieval_logs: list[dict[str, Any]], min_frequency: int = 1) -> list[KnowledgeGap]:
        no_evidence_logs = [
            l for l in retrieval_logs
            if l.get("tenant_id") == tenant_id and (l.get("semantic_state") in ("no_evidence", "insufficient") or l.get("confidence", 1.0) < 0.3)
        ]

        clusters: dict[str, list[dict[str, Any]]] = {}
        for log in no_evidence_logs:
            raw_query = log.get("query", "")
            sanitized = self.sanitizer.sanitize(raw_query)
            # Basic topic normalization
            topic_key = " ".join(sanitized.lower().split()[:4]) or "lacuna sem tema"
            if topic_key not in clusters:
                clusters[topic_key] = []
            clusters[topic_key].append({"ws": log.get("workspace_id", "default"), "query": sanitized})

        detected: list[KnowledgeGap] = []
        for topic, entries in clusters.items():
            if len(entries) >= min_frequency:
                ws_set = list({e["ws"] for e in entries})
                queries = [e["query"] for e in entries]

                existing = [g for g in self._gaps if g.tenant_id == tenant_id and g.topic == topic]
                if existing:
                    gap = existing[0]
                    gap.frequency += len(entries)
                    gap.impact_score += float(len(entries))
                    gap.sample_queries = list(set(gap.sample_queries + queries))
                    gap.updated_at = datetime.now(timezone.utc).isoformat()
                    detected.append(gap)
                else:
                    gap = KnowledgeGap(
                        tenant_id=tenant_id,
                        workspace_ids=ws_set,
                        topic=topic,
                        sample_queries=queries,
                        frequency=len(entries),
                        impact_score=float(len(entries)),
                    )
                    self._gaps.append(gap)
                    detected.append(gap)

        return detected

    async def list_gaps(self, tenant_id: str, status: Optional[str] = None) -> list[KnowledgeGap]:
        results = [g for g in self._gaps if g.tenant_id == tenant_id]
        if status:
            results = [g for g in results if g.status == status]
        return results

    async def update_gap(
        self,
        gap_id: str,
        status: Optional[str] = None,
        assigned_owner: Optional[str] = None,
        candidate_sources: Optional[list[str]] = None
    ) -> KnowledgeGap:
        for gap in self._gaps:
            if gap.id == gap_id:
                if status:
                    gap.status = status
                if assigned_owner:
                    gap.assigned_owner = assigned_owner
                if candidate_sources is not None:
                    gap.candidate_sources = candidate_sources
                gap.updated_at = datetime.now(timezone.utc).isoformat()
                return gap
        raise ValueError(f"Knowledge Gap {gap_id} not found")
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest apps/knowledge-api/tests/test_knowledge_gaps.py`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/knowledge-api/src/domus_knowledge/knowledge_gaps.py apps/knowledge-api/tests/test_knowledge_gaps.py
git commit -m "feat(knowledge-api): implement KnowledgeGapDetector for V1-506"
```

---

### Task 5: REST Endpoints Integration in `apps/knowledge-api/src/domus_knowledge/main.py`

**Files:**
- Modify: `apps/knowledge-api/src/domus_knowledge/main.py`
- Create: `apps/knowledge-api/tests/test_quality_and_gap_endpoints.py`

**Interfaces:**
- Consumes: FastAPI, `QualityLoopEngine`, `KnowledgeGapDetector`
- Produces: REST endpoints for `/v1/quality-loop/*` and `/v1/knowledge-gaps/*`

- [ ] **Step 1: Write failing endpoint integration tests**

`apps/knowledge-api/tests/test_quality_and_gap_endpoints.py`:
```python
from fastapi.testclient import TestClient
from domus_knowledge.main import app

client = TestClient(app)

def test_quality_loop_feedback_flow():
    payload = {
        "tenant_id": "tenant-test",
        "workspace_id": "ws-1",
        "user_id": "user-1",
        "target_id": "res-123",
        "target_type": "response",
        "feedback_type": "error",
        "comment": "Informação divergente da norma V2."
    }
    response = client.post("/v1/quality-loop/feedback", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["target_id"] == "res-123"

    sug_res = client.get("/v1/quality-loop/suggestions?tenant_id=tenant-test")
    assert sug_res.status_code == 200
    sug_list = sug_res.json()
    assert len(sug_list) >= 1
    sug_id = sug_list[0]["id"]

    res_resolve = client.post(f"/v1/quality-loop/suggestions/{sug_id}/resolve", json={
        "before_state": {"v": 1},
        "after_state": {"v": 2},
        "owner": "owner@domus.corp"
    })
    assert res_resolve.status_code == 200
    assert res_resolve.json()["status"] == "resolved"

def test_knowledge_gap_endpoints_flow():
    logs = [
        {
            "tenant_id": "tenant-test",
            "workspace_id": "ws-1",
            "query": "Como solicitar reembolso internacional?",
            "semantic_state": "no_evidence",
            "confidence": 0.1
        }
    ]
    detect_res = client.post("/v1/knowledge-gaps/detect?tenant_id=tenant-test", json=logs)
    assert detect_res.status_code == 200
    gaps = detect_res.json()
    assert len(gaps) >= 1
    gap_id = gaps[0]["id"]

    patch_res = client.patch(f"/v1/knowledge-gaps/{gap_id}", json={
        "status": "in_review",
        "assigned_owner": "rh-owner@domus.corp"
    })
    assert patch_res.status_code == 200
    assert patch_res.json()["assigned_owner"] == "rh-owner@domus.corp"
```

- [ ] **Step 2: Run test to verify failure**

Run: `uv run pytest apps/knowledge-api/tests/test_quality_and_gap_endpoints.py`
Expected: FAIL (404 Not Found on new endpoints)

- [ ] **Step 3: Update `apps/knowledge-api/src/domus_knowledge/main.py`**

Add imports and endpoints for `QualityLoopEngine` and `KnowledgeGapDetector`:
```python
# In main.py
from domus_knowledge.quality_loop import QualityLoopEngine, FeedbackRecord, QualityLoopSuggestion
from domus_knowledge.knowledge_gaps import KnowledgeGapDetector, KnowledgeGap

quality_loop_engine = QualityLoopEngine()
knowledge_gap_detector = KnowledgeGapDetector()

@app.post("/v1/quality-loop/feedback", response_model=FeedbackRecord)
async def submit_feedback(feedback: FeedbackRecord):
    return await quality_loop_engine.submit_feedback(feedback)

@app.get("/v1/quality-loop/feedback", response_model=list[FeedbackRecord])
async def list_feedback(tenant_id: str, workspace_id: Optional[str] = None, status: Optional[str] = None):
    return await quality_loop_engine.list_feedbacks(tenant_id, workspace_id, status)

@app.get("/v1/quality-loop/suggestions", response_model=list[QualityLoopSuggestion])
async def list_quality_suggestions(tenant_id: str, status: Optional[str] = None):
    return await quality_loop_engine.list_suggestions(tenant_id, status)

class ResolveSuggestionPayload(BaseModel):
    before_state: dict[str, Any]
    after_state: dict[str, Any]
    owner: str = "Knowledge Owner"

@app.post("/v1/quality-loop/suggestions/{suggestion_id}/resolve", response_model=QualityLoopSuggestion)
async def resolve_quality_suggestion(suggestion_id: str, payload: ResolveSuggestionPayload):
    return await quality_loop_engine.resolve_suggestion(
        suggestion_id=suggestion_id,
        before_state=payload.before_state,
        after_state=payload.after_state,
        owner=payload.owner
    )

@app.post("/v1/knowledge-gaps/detect", response_model=list[KnowledgeGap])
async def detect_knowledge_gaps(tenant_id: str, retrieval_logs: list[dict[str, Any]], min_frequency: int = 1):
    return await knowledge_gap_detector.detect_gaps(tenant_id, retrieval_logs, min_frequency)

@app.get("/v1/knowledge-gaps", response_model=list[KnowledgeGap])
async def list_knowledge_gaps(tenant_id: str, status: Optional[str] = None):
    return await knowledge_gap_detector.list_gaps(tenant_id, status)

class UpdateGapPayload(BaseModel):
    status: Optional[str] = None
    assigned_owner: Optional[str] = None
    candidate_sources: Optional[list[str]] = None

@app.patch("/v1/knowledge-gaps/{gap_id}", response_model=KnowledgeGap)
async def update_knowledge_gap(gap_id: str, payload: UpdateGapPayload):
    return await knowledge_gap_detector.update_gap(
        gap_id=gap_id,
        status=payload.status,
        assigned_owner=payload.assigned_owner,
        candidate_sources=payload.candidate_sources
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest apps/knowledge-api/tests/test_quality_and_gap_endpoints.py`
Expected: PASS

- [ ] **Step 5: Run full pytest suite across knowledge-api**

Run: `uv run pytest apps/knowledge-api/tests`
Expected: PASS (all tests passing)

- [ ] **Step 6: Commit**

```bash
git add apps/knowledge-api/src/domus_knowledge/main.py apps/knowledge-api/tests/test_quality_and_gap_endpoints.py
git commit -m "feat(knowledge-api): expose REST endpoints for V1-505 quality loop and V1-506 knowledge gaps"
```
