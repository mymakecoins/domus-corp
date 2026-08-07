import Fastify, { type FastifyInstance } from "fastify";

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: true });

  app.get("/health", async () => ({
    service: "control-plane",
    status: "ok",
    version: process.env.APP_VERSION ?? "dev",
  }));

  return app;
}
