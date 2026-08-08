import Fastify, { type FastifyInstance } from "fastify";

import { loadConfig } from "./config.js";

export function buildApp(): FastifyInstance {
  const config = loadConfig();
  const app = Fastify({ logger: true });

  app.get("/health", async () => ({
    service: "control-plane",
    status: "ok",
    version: config.appVersion,
  }));

  return app;
}
