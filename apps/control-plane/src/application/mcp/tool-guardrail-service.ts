// apps/control-plane/src/application/mcp/tool-guardrail-service.ts
import { validatePathAllowlist } from "../../domain/security/path-allowlist-guard.js";
import { validateRiskApproval, ToolRiskLevel } from "../../domain/security/risk-approval-guard.js";
import { frameUntrustedContent, FramedContentResult } from "../../domain/security/indirect-prompt-injection-guard.js";

export type PreExecutionValidationInput = Readonly<{
  toolId: string;
  riskLevel?: ToolRiskLevel;
  parameters: Record<string, unknown>;
  allowedPrefixes?: readonly string[];
  confirmationToken?: string;
  approvalId?: string;
}>;

export class ToolGuardrailService {
  validatePreExecution(input: PreExecutionValidationInput): { allowed: boolean } {
    const riskLevel = input.riskLevel ?? "LOW";

    const riskRes = validateRiskApproval(riskLevel, input.confirmationToken, input.approvalId);
    if (!riskRes.allowed) {
      throw new Error("MCP_APPROVAL_REQUIRED");
    }

    if (input.parameters && typeof input.parameters === "object") {
      for (const [key, val] of Object.entries(input.parameters)) {
        if ((key.toLowerCase().includes("path") || key.toLowerCase().includes("file")) && typeof val === "string") {
          const pathRes = validatePathAllowlist(val, input.allowedPrefixes);
          if (!pathRes.allowed) {
            throw new Error("MCP_PATH_FORBIDDEN");
          }
        }
      }
    }

    return { allowed: true };
  }

  processPostExecution(rawResult: unknown, toolId: string, riskLevel: string = "LOW"): FramedContentResult {
    return frameUntrustedContent(rawResult, toolId, riskLevel);
  }
}

export function createToolGuardrailService(): ToolGuardrailService {
  return new ToolGuardrailService();
}
