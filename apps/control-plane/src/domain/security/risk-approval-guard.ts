export type ToolRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type RiskApprovalResult = Readonly<{
  allowed: boolean;
  reason?: string;
}>;

export function validateRiskApproval(
  riskLevel: ToolRiskLevel = "LOW",
  confirmationToken?: string,
  approvalId?: string
): RiskApprovalResult {
  if (riskLevel === "HIGH" || riskLevel === "CRITICAL") {
    const hasToken =
      (confirmationToken && confirmationToken.trim().length > 0) ||
      (approvalId && approvalId.trim().length > 0);
    if (!hasToken) {
      return Object.freeze({ allowed: false, reason: "APPROVAL_REQUIRED" });
    }
  }

  return Object.freeze({ allowed: true });
}
