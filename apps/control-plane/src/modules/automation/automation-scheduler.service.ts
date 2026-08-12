import type {
  AutomationExecutionLog,
  AutomationExecutionResult,
  AutomationRoutine,
  CreateRoutineInput,
  IBudgetLedgerService,
  IDbPool,
  IPolicyEngine,
} from './types.js';

function matchPart(spec: string, val: number, min: number, max: number): boolean {
  if (spec === '*') return true;
  if (spec.includes(',')) {
    return spec.split(',').some((sub) => matchPart(sub, val, min, max));
  }
  if (spec.startsWith('*/')) {
    const step = parseInt(spec.slice(2), 10);
    return !isNaN(step) && step > 0 && val % step === 0;
  }
  if (spec.includes('-')) {
    const rangeParts = spec.split('-');
    const start = parseInt(rangeParts[0] ?? '0', 10);
    const end = parseInt(rangeParts[1] ?? '0', 10);
    return val >= start && val <= end;
  }
  const num = parseInt(spec, 10);
  return val === num;
}

export class AutomationSchedulerService {
  constructor(
    private db: IDbPool,
    private policyEngine?: IPolicyEngine,
    private budgetLedger?: IBudgetLedgerService
  ) {}

  computeNextRun(
    cronExpression: string,
    timezone: string = 'UTC',
    referenceDate: Date = new Date()
  ): Date {
    const parts = cronExpression.trim().split(/\s+/);
    if (parts.length !== 5) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }
    const [minSpec = '*', hourSpec = '*', domSpec = '*', monthSpec = '*', dowSpec = '*'] = parts;

    let current = new Date(referenceDate.getTime());
    current.setUTCMilliseconds(0);
    current.setUTCSeconds(0);

    if (current.getTime() <= referenceDate.getTime()) {
      current.setUTCMinutes(current.getUTCMinutes() + 1);
    }

    const maxIterations = 525600 * 5;
    for (let i = 0; i < maxIterations; i++) {
      const min = current.getUTCMinutes();
      const hour = current.getUTCHours();
      const dom = current.getUTCDate();
      const month = current.getUTCMonth() + 1;
      const dow = current.getUTCDay();

      if (!matchPart(minSpec, min, 0, 59)) {
        current.setUTCMinutes(current.getUTCMinutes() + 1);
        continue;
      }
      if (!matchPart(hourSpec, hour, 0, 23)) {
        current.setUTCMinutes(60 - min);
        continue;
      }
      if (!matchPart(monthSpec, month, 1, 12)) {
        current.setUTCMonth(current.getUTCMonth() + 1, 1);
        current.setUTCHours(0, 0, 0, 0);
        continue;
      }
      if (!matchPart(domSpec, dom, 1, 31) || !matchPart(dowSpec, dow, 0, 6)) {
        current.setUTCDate(current.getUTCDate() + 1);
        current.setUTCHours(0, 0, 0, 0);
        continue;
      }

      return current;
    }

    throw new Error(`Could not compute next run time for expression: ${cronExpression}`);
  }

  private mapRowToRoutine(row: any): AutomationRoutine {
    let parsedAction = row.action;
    if (typeof row.action === 'string') {
      try {
        parsedAction = JSON.parse(row.action);
      } catch {}
    }
    return {
      id: row.id,
      tenantId: row.tenant_id ?? row.tenantId,
      workspaceId: row.workspace_id ?? row.workspaceId,
      name: row.name,
      cronExpression: row.cron_expression ?? row.cronExpression,
      timezone: row.timezone ?? 'UTC',
      action: parsedAction,
      status: row.status,
      nextRunAt: row.next_run_at ? new Date(row.next_run_at) : new Date(),
      lastRunAt: row.last_run_at ? new Date(row.last_run_at) : null,
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
    };
  }

  private mapRowToExecutionLog(row: any): AutomationExecutionLog {
    let parsedDetails = row.details;
    if (typeof row.details === 'string') {
      try {
        parsedDetails = JSON.parse(row.details);
      } catch {}
    }
    return {
      id: row.id,
      routineId: row.routine_id ?? row.routineId,
      tenantId: row.tenant_id ?? row.tenantId,
      workspaceId: row.workspace_id ?? row.workspaceId,
      status: row.status,
      executedAt: row.executed_at ? new Date(row.executed_at) : new Date(),
      details: parsedDetails,
      error: row.error ?? null,
    };
  }

  async createRoutine(input: CreateRoutineInput): Promise<AutomationRoutine> {
    const id = `routine-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const timezone = input.timezone || 'UTC';
    const now = new Date();
    const nextRunAt = this.computeNextRun(input.cronExpression, timezone, now);
    const actionStr = typeof input.action === 'string' ? input.action : JSON.stringify(input.action);

    const res = await this.db.query(
      `INSERT INTO automation_routines (
        id, tenant_id, workspace_id, name, cron_expression, timezone, action, status, next_run_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        id,
        input.tenantId,
        input.workspaceId,
        input.name,
        input.cronExpression,
        timezone,
        actionStr,
        'active',
        nextRunAt,
        now,
        now,
      ]
    );

    if (res.rows && res.rows[0]) {
      return this.mapRowToRoutine(res.rows[0]);
    }

    return {
      id,
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      name: input.name,
      cronExpression: input.cronExpression,
      timezone,
      action: input.action,
      status: 'active',
      nextRunAt,
      lastRunAt: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  async executeRoutine(routineId: string): Promise<AutomationExecutionResult> {
    const res = await this.db.query(
      `SELECT * FROM automation_routines WHERE id = $1`,
      [routineId]
    );

    const row = res.rows?.[0];
    if (!row) {
      return { status: 'failed', reason: 'Routine not found' };
    }

    const routine = this.mapRowToRoutine(row);

    if (routine.status === 'paused') {
      return { status: 'paused', routineId: routine.id };
    }

    const now = new Date();

    if (this.policyEngine) {
      const policyRes = await this.policyEngine.evaluate({
        tenantId: routine.tenantId,
        workspaceId: routine.workspaceId,
        action: routine.action,
      });

      if (policyRes.decision === 'DENY') {
        const reason = policyRes.denyReasons?.join(', ') || 'Policy check failed';
        await this.recordLog(routine, 'blocked_by_policy', reason);
        await this.updateRoutineLastRun(routine.id, now);
        return { status: 'blocked_by_policy', routineId: routine.id, reason };
      }
    }

    if (this.budgetLedger) {
      const hasBudget = await this.budgetLedger.hasSufficientBudget(
        routine.tenantId,
        routine.workspaceId
      );

      if (!hasBudget) {
        const reason = 'Insufficient budget';
        await this.recordLog(routine, 'blocked_by_budget', reason);
        await this.updateRoutineLastRun(routine.id, now);
        return { status: 'blocked_by_budget', routineId: routine.id, reason };
      }
    }

    const nextRunAt = this.computeNextRun(routine.cronExpression, routine.timezone, now);

    await this.recordLog(routine, 'success', null);
    await this.db.query(
      `UPDATE automation_routines SET status = 'active', last_run_at = $1, next_run_at = $2, updated_at = $3 WHERE id = $4`,
      [now, nextRunAt, now, routine.id]
    );

    return {
      status: 'success',
      routineId: routine.id,
      executedAt: now,
      nextRunAt,
    };
  }

  async pauseRoutine(routineId: string): Promise<AutomationRoutine> {
    const now = new Date();
    const res = await this.db.query(
      `UPDATE automation_routines SET status = $1, updated_at = $2 WHERE id = $3 RETURNING *`,
      ['paused', now, routineId]
    );
    if (res.rows?.[0]) {
      return this.mapRowToRoutine(res.rows[0]);
    }
    throw new Error(`Routine ${routineId} not found`);
  }

  async resumeRoutine(routineId: string): Promise<AutomationRoutine> {
    const now = new Date();
    const res = await this.db.query(
      `UPDATE automation_routines SET status = $1, updated_at = $2 WHERE id = $3 RETURNING *`,
      ['active', now, routineId]
    );
    if (res.rows?.[0]) {
      return this.mapRowToRoutine(res.rows[0]);
    }
    throw new Error(`Routine ${routineId} not found`);
  }

  async listRoutines(tenantId: string, workspaceId?: string): Promise<AutomationRoutine[]> {
    let sql = `SELECT * FROM automation_routines WHERE tenant_id = $1`;
    const params: any[] = [tenantId];
    if (workspaceId) {
      sql += ` AND workspace_id = $2`;
      params.push(workspaceId);
    }
    sql += ` ORDER BY created_at DESC`;
    const res = await this.db.query(sql, params);
    return (res.rows || []).map((r) => this.mapRowToRoutine(r));
  }

  async pollRoutines(referenceDate: Date = new Date()): Promise<AutomationExecutionResult[]> {
    const res = await this.db.query(
      `SELECT * FROM automation_routines WHERE status = 'active' AND next_run_at <= $1`,
      [referenceDate]
    );
    const results: AutomationExecutionResult[] = [];
    for (const row of res.rows || []) {
      const result = await this.executeRoutine(row.id);
      results.push(result);
    }
    return results;
  }

  async getExecutionLogs(routineId: string): Promise<AutomationExecutionLog[]> {
    const res = await this.db.query(
      `SELECT * FROM automation_execution_logs WHERE routine_id = $1 ORDER BY executed_at DESC`,
      [routineId]
    );
    return (res.rows || []).map((r) => this.mapRowToExecutionLog(r));
  }

  private async recordLog(routine: AutomationRoutine, status: any, error: string | null): Promise<void> {
    const id = `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();
    await this.db.query(
      `INSERT INTO automation_execution_logs (
        id, routine_id, tenant_id, workspace_id, status, executed_at, details, error
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        routine.id,
        routine.tenantId,
        routine.workspaceId,
        status,
        now,
        typeof routine.action === 'string' ? routine.action : JSON.stringify(routine.action),
        error,
      ]
    );
  }

  private async updateRoutineLastRun(routineId: string, lastRunAt: Date): Promise<void> {
    await this.db.query(
      `UPDATE automation_routines SET last_run_at = $1, updated_at = $2 WHERE id = $3`,
      [lastRunAt, lastRunAt, routineId]
    );
  }
}
