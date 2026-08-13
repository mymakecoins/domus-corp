import crypto from "node:crypto";

export type RolloutRing = "internal" | "canary" | "beta" | "stable";

export type RingReleaseConfig = {
  version: string;
  downloadUrl: string;
  checksum: string;
  signature: string;
  sbom?: Record<string, unknown>;
  minSupportedVersion: string;
  rolloutPercentage: number;
  paused: boolean;
  migrationNotes?: string;
};

export type CheckUpdateQuery = {
  clientVersion: string;
  ring: RolloutRing;
  deviceId: string;
};

export type UpdateCheckResult =
  | { status: "OUTDATED_BLOCKED"; isBlocked: true; minVersion: string; message: string }
  | { status: "PAUSED"; isBlocked: false; message: string }
  | { status: "UPDATE_AVAILABLE"; isBlocked: false; release: RingReleaseConfig }
  | { status: "ROLLBACK_REQUIRED"; isBlocked: false; targetVersion: string; release?: RingReleaseConfig }
  | { status: "UP_TO_DATE"; isBlocked: false };

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

function getDeviceBucket(deviceId: string, ring: string): number {
  const hash = crypto.createHash("sha256").update(`${ring}:${deviceId}`).digest("hex");
  const num = parseInt(hash.substring(0, 8), 16);
  return num % 100;
}

export class RolloutService {
  private rings: Map<RolloutRing, RingReleaseConfig> = new Map();

  public setRingRelease(ring: RolloutRing, config: RingReleaseConfig): void {
    this.rings.set(ring, { ...config });
  }

  public getRingRelease(ring: RolloutRing): RingReleaseConfig | undefined {
    return this.rings.get(ring);
  }

  public pauseRing(ring: RolloutRing): boolean {
    const current = this.rings.get(ring);
    if (!current) return false;
    current.paused = true;
    return true;
  }

  public resumeRing(ring: RolloutRing): boolean {
    const current = this.rings.get(ring);
    if (!current) return false;
    current.paused = false;
    return true;
  }

  public rollbackRing(
    ring: RolloutRing,
    targetVersion: string,
    downloadUrl: string,
    checksum: string,
    signature: string
  ): void {
    const current = this.rings.get(ring);
    const minVersion = current ? current.minSupportedVersion : "1.0.0";
    this.rings.set(ring, {
      version: targetVersion,
      downloadUrl,
      checksum,
      signature,
      minSupportedVersion: compareSemver(minVersion, targetVersion) > 0 ? targetVersion : minVersion,
      rolloutPercentage: 100,
      paused: false,
      migrationNotes: `Rollback to version ${targetVersion}`,
    });
  }

  public checkClientUpdate(query: CheckUpdateQuery): UpdateCheckResult {
    const release = this.rings.get(query.ring);
    if (!release) {
      return { status: "UP_TO_DATE", isBlocked: false };
    }

    // 1. Minimum Mandatory Version Check
    if (compareSemver(query.clientVersion, release.minSupportedVersion) < 0) {
      return {
        status: "OUTDATED_BLOCKED",
        isBlocked: true,
        minVersion: release.minSupportedVersion,
        message: `Client version ${query.clientVersion} is below minimum mandatory version ${release.minSupportedVersion}`,
      };
    }

    // 2. Paused Check
    if (release.paused) {
      return {
        status: "PAUSED",
        isBlocked: false,
        message: `Rollout is paused for ring ${query.ring}`,
      };
    }

    // 3. Version comparison
    const semverDiff = compareSemver(query.clientVersion, release.version);

    if (semverDiff > 0) {
      // Client has a newer version than ring target -> Rollback required!
      return {
        status: "ROLLBACK_REQUIRED",
        isBlocked: false,
        targetVersion: release.version,
        release,
      };
    }

    if (semverDiff === 0) {
      return { status: "UP_TO_DATE", isBlocked: false };
    }

    // Client version < release.version -> Update available if within rollout percentage
    const bucket = getDeviceBucket(query.deviceId, query.ring);
    if (bucket < release.rolloutPercentage) {
      return {
        status: "UPDATE_AVAILABLE",
        isBlocked: false,
        release,
      };
    }

    return { status: "UP_TO_DATE", isBlocked: false };
  }
}
