import assert from "node:assert/strict";
import { test } from "node:test";
import { redactText, redactObject } from "../dist/domain/security/token-redactor.js";

test("redactText scrubs Bearer tokens and explicit secret values", () => {
  const input = "Calling service with Authorization: Bearer ya29.secret-token-value and secret s3cr3tKey";
  const redacted = redactText(input, ["ya29.secret-token-value", "s3cr3tKey"]);

  assert.ok(!redacted.includes("ya29.secret-token-value"));
  assert.ok(!redacted.includes("s3cr3tKey"));
  assert.ok(redacted.includes("[REDACTED_OAUTH_TOKEN]"));
});

test("redactObject recursively hides sensitive key values", () => {
  const payload = {
    user: "u-1",
    authorization: "Bearer ya29.secret-token-value",
    access_token: "ya29.secret-token-value",
    data: {
      client_secret: "topsecret",
      normalField: "safeValue",
    },
  };

  const redacted = redactObject(payload);
  assert.equal(redacted.authorization, "[REDACTED_OAUTH_TOKEN]");
  assert.equal(redacted.access_token, "[REDACTED_OAUTH_TOKEN]");
  assert.equal((redacted.data as Record<string, unknown>).client_secret, "[REDACTED_OAUTH_TOKEN]");
  assert.equal((redacted.data as Record<string, unknown>).normalField, "safeValue");
});
