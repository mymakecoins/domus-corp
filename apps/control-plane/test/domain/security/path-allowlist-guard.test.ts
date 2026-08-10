import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validatePathAllowlist } from "../../../src/domain/security/path-allowlist-guard.js";

describe("PathAllowlistGuard", () => {
  it("allows safe paths inside workspace prefix", () => {
    const res = validatePathAllowlist("/workspace/docs/file.txt", ["/workspace/docs"]);
    assert.equal(res.allowed, true);
  });

  it("blocks directory traversal attempts", () => {
    const res = validatePathAllowlist("/workspace/docs/../../etc/passwd", ["/workspace/docs"]);
    assert.equal(res.allowed, false);
    assert.equal(res.reason, "PATH_TRAVERSAL_DETECTED");
  });

  it("blocks null byte injection attempts", () => {
    const res = validatePathAllowlist("/workspace/docs/file.txt\0.png", ["/workspace/docs"]);
    assert.equal(res.allowed, false);
    assert.equal(res.reason, "NULL_BYTE_DETECTED");
  });

  it("blocks system paths", () => {
    const res = validatePathAllowlist("/etc/passwd", ["/workspace/docs"]);
    assert.equal(res.allowed, false);
    assert.equal(res.reason, "SYSTEM_PATH_FORBIDDEN");
  });

  it("blocks paths outside allowlist", () => {
    const res = validatePathAllowlist("/opt/data/file.txt", ["/workspace/docs"]);
    assert.equal(res.allowed, false);
    assert.equal(res.reason, "PATH_OUTSIDE_ALLOWLIST");
  });
});
