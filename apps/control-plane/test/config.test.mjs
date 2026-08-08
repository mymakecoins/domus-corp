import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { loadConfig } from "../dist/config.js";

test("loads a runtime secret only through its file reference", () => {
  const directory = mkdtempSync(join(tmpdir(), "domus-config-"));
  const secretFile = join(directory, "provider");
  writeFileSync(secretFile, "version-one\n", { mode: 0o600 });
  const config = loadConfig({ DOMUS_ENV: "test", PROVIDER_API_KEY_FILE: secretFile });
  assert.equal(config.providerApiKey, "version-one");
  writeFileSync(secretFile, "version-two\n", { mode: 0o600 });
  assert.equal(config.providerApiKey, "version-two");
});

test("loads a Vercel sensitive runtime variable", () => {
  assert.equal(
    loadConfig({ DOMUS_ENV: "test", PROVIDER_API_KEY: "runtime-only" }).providerApiKey,
    "runtime-only",
  );
});

test("rejects ambiguous secret sources", () => {
  assert.throws(
    () =>
      loadConfig({
        DOMUS_ENV: "test",
        PROVIDER_API_KEY: "runtime-only",
        PROVIDER_API_KEY_FILE: "/runtime/provider",
      }),
    /mutually exclusive/,
  );
});
