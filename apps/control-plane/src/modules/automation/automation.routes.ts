import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { AutomationSchedulerService } from './automation-scheduler.service.js';

export type CreateRoutineRequestBody = {
  tenantId: string;
  workspaceId: string;
  name: string;
  cronExpression: string;
  timezone?: string;
  action: Record<string, any> | string;
};

export function registerAutomationRoutes(
  app: FastifyInstance,
  service: AutomationSchedulerService
): void {
  app.get(
    '/v1/automations',
    async (
      request: FastifyRequest<{ Querystring: { tenantId?: string; workspaceId?: string } }>,
      reply: FastifyReply
    ) => {
      const { tenantId, workspaceId } = request.query;
      if (!tenantId) {
        return reply.code(400).send({ error: 'tenantId is required' });
      }
      const routines = await service.listRoutines(tenantId, workspaceId);
      return reply.send({ routines });
    }
  );

  app.post(
    '/v1/automations',
    async (
      request: FastifyRequest<{ Body: CreateRoutineRequestBody }>,
      reply: FastifyReply
    ) => {
      const body = request.body || {};
      const { tenantId, workspaceId, name, cronExpression, timezone, action } = body;
      if (!tenantId || !workspaceId || !name || !cronExpression || !action) {
        return reply.code(400).send({ error: 'Missing required routine fields' });
      }
      const routine = await service.createRoutine({
        tenantId,
        workspaceId,
        name,
        cronExpression,
        timezone,
        action,
      });
      return reply.code(201).send({ routine });
    }
  );

  app.post(
    '/v1/automations/:id/pause',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      try {
        const routine = await service.pauseRoutine(id);
        return reply.send({ routine });
      } catch (err: any) {
        return reply.code(404).send({ error: err.message });
      }
    }
  );

  app.post(
    '/v1/automations/:id/resume',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      try {
        const routine = await service.resumeRoutine(id);
        return reply.send({ routine });
      } catch (err: any) {
        return reply.code(404).send({ error: err.message });
      }
    }
  );

  app.post(
    '/v1/automations/:id/execute',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const result = await service.executeRoutine(id);
      return reply.send(result);
    }
  );

  app.get(
    '/v1/automations/:id/logs',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const logs = await service.getExecutionLogs(id);
      return reply.send({ logs });
    }
  );
}
