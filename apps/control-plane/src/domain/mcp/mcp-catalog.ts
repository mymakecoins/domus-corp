export type McpRiskLevel = "low" | "medium" | "high" | "irreversible";
export type McpServerStatus = "PENDING_SECURITY_APPROVAL" | "APPROVED" | "REVOKED";

export type McpToolDefinition = Readonly<{
  toolId: string;
  name: string;
  description: string;
  parametersSchema: Record<string, unknown>;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | McpRiskLevel;
  timeoutMs?: number;
}>;

export type McpServerEntry = Readonly<{
  serverId: string;
  tenantId: string;
  name: string;
  description: string;
  ownerUserId: string;
  endpointUrl: string;
  tools: readonly McpToolDefinition[];
  enabled: boolean;
  status: McpServerStatus;
  allowedWorkspaces: readonly string[];
  createdAt: string;
  updatedAt: string;
}>;
