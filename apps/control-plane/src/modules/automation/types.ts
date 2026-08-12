export type RoutineStatus = 'active' | 'paused' | 'error';

export type ExecutionStatus = 'success' | 'failed' | 'blocked_by_policy' | 'blocked_by_budget' | 'paused';

export type AutomationRoutine = {
  id: string;
  tenantId: string;
  workspaceId: string;
  name: string;
  cronExpression: string;
  timezone: string;
  action: Record<string, any> | string;
  status: RoutineStatus;
  nextRunAt: Date;
  lastRunAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateRoutineInput = {
  tenantId: string;
  workspaceId: string;
  name: string;
  cronExpression: string;
  timezone?: string;
  action: Record<string, any> | string;
};

export type AutomationExecutionLog = {
  id: string;
  routineId: string;
  tenantId: string;
  workspaceId: string;
  status: ExecutionStatus;
  executedAt: Date;
  details?: Record<string, any> | string | null;
  error?: string | null;
};

export type AutomationExecutionResult = {
  status: ExecutionStatus;
  routineId?: string;
  executedAt?: Date;
  nextRunAt?: Date;
  reason?: string;
  error?: string;
};

export interface IDbPool {
  query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[] }>;
}

export interface IPolicyEngine {
  evaluate(context: any): Promise<{ decision: 'ALLOW' | 'DENY'; denyReasons?: string[] }>;
}

export interface IBudgetLedgerService {
  hasSufficientBudget(tenantId: string, workspaceId: string, estimatedCost?: number): Promise<boolean>;
}
