export interface ResolvedCredential {
  tokenType: "Bearer" | "Basic" | "OAuth2";
  accessToken: string;
  refreshToken?: string;
  baseUrl?: string;
}

export interface CredentialResolver {
  resolveCredential(tenantId: string, workspaceId: string, userId: string, connectorId: string): Promise<ResolvedCredential>;
}

export class MockCredentialResolver implements CredentialResolver {
  constructor(private readonly mockToken: string = "mock-valid-token-123") {}

  async resolveCredential(_tenantId: string, _workspaceId: string, _userId: string, connectorId: string): Promise<ResolvedCredential> {
    return {
      tokenType: "Bearer",
      accessToken: `${connectorId}-${this.mockToken}`,
    };
  }
}
