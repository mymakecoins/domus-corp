export type DataMigrationStep<T = Record<string, any>> = {
  up: (state: T) => T;
  down: (state: T) => T;
};

function compareSemver(v1: string, v2: string): number {
  const parse = (v: string) => {
    const base = v.replace(/^v/, "").split("-")[0] ?? "0";
    return base.split(".").map(Number);
  };
  const a = parse(v1);
  const b = parse(v2);
  for (let i = 0; i < 3; i++) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

export class DataMigrationEngine<T extends Record<string, any> = Record<string, any>> {
  private migrations: Map<string, DataMigrationStep<T>> = new Map();

  public registerMigration(version: string, step: DataMigrationStep<T>): void {
    this.migrations.set(version, step);
  }

  public migrateForward(initialState: T, fromVersion: string, toVersion: string): T {
    let currentState = { ...initialState };

    const sortedVersions = Array.from(this.migrations.keys()).sort(compareSemver);

    for (const targetVersion of sortedVersions) {
      if (
        compareSemver(targetVersion, fromVersion) > 0 &&
        compareSemver(targetVersion, toVersion) <= 0
      ) {
        const migration = this.migrations.get(targetVersion);
        if (migration) {
          currentState = migration.up(currentState);
        }
      }
    }

    return currentState;
  }

  public migrateRollback(initialState: T, fromVersion: string, toVersion: string): T {
    let currentState = { ...initialState };

    const sortedVersions = Array.from(this.migrations.keys())
      .sort(compareSemver)
      .reverse();

    for (const targetVersion of sortedVersions) {
      if (
        compareSemver(targetVersion, fromVersion) <= 0 &&
        compareSemver(targetVersion, toVersion) > 0
      ) {
        const migration = this.migrations.get(targetVersion);
        if (migration) {
          currentState = migration.down(currentState);
        }
      }
    }

    return currentState;
  }
}
