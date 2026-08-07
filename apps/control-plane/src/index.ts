import { buildApp } from "./app.js";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const app = buildApp();

try {
  await app.listen({ host: "0.0.0.0", port });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
