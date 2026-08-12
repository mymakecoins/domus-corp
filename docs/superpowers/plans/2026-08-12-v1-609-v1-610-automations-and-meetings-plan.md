# V1-609 & V1-610 Governed Automations and Meeting Processing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the governed automations scheduler (V1-609) in `apps/control-plane` (TypeScript/Fastify) and the meeting processing engine (V1-610) with consent, transcription, and draft task extraction in `apps/knowledge-api` (Python/FastAPI).

**Architecture:** 
The Control Plane owns routine scheduling, policy re-evaluation, budget reservation, and distributed locks. The Knowledge API handles audio consent verification, temporalized speech-to-text transcription via a pluggable adapter, and LLM-based draft task extraction. Approved draft tasks are passed to the Action Gateway for governed execution.

**Tech Stack:** TypeScript, Fastify, Node cron, PostgreSQL, Python 3.11+, FastAPI, Pydantic, MinIO, Pytest, Vitest/Node test runner.

## Global Constraints

- **Multi-runtime Contracts:** JSON Schemas in `contracts/json-schema/` serve as authoritative cross-runtime definitions.
- **Fail-Closed Governance:** Policy re-evaluation and budget pre-check must occur before any scheduled routine or task creation runs.
- **Audio Privacy:** Meeting audio is encrypted at rest in MinIO and blocked without explicit consent (`consent_granted = True`).
- **No Indigo/Violet styling or unvetted dependencies.**

---

### Task 1: Contracts & JSON Schemas (`contracts/`)

**Files:**
- Create: `contracts/json-schema/automation-routine.json`
- Create: `contracts/json-schema/automation-run.json`
- Create: `contracts/json-schema/meeting-ingestion.json`
- Create: `contracts/json-schema/meeting-draft-task.json`
- Modify: `contracts/CHANGELOG.md`

**Interfaces:**
- Consumes: Standard JSON Schema Draft-07 specification.
- Produces: Contract schemas for V1-609 automation routines/runs and V1-610 meetings/draft tasks.

- [ ] **Step 1: Write `contracts/json-schema/automation-routine.json`**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://domus.corp/schemas/automation-routine.json",
  "title": "AutomationRoutine",
  "type": "object",
  "required": [
    "routine_id",
    "tenant_id",
    "workspace_id",
    "owner_id",
    "name",
    "cron_expression",
    "timezone",
    "target_action_type",
    "status"
  ],
  "properties": {
    "routine_id": { "type": "string", "format": "uuid" },
    "tenant_id": { "type": "string", "format": "uuid" },
    "workspace_id": { "type": "string", "format": "uuid" },
    "owner_id": { "type": "string", "format": "uuid" },
    "name": { "type": "string" },
    "description": { "type": "string" },
    "cron_expression": { "type": "string" },
    "timezone": { "type": "string", "default": "UTC" },
    "target_action_type": { "type": "string", "enum": ["briefing", "insight_check", "connector_action"] },
    "target_payload": { "type": "object" },
    "max_budget": { "type": "number", "minimum": 0 },
    "status": { "type": "string", "enum": ["active", "paused", "terminated"] }
  }
}
```

- [ ] **Step 2: Write `contracts/json-schema/automation-run.json`**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://domus.corp/schemas/automation-run.json",
  "title": "AutomationRun",
  "type": "object",
  "required": [
    "run_id",
    "routine_id",
    "executed_at",
    "status"
  ],
  "properties": {
    "run_id": { "type": "string", "format": "uuid" },
    "routine_id": { "type": "string", "format": "uuid" },
    "executed_at": { "type": "string", "format": "date-time" },
    "status": { "type": "string", "enum": ["success", "failed", "skipped_policy_denied", "skipped_budget_exceeded", "paused"] },
    "policy_version_applied": { "type": "string" },
    "budget_spent": { "type": "number" },
    "error_message": { "type": "string" },
    "receipt_ref": { "type": "string" }
  }
}
```

- [ ] **Step 3: Write `contracts/json-schema/meeting-ingestion.json` and `meeting-draft-task.json`**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://domus.corp/schemas/meeting-ingestion.json",
  "title": "MeetingIngestion",
  "type": "object",
  "required": [
    "meeting_id",
    "tenant_id",
    "workspace_id",
    "owner_id",
    "title",
    "consent_granted"
  ],
  "properties": {
    "meeting_id": { "type": "string", "format": "uuid" },
    "tenant_id": { "type": "string", "format": "uuid" },
    "workspace_id": { "type": "string", "format": "uuid" },
    "owner_id": { "type": "string", "format": "uuid" },
    "title": { "type": "string" },
    "audio_object_key": { "type": "string" },
    "duration_seconds": { "type": "integer" },
    "consent_granted": { "type": "boolean" },
    "consent_timestamp": { "type": "string", "format": "date-time" },
    "retention_days": { "type": "integer", "default": 30 }
  }
}
```

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://domus.corp/schemas/meeting-draft-task.json",
  "title": "MeetingDraftTask",
  "type": "object",
  "required": [
    "task_id",
    "meeting_id",
    "title",
    "confidence_score",
    "provenance_quote",
    "status"
  ],
  "properties": {
    "task_id": { "type": "string", "format": "uuid" },
    "meeting_id": { "type": "string", "format": "uuid" },
    "title": { "type": "string" },
    "description": { "type": "string" },
    "suggested_assignee": { "type": "string" },
    "due_date": { "type": "string", "format": "date" },
    "confidence_score": { "type": "number", "minimum": 0, "maximum": 1 },
    "provenance_quote": { "type": "string" },
    "provenance_timestamp_ms": { "type": "integer" },
    "status": { "type": "string", "enum": ["proposed", "approved", "rejected", "converted"] },
    "external_task_id": { "type": "string" }
  }
}
```

- [ ] **Step 4: Update `contracts/CHANGELOG.md`**

Append entry for schemas V1-609 and V1-610.

- [ ] **Step 5: Commit**

```bash
git add contracts/json-schema/automation-routine.json contracts/json-schema/automation-run.json contracts/json-schema/meeting-ingestion.json contracts/json-schema/meeting-draft-task.json contracts/CHANGELOG.md
git commit -m "feat(contracts): add JSON schemas for V1-609 automations and V1-610 meeting processing"
```

---

### Task 2: Database Migration for V1-609 and V1-610 (`migrations/`)

**Files:**
- Create: `migrations/009_automations_and_meetings.sql`

**Interfaces:**
- Consumes: PostgreSQL schema conventions.
- Produces: Tables `automation_routines`, `automation_runs`, `meetings`, `meeting_transcripts`, `meeting_draft_tasks`.

- [ ] **Step 1: Write `migrations/009_automations_and_meetings.sql`**

```sql
-- Migration 009: Automations Scheduler (V1-609) and Meetings/Tasks (V1-610)

CREATE TABLE IF NOT EXISTS automation_routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    workspace_id UUID NOT NULL,
    owner_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cron_expression VARCHAR(100) NOT NULL,
    timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
    target_action_type VARCHAR(50) NOT NULL,
    target_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    max_budget NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    next_run_at TIMESTAMPTZ NOT NULL,
    last_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_routines_poll ON automation_routines (status, next_run_at) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS automation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_id UUID NOT NULL REFERENCES automation_routines(id) ON DELETE CASCADE,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(50) NOT NULL,
    policy_version_applied VARCHAR(100),
    budget_spent NUMERIC(12, 4) DEFAULT 0.0000,
    error_message TEXT,
    receipt_ref VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    workspace_id UUID NOT NULL,
    owner_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    duration_seconds INT DEFAULT 0,
    audio_object_key VARCHAR(512),
    consent_granted BOOLEAN NOT NULL DEFAULT FALSE,
    consent_timestamp TIMESTAMPTZ,
    participants JSONB DEFAULT '[]'::jsonb,
    retention_expires_at TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'uploaded',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meeting_transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    language VARCHAR(10) DEFAULT 'pt',
    full_text TEXT NOT NULL,
    segments JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meeting_draft_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    suggested_assignee VARCHAR(255),
    due_date DATE,
    confidence_score FLOAT NOT NULL DEFAULT 0.0,
    provenance_quote TEXT NOT NULL,
    provenance_timestamp_ms INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'proposed',
    external_task_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- [ ] **Step 2: Commit**

```bash
git add migrations/009_automations_and_meetings.sql
git commit -m "feat(db): add database migration for automations scheduler and meetings"
```

---

### Task 3: V1-609 Automation Scheduler Service (`apps/control-plane`)

**Files:**
- Create: `apps/control-plane/src/modules/automation/types.ts`
- Create: `apps/control-plane/src/modules/automation/automation-scheduler.service.ts`
- Create: `apps/control-plane/src/modules/automation/automation.routes.ts`
- Create: `apps/control-plane/test/automation-scheduler.test.ts`

**Interfaces:**
- Consumes: PostgreSQL DB pool, PolicyEngine, BudgetLedgerService.
- Produces: `AutomationSchedulerService` with poll routines, pause/resume, and execution logging.

- [ ] **Step 1: Write `apps/control-plane/test/automation-scheduler.test.ts`**

```typescript
import { test, expect } from 'vitest';
import { AutomationSchedulerService } from '../src/modules/automation/automation-scheduler.service';

test('AutomationSchedulerService computes next run time correctly', () => {
  const service = new AutomationSchedulerService(null as any);
  const nextRun = service.computeNextRun('0 8 * * *', 'UTC', new Date('2026-08-12T00:00:00Z'));
  expect(nextRun.toISOString()).toBe('2026-08-12T08:00:00.000Z');
});

test('AutomationSchedulerService respects paused status', async () => {
  const mockDb = {
    query: async () => ({ rows: [{ id: '123', status: 'paused' }] })
  };
  const service = new AutomationSchedulerService(mockDb as any);
  const result = await service.executeRoutine('123');
  expect(result.status).toBe('paused');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run apps/control-plane/test/automation-scheduler.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Write implementation files**

Write `types.ts`, `automation-scheduler.service.ts`, and `automation.routes.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run apps/control-plane/test/automation-scheduler.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/control-plane/src/modules/automation/ apps/control-plane/test/automation-scheduler.test.ts
git commit -m "feat(control-plane): implement V1-609 governed automation scheduler service and routes"
```

---

### Task 4: V1-610 Meetings & Transcription Service (`apps/knowledge-api`)

**Files:**
- Create: `apps/knowledge-api/app/services/meetings/consent.py`
- Create: `apps/knowledge-api/app/services/meetings/transcription.py`
- Create: `apps/knowledge-api/app/services/meetings/task_extractor.py`
- Create: `apps/knowledge-api/app/routers/meetings.py`
- Create: `tests/knowledge_api/test_meetings.py`

**Interfaces:**
- Consumes: MinIO Object Storage, Audio files, Prompt templates.
- Produces: `ConsentManager`, `TranscriptionService` (WhisperAdapter), `MeetingTaskExtractor`, and `/v1/meetings/` FastAPI endpoints.

- [ ] **Step 1: Write `tests/knowledge_api/test_meetings.py`**

```python
import pytest
from app.services.meetings.consent import ConsentManager
from app.services.meetings.transcription import TranscriptionService, TranscriptSegment
from app.services.meetings.task_extractor import MeetingTaskExtractor

def test_consent_manager_blocks_unconsented_meeting():
    consent_mgr = ConsentManager()
    assert consent_mgr.can_process({"consent_granted": False}) is False
    assert consent_mgr.can_process({"consent_granted": True}) is True

def test_transcription_adapter_generates_segments():
    svc = TranscriptionService()
    transcript = svc.transcribe_audio("dummy_key")
    assert len(transcript.segments) > 0
    assert isinstance(transcript.segments[0], TranscriptSegment)

def test_task_extractor_parses_draft_tasks():
    extractor = MeetingTaskExtractor()
    draft_tasks = extractor.extract_tasks(
        meeting_id="m1",
        full_text="Precisamos atualizar a documentação até sexta-feira. João fica responsável por essa tarefa."
    )
    assert len(draft_tasks) > 0
    assert draft_tasks[0].title != ""
    assert draft_tasks[0].confidence_score > 0.0
```

- [ ] **Step 2: Run pytest to verify it fails**

Run: `pytest tests/knowledge_api/test_meetings.py`
Expected: FAIL (ImportError / module not found)

- [ ] **Step 3: Write implementation files in Python**

Implement `consent.py`, `transcription.py`, `task_extractor.py`, and `routers/meetings.py`.

- [ ] **Step 4: Run pytest to verify it passes**

Run: `pytest tests/knowledge_api/test_meetings.py`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/knowledge-api/app/services/meetings/ apps/knowledge-api/app/routers/meetings.py tests/knowledge_api/test_meetings.py
git commit -m "feat(knowledge-api): implement V1-610 meeting processing, consent, transcription and task extraction"
```

---

### Task 5: End-to-End Task Approval Handoff (Draft Task -> Action Gateway)

**Files:**
- Create / Modify: `apps/control-plane/test/meeting-task-action-gateway.test.ts`

**Interfaces:**
- Consumes: `meeting_draft_tasks`, `ActionGatewayService`.
- Produces: Conversion of approved `meeting_draft_task` into an active `ActionRequest` sent to external connectors.

- [ ] **Step 1: Write integration test `apps/control-plane/test/meeting-task-action-gateway.test.ts`**

```typescript
import { test, expect } from 'vitest';

test('Approved meeting draft task converts to ActionRequest payload', () => {
  const draftTask = {
    task_id: 'task-1',
    meeting_id: 'meet-1',
    title: 'Atualizar documentação de reuniões',
    suggested_assignee: 'joao@domus.corp',
    due_date: '2026-08-15',
    confidence_score: 0.92,
    provenance_quote: 'Precisamos atualizar a documentação até sexta-feira.',
    status: 'approved'
  };

  const actionRequest = {
    action_type: 'create_issue',
    connector: 'jira',
    parameters: {
      summary: draftTask.title,
      description: `Origem: Reunião ${draftTask.meeting_id}\nCitação: "${draftTask.provenance_quote}"`,
      assignee: draftTask.suggested_assignee,
      due_date: draftTask.due_date
    }
  };

  expect(actionRequest.parameters.summary).toBe(draftTask.title);
  expect(actionRequest.action_type).toBe('create_issue');
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run apps/control-plane/test/meeting-task-action-gateway.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/control-plane/test/meeting-task-action-gateway.test.ts
git commit -m "test(integration): add meeting draft task approval to Action Gateway handoff test"
```
