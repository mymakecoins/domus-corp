export type ToolRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type RiskApprovalResult = Readonly<{
  allowed: boolean;
  reason?: string;
}>;

export function validateRiskApproval(
  riskLevel: ToolRiskLevel | string = "LOW",
  confirmationToken?: string,
  approvalId?: string
): RiskApprovalResult {
  const normalizedLevel = (riskLevel ?? "LOW").toUpperCase();
  if (normalizedLevel === "HIGH" || normalizedLevel === "CRITICAL") {
    const hasToken =
      (confirmationToken && confirmationToken.trim().length > 0) ||
      (approvalId && approvalId.trim().length > 0);
    if (!hasToken) {
      return Object.freeze({ allowed: false, reason: "APPROVAL_REQUIRED" });
    }
  }

  return Object.freeze({ allowed: true });
}
