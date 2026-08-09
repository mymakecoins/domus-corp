import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { loadConfig } from "../dist/config.js";

test("loads the Vault workload token only through its file reference", () => {
  const directory = mkdtempSync(join(tmpdir(), "domus-config-"));
  const secretFile = join(directory, "provider");
  writeFileSync(secretFile, "version-one\n", { mode: 0o600 });
  const config = loadConfig({ DOMUS_ENV: "test", VAULT_ADDR:"http://127.0.0.1:18200", VAULT_TOKEN_FILE: secretFile });
  assert.equal(config.vault?.workloadToken, "version-one");
  writeFileSync(secretFile, "version-two\n", { mode: 0o600 });
  assert.equal(config.vault?.workloadToken, "version-two");
});

test("rejects raw provider or Vault tokens in environment variables", () => {
  assert.throws(()=>loadConfig({DOMUS_ENV:"test",PROVIDER_API_KEY:"raw-provider"}),/raw provider credentials/);
  assert.throws(()=>loadConfig({DOMUS_ENV:"test",VAULT_TOKEN:"raw-vault"}),/VAULT_TOKEN_FILE/);
});

test("requires a complete and safe Vault configuration", () => {
  assert.throws(
    () => loadConfig({DOMUS_ENV:"test",VAULT_ADDR:"http://vault.example",VAULT_TOKEN_FILE:"/runtime/token"}),
    /https/,
  );
  assert.throws(()=>loadConfig({DOMUS_ENV:"test",VAULT_ADDR:"https://vault.example"}),/VAULT_TOKEN_FILE/);
});
