// apps/control-plane/test/domain/security/risk-approval-guard.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateRiskApproval } from "../../../src/domain/security/risk-approval-guard.js";

describe("RiskApprovalGuard", () => {
  it("allows LOW and MEDIUM risk tools without confirmation", () => {
    assert.equal(validateRiskApproval("LOW").allowed, true);
    assert.equal(validateRiskApproval("MEDIUM").allowed, true);
  });

  it("blocks HIGH and CRITICAL tools when confirmation is missing", () => {
    const resHigh = validateRiskApproval("HIGH");
    assert.equal(resHigh.allowed, false);
    assert.equal(resHigh.reason, "APPROVAL_REQUIRED");

    const resCrit = validateRiskApproval("CRITICAL");
    assert.equal(resCrit.allowed, false);
    assert.equal(resCrit.reason, "APPROVAL_REQUIRED");
  });

  it("allows HIGH and CRITICAL tools when valid confirmation is supplied", () => {
    const resHigh = validateRiskApproval("HIGH", "token-123");
    assert.equal(resHigh.allowed, true);

    const resCrit = validateRiskApproval("CRITICAL", undefined, "appr-456");
    assert.equal(resCrit.allowed, true);
  });
});
