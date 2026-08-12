export class KillSwitchGuard {
  private globalActive = false;
  private readonly activeWorkspaces = new Set<string>();

  activateGlobal(): void {
    this.globalActive = true;
  }

  deactivateGlobal(): void {
    this.globalActive = false;
  }

  activateWorkspace(tenantId: string, workspaceId: string): void {
    this.activeWorkspaces.add(`${tenantId}:${workspaceId}`);
  }

  deactivateWorkspace(tenantId: string, workspaceId: string): void {
    this.activeWorkspaces.delete(`${tenantId}:${workspaceId}`);
  }

  isKilled(tenantId: string, workspaceId: string): boolean {
    if (this.globalActive) return true;
    return this.activeWorkspaces.has(`${tenantId}:${workspaceId}`);
  }
}
