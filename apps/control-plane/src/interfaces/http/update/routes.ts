import type { FastifyInstance } from "fastify";
import type { RolloutService, RolloutRing, RingReleaseConfig } from "../../../application/update-rollout/rollout-service.js";

export function registerUpdateRoutes(app: FastifyInstance, rolloutService: RolloutService): void {
  app.get("/v1/updates/check", async (request, reply) => {
    const query = request.query as {
      clientVersion?: string;
      ring?: string;
      deviceId?: string;
    };

    const clientVersion = query.clientVersion || "0.0.0";
    const ring = (query.ring || "stable") as RolloutRing;
    const deviceId = query.deviceId || "anonymous";

    const result = rolloutService.checkClientUpdate({
      clientVersion,
      ring,
      deviceId,
    });

    return reply.code(200).send(result);
  });

  app.post("/v1/admin/rollout/rings/:ring", async (request, reply) => {
    const params = request.params as { ring: string };
    const body = request.body as RingReleaseConfig;

    const ring = params.ring as RolloutRing;
    rolloutService.setRingRelease(ring, body);

    return reply.code(200).send({
      success: true,
      ring,
      release: rolloutService.getRingRelease(ring),
    });
  });

  app.post("/v1/admin/rollout/rings/:ring/pause", async (request, reply) => {
    const params = request.params as { ring: string };
    const ring = params.ring as RolloutRing;
    const success = rolloutService.pauseRing(ring);
    return reply.code(200).send({ success, ring });
  });

  app.post("/v1/admin/rollout/rings/:ring/resume", async (request, reply) => {
    const params = request.params as { ring: string };
    const ring = params.ring as RolloutRing;
    const success = rolloutService.resumeRing(ring);
    return reply.code(200).send({ success, ring });
  });

  app.post("/v1/admin/rollout/rings/:ring/rollback", async (request, reply) => {
    const params = request.params as { ring: string };
    const body = request.body as {
      targetVersion: string;
      downloadUrl: string;
      checksum: string;
      signature: string;
    };
    const ring = params.ring as RolloutRing;

    rolloutService.rollbackRing(
      ring,
      body.targetVersion,
      body.downloadUrl,
      body.checksum,
      body.signature
    );

    return reply.code(200).send({
      success: true,
      ring,
      release: rolloutService.getRingRelease(ring),
    });
  });
}
