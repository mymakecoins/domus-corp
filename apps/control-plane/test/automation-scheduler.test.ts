import { test, expect } from 'vitest';
import Fastify from 'fastify';
import { AutomationSchedulerService } from '../src/modules/automation/automation-scheduler.service.js';
import { registerAutomationRoutes } from '../src/modules/automation/automation.routes.js';
import type { AutomationRoutine } from '../src/modules/automation/types.js';

test('AutomationSchedulerService computes next run time correctly', () => {
  const service = new AutomationSchedulerService(null as any);
  const nextRun = service.computeNextRun('0 8 * * *', 'UTC', new Date('2026-08-12T00:00:00Z'));
  expect(nextRun.toISOString()).toBe('2026-08-12T08:00:00.000Z');
});

test('AutomationSchedulerService computes next run time with timezone correctly', () => {
  const service = new AutomationSchedulerService(null as any);
  const nextRun = service.computeNextRun('0 8 * * *', 'America/Sao_Paulo', new Date('2026-08-12T00:00:00Z'));
  // 08:00 AM in America/Sao_Paulo (UTC-3) corresponds to 11:00:00.000Z UTC
  expect(nextRun.toISOString()).toBe('2026-08-12T11:00:00.000Z');
});

test('AutomationSchedulerService computes interval cron expressions correctly', () => {
  const service = new AutomationSchedulerService(null as any);
  const nextRun = service.computeNextRun('*/15 * * * *', 'UTC', new Date('2026-08-12T10:05:00Z'));
  expect(nextRun.toISOString()).toBe('2026-08-12T10:15:00.000Z');
});

test('AutomationSchedulerService respects paused status', async () => {
  const mockDb = {
    query: async () => ({ rows: [{ id: '123', status: 'paused', cron_expression: '0 8 * * *', timezone: 'UTC' }] })
  };
  const service = new AutomationSchedulerService(mockDb as any);
  const result = await service.executeRoutine('123');
  expect(result.status).toBe('paused');
});

test('AutomationSchedulerService executes routine when active', async () => {
  const routine: AutomationRoutine = {
    id: 'routine-1',
    tenantId: 'tenant-1',
    workspaceId: 'ws-1',
    name: 'Daily Backup',
    cronExpression: '0 8 * * *',
    timezone: 'UTC',
    action: { type: 'backup' },
    status: 'active',
    nextRunAt: new Date('2026-08-12T08:00:00Z'),
    lastRunAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const queries: string[] = [];
  const mockDb = {
    query: async (sql: string, params?: any[]) => {
      queries.push(sql);
      if (sql.includes('SELECT') && sql.includes('automation_routines')) {
        return {
          rows: [{
            id: routine.id,
            tenant_id: routine.tenantId,
            workspace_id: routine.workspaceId,
            name: routine.name,
            cron_expression: routine.cronExpression,
            timezone: routine.timezone,
            action: JSON.stringify(routine.action),
            status: routine.status,
            next_run_at: routine.nextRunAt,
            last_run_at: routine.lastRunAt,
            created_at: routine.createdAt,
            updated_at: routine.updatedAt,
          }]
        };
      }
      return { rows: [] };
    }
  };

  const service = new AutomationSchedulerService(mockDb as any);
  const result = await service.executeRoutine('routine-1');
  expect(result.status).toBe('success');
  expect(result.routineId).toBe('routine-1');
});

test('AutomationSchedulerService blocks execution and advances next_run_at if PolicyEngine denies', async () => {
  const queries: { sql: string; params?: any[] }[] = [];
  const mockDb = {
    query: async (sql: string, params?: any[]) => {
      queries.push({ sql, params });
      if (sql.includes('SELECT') && sql.includes('automation_routines')) {
        return {
          rows: [{
            id: 'routine-policy',
            tenant_id: 't-1',
            workspace_id: 'ws-1',
            name: 'Restricted Routine',
            cron_expression: '0 8 * * *',
            timezone: 'UTC',
            action: JSON.stringify({ type: 'delete_data' }),
            status: 'active',
            next_run_at: new Date('2026-08-12T08:00:00Z'),
          }]
        };
      }
      return { rows: [] };
    }
  };

  const mockPolicyEngine = {
    evaluate: async () => ({ decision: 'DENY' as const, denyReasons: ['ACTION_NOT_ALLOWED'] })
  };

  const service = new AutomationSchedulerService(mockDb as any, mockPolicyEngine as any);
  const result = await service.executeRoutine('routine-policy');
  expect(result.status).toBe('blocked_by_policy');
  expect(result.nextRunAt).toBeDefined();

  // Verify DB update was executed to advance next_run_at
  const updateQuery = queries.find((q) => q.sql.includes('UPDATE automation_routines SET last_run_at ='));
  expect(updateQuery).toBeDefined();
  expect(updateQuery?.params?.[1]).toBeDefined(); // next_run_at parameter
});

test('AutomationSchedulerService blocks execution and advances next_run_at if BudgetLedgerService denies', async () => {
  const queries: { sql: string; params?: any[] }[] = [];
  const mockDb = {
    query: async (sql: string, params?: any[]) => {
      queries.push({ sql, params });
      if (sql.includes('SELECT') && sql.includes('automation_routines')) {
        return {
          rows: [{
            id: 'routine-budget',
            tenant_id: 't-1',
            workspace_id: 'ws-1',
            name: 'Expensive AI Task',
            cron_expression: '0 8 * * *',
            timezone: 'UTC',
            action: JSON.stringify({ type: 'llm_call' }),
            status: 'active',
            next_run_at: new Date('2026-08-12T08:00:00Z'),
          }]
        };
      }
      return { rows: [] };
    }
  };

  const mockPolicyEngine = {
    evaluate: async () => ({ decision: 'ALLOW' as const, denyReasons: [] })
  };

  const mockBudgetLedger = {
    hasSufficientBudget: async () => false
  };

  const service = new AutomationSchedulerService(mockDb as any, mockPolicyEngine as any, mockBudgetLedger as any);
  const result = await service.executeRoutine('routine-budget');
  expect(result.status).toBe('blocked_by_budget');
  expect(result.nextRunAt).toBeDefined();

  const updateQuery = queries.find((q) => q.sql.includes('UPDATE automation_routines SET last_run_at ='));
  expect(updateQuery).toBeDefined();
  expect(updateQuery?.params?.[1]).toBeDefined();
});

test('AutomationSchedulerService handles pause and resume', async () => {
  let status = 'active';
  const mockDb = {
    query: async (sql: string, params?: any[]) => {
      if (sql.includes('UPDATE')) {
        status = params?.[0];
      }
      return {
        rows: [{
          id: 'routine-1',
          tenant_id: 't-1',
          workspace_id: 'ws-1',
          name: 'Test',
          cron_expression: '0 8 * * *',
          timezone: 'UTC',
          action: '{}',
          status,
          next_run_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        }]
      };
    }
  };

  const service = new AutomationSchedulerService(mockDb as any);
  const paused = await service.pauseRoutine('routine-1');
  expect(paused.status).toBe('paused');

  const resumed = await service.resumeRoutine('routine-1');
  expect(resumed.status).toBe('active');
});

test('AutomationSchedulerService pollRoutines uses FOR UPDATE SKIP LOCKED and runs due routines', async () => {
  const executedQueries: string[] = [];
  const mockDb = {
    query: async (sql: string) => {
      executedQueries.push(sql);
      if (sql.includes('SELECT') && sql.includes('automation_routines')) {
        return {
          rows: [{
            id: 'due-1',
            tenant_id: 't-1',
            workspace_id: 'ws-1',
            name: 'Due Routine',
            cron_expression: '0 8 * * *',
            timezone: 'UTC',
            action: '{}',
            status: 'active',
            next_run_at: new Date('2026-08-12T07:00:00Z'),
          }]
        };
      }
      return { rows: [] };
    }
  };

  const service = new AutomationSchedulerService(mockDb as any);
  const results = await service.pollRoutines(new Date('2026-08-12T08:00:00Z'));
  expect(results.length).toBe(1);
  expect(results[0].status).toBe('success');

  // Verify FOR UPDATE SKIP LOCKED query was executed
  const lockQuery = executedQueries.find((sql) => sql.includes('FOR UPDATE SKIP LOCKED'));
  expect(lockQuery).toBeDefined();
});

test('Fastify automation routes register and function correctly', async () => {
  const mockRoutine: AutomationRoutine = {
    id: 'r-100',
    tenantId: 'tenant-1',
    workspaceId: 'ws-1',
    name: 'Scheduled Sync',
    cronExpression: '0 12 * * *',
    timezone: 'UTC',
    action: { type: 'sync' },
    status: 'active',
    nextRunAt: new Date('2026-08-12T12:00:00Z'),
    lastRunAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockService = {
    createRoutine: async () => mockRoutine,
    listRoutines: async () => [mockRoutine],
    pauseRoutine: async (id: string) => ({ ...mockRoutine, status: 'paused' as const }),
    resumeRoutine: async (id: string) => ({ ...mockRoutine, status: 'active' as const }),
    executeRoutine: async (id: string) => ({ status: 'success' as const, routineId: id, executedAt: new Date() }),
    getExecutionLogs: async () => [],
  };

  const app = Fastify();
  registerAutomationRoutes(app, mockService as any);

  // GET /v1/automations
  const listRes = await app.inject({
    method: 'GET',
    url: '/v1/automations?tenantId=tenant-1',
  });
  expect(listRes.statusCode).toBe(200);
  expect(listRes.json().routines.length).toBe(1);

  // POST /v1/automations
  const createRes = await app.inject({
    method: 'POST',
    url: '/v1/automations',
    payload: {
      tenantId: 'tenant-1',
      workspaceId: 'ws-1',
      name: 'Scheduled Sync',
      cronExpression: '0 12 * * *',
      timezone: 'UTC',
      action: { type: 'sync' },
    },
  });
  expect(createRes.statusCode).toBe(201);
  expect(createRes.json().routine.id).toBe('r-100');

  // POST /v1/automations/r-100/pause
  const pauseRes = await app.inject({
    method: 'POST',
    url: '/v1/automations/r-100/pause',
  });
  expect(pauseRes.statusCode).toBe(200);
  expect(pauseRes.json().routine.status).toBe('paused');

  // POST /v1/automations/r-100/resume
  const resumeRes = await app.inject({
    method: 'POST',
    url: '/v1/automations/r-100/resume',
  });
  expect(resumeRes.statusCode).toBe(200);
  expect(resumeRes.json().routine.status).toBe('active');

  // POST /v1/automations/r-100/execute
  const execRes = await app.inject({
    method: 'POST',
    url: '/v1/automations/r-100/execute',
  });
  expect(execRes.statusCode).toBe(200);
  expect(execRes.json().status).toBe('success');
});
