# Design Specification: V1-609 & V1-610 — Governed Automations Scheduler and Meeting Processing

**Feature**: Governed Automation Scheduler (V1-609) & Meeting Transcription, Consent and Task Extraction (V1-610)  
**Date**: 2026-08-12  
**Status**: Draft (Under Review)  
**Authors**: AI Pair Programmer / Superpowers Brainstorming  
**Target Milestone**: M4  

---

## 1. Overview and Intent

This design specification defines the architecture, data schemas, security boundaries, and API contracts for implementing:
1. **V1-609**: A governed automation scheduler running in the Control Plane (`apps/control-plane` - TypeScript/Fastify) for executing scheduled routines (briefings, insight checks, automated actions) with strict tenant isolation, `EffectivePolicy` re-evaluation, atomic budget pre-checks, distributed concurrency locks, pause/kill-switch controls, and full correlation auditing.
2. **V1-610**: A meeting processing engine running in `apps/knowledge-api` (Python/FastAPI) and `apps/control-plane` for consent recording, immutable audio storage in MinIO, temporalized speech-to-text transcription, decision/task extraction with confidence scores and quote citations, and human-in-the-loop task conversion via the Action Gateway.

---

## 2. Architecture & Runtime Boundaries

```
 +-------------------------------------------------------------------------------+
 |                           apps/control-plane (TS/Fastify)                     |
 |                                                                               |
 |  +--------------------------+    +-----------------------+                    |
 |  | AutomationSchedulerSvc  |--->| EffectivePolicyEngine |                    |
 |  | (PostgreSQL FOR UPDATE   |    +-----------------------+                    |
 |  |  SKIP LOCKED / cron)     |--->| BudgetLedgerPreCheck  |                    |
 |  +-------------+------------+    +-----------------------+                    |
 |                |                                                              |
 |                v Trigger Routine                                              |
 |  +-------------+------------+    +-----------------------+                    |
 |  | ActionGatewayService    |--->| External Connectors   | (Jira/GitHub/etc.) |
 |  +--------------------------+    +-----------------------+                    |
 +----------------|--------------------------------------------------------------+
                  | HTTP Internal API / Async API Contract
                  v
 +----------------|--------------------------------------------------------------+
 |                |          apps/knowledge-api (Python/FastAPI)                 |
 |                v                                                              |
 |  +-------------+------------+    +-----------------------+                    |
 |  | IntelligenceBriefingSvc  |    | MeetingService        |                    |
 |  +--------------------------+    | - ConsentManager      |                    |
 |                                  | - WhisperAdapter (STT)|                    |
 |                                  | - TaskExtractor (LLM) |                    |
 |                                  +-----------+-----------+                    |
 +----------------------------------------------|--------------------------------+
                                                v
                                  +---------------------------+
                                  | Object Storage (MinIO)    |
                                  | (Immutable audio storage) |
                                  +---------------------------+
```

---

## 3. Contracts & Schemas (`contracts/`)

### 3.1. `contracts/json-schema/automation-routine.json`
- `routine_id`: UUID
- `tenant_id`: UUID
- `workspace_id`: UUID
- `owner_id`: UUID
- `name`: String
- `cron_expression`: String (standard 5-field cron format, e.g. `0 8 * * 1-5`)
- `timezone`: String (e.g. `America/Sao_Paulo`)
- `target_action_type`: Enum (`briefing`, `insight_check`, `connector_action`)
- `target_payload`: Object
- `max_budget`: Number (limit in micro-cents)
- `status`: Enum (`active`, `paused`, `terminated`)

### 3.2. `contracts/json-schema/automation-run.json`
- `run_id`: UUID
- `routine_id`: UUID
- `executed_at`: ISO 8601 String
- `status`: Enum (`success`, `failed`, `skipped_policy_denied`, `skipped_budget_exceeded`, `paused`)
- `policy_version_applied`: String
- `budget_spent`: Number
- `error_message`: String (nullable)
- `receipt_ref`: String (nullable)

### 3.3. `contracts/json-schema/meeting-ingestion.json`
- `meeting_id`: UUID
- `tenant_id`: UUID
- `workspace_id`: UUID
- `owner_id`: UUID
- `title`: String
- `source`: Enum (`upload`, `recorded`)
- `audio_object_key`: String (MinIO object key)
- `duration_seconds`: Number
- `format`: Enum (`mp3`, `wav`, `m4a`, `ogg`)
- `consent_granted`: Boolean
- `consent_timestamp`: ISO 8601 String
- `participants`: Array of Strings
- `retention_days`: Number (default: 30)

### 3.4. `contracts/json-schema/meeting-draft-task.json`
- `task_id`: UUID
- `meeting_id`: UUID
- `title`: String
- `description`: String
- `suggested_assignee`: String (email/name, nullable)
- `due_date`: String (YYYY-MM-DD, nullable)
- `confidence_score`: Number (0.0 to 1.0)
- `provenance_quote`: String
- `provenance_timestamp_ms`: Number
- `status`: Enum (`proposed`, `approved`, `rejected`, `converted`)
- `external_task_id`: String (nullable)

---

## 4. V1-609 Detailed Design: Governed Automation Scheduler

### 4.1. PostgreSQL Schema (`migrations/`)
```sql
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

CREATE INDEX idx_automation_routines_poll ON automation_routines (status, next_run_at) WHERE status = 'active';

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
```

### 4.2. Control Plane Service (`apps/control-plane/src/modules/automation/`)
- `AutomationSchedulerService`:
  - Runs periodic loop (every 30s) querying active routines where `next_run_at <= NOW()` using `FOR UPDATE SKIP LOCKED`.
  - Re-evaluates `EffectivePolicy`: calls `PolicyEngine.evaluate(owner_id, workspace_id, target_action_type)`. If fail -> records `skipped_policy_denied`.
  - Re-evaluates `BudgetLedger`: calls `BudgetLedgerService.preCheck(workspace_id, max_budget)`. If fail -> records `skipped_budget_exceeded`.
  - Triggers task & computes next `next_run_at` using cron parser with routine's specified timezone.
  - Maintains kill-switch REST endpoint: `POST /v1/automations/routines/:id/pause` & `POST /v1/automations/routines/:id/resume`.

---

## 5. V1-610 Detailed Design: Meetings & Task Extraction

### 5.1. Database Schema (`migrations/`)
```sql
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

### 5.2. Python Service (`apps/knowledge-api/app/services/meetings/`)
- `ConsentManager`:
  - Rejects meeting audio processing if `consent_granted` is `False`.
- `TranscriptionService` (`WhisperAdapter`):
  - Ingests audio from MinIO object storage.
  - Transcribes audio into timestamped segments (`start_time_ms`, `end_time_ms`, `speaker`, `text`, `confidence`).
- `MeetingTaskExtractor`:
  - Analyzes transcript segments with LLM prompt templates.
  - Extracts actionable items into `meeting_draft_tasks` with required provenance quote and timestamp.
- Task Conversion Flow:
  - User reviews proposed task in UI/API (`POST /v1/meetings/tasks/:taskId/approve`).
  - System invokes `ActionGateway` to create real task in Jira/GitHub/ClickUp via external connectors (V1-608).

---

## 6. Security, Compliance & Failure Modes

1. **Fail-Closed Governance**: Routine execution or meeting task conversion halts immediately if policy re-evaluation or budget reservation fails.
2. **Consent & Privacy**: Audio storage is strictly tenant-isolated and locked behind consent validation. An automated retention worker purges expired audio files according to workspace rules.
3. **Idempotency**: Routine runs and task creations generate UUID idempotency keys to avoid duplicate execution.
4. **Audit Trail**: Every schedule tick, policy check, transcription request, and task approval emits OpenTelemetry traces and correlate audit log records.

---

## 7. Verification Plan & Test Strategy

1. **Contract Validation**:
   - `pnpm test:contracts` ensures TypeScript and Python types match JSON Schemas.
2. **Control Plane Unit & Integration Tests**:
   - Test `AutomationSchedulerService` for cron calculation, timezone handling, concurrency lock (`SKIP LOCKED`), policy denial, and budget exhaustion.
3. **Knowledge API Unit & Integration Tests**:
   - Test `ConsentManager` blocking unconsented audio.
   - Test `TranscriptionService` mock adapter returning structured segments.
   - Test `MeetingTaskExtractor` parsing transcripts into `meeting_draft_tasks`.
4. **End-to-End Flow**:
   - Run meeting audio upload -> transcription -> draft task -> Action Gateway approval -> external connector task receipt.
