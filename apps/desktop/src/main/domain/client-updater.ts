import {
  verifyReleaseArtifactPackage,
  type SBOMMetadata,
} from "./packaging-release.js";
import type { DataMigrationEngine } from "./data-migration.js";

export type UpdateCheckResponse =
  | { status: "OUTDATED_BLOCKED"; isBlocked: true; minVersion: string; message: string }
  | { status: "PAUSED"; isBlocked: false; message: string }
  | {
      status: "UPDATE_AVAILABLE";
      isBlocked: false;
      release: {
        version: string;
        downloadUrl: string;
        checksum: string;
        signature: string;
        sbom?: SBOMMetadata;
        minSupportedVersion: string;
      };
    }
  | {
      status: "ROLLBACK_REQUIRED";
      isBlocked: false;
      targetVersion: string;
      release?: {
        version: string;
        downloadUrl: string;
        checksum: string;
        signature: string;
        sbom?: SBOMMetadata;
        minSupportedVersion: string;
      };
    }
  | { status: "UP_TO_DATE"; isBlocked: false };

export type ClientUpdaterConfig<T extends Record<string, any> = Record<string, any>> = {
  currentVersion: string;
  ring: "internal" | "canary" | "beta" | "stable";
  deviceId: string;
  publicKey: string;
  fetchUpdateStatus: () => Promise<UpdateCheckResponse>;
  downloadArtifact: (url: string) => Promise<Buffer>;
  migrationEngine: DataMigrationEngine<T>;
  getLocalState: () => T;
  setLocalState: (state: T) => void;
};

export type ProcessUpdateResult =
  | { status: "UPDATED"; newVersion: string }
  | { status: "ROLLED_BACK"; targetVersion: string }
  | { status: "BLOCKED_MANDATORY_UPGRADE"; isGatewayAllowed: false; minVersion: string; message: string }
  | { status: "PAUSED"; isGatewayAllowed: true }
  | { status: "UP_TO_DATE"; isGatewayAllowed: true };

export class ClientUpdater<T extends Record<string, any> = Record<string, any>> {
  private config: ClientUpdaterConfig<T>;

  constructor(config: ClientUpdaterConfig<T>) {
    this.config = config;
  }

  public async processUpdate(): Promise<ProcessUpdateResult> {
    const response = await this.config.fetchUpdateStatus();

    // 1. Minimum Mandatory Version Block
    if (response.status === "OUTDATED_BLOCKED") {
      return {
        status: "BLOCKED_MANDATORY_UPGRADE",
        isGatewayAllowed: false,
        minVersion: response.minVersion,
        message: response.message,
      };
    }

    if (response.status === "PAUSED") {
      return { status: "PAUSED", isGatewayAllowed: true };
    }

    if (response.status === "UP_TO_DATE") {
      return { status: "UP_TO_DATE", isGatewayAllowed: true };
    }

    // 2. Update Available
    if (response.status === "UPDATE_AVAILABLE") {
      const release = response.release;
      const artifactBuffer = await this.config.downloadArtifact(release.downloadUrl);

      const verification = verifyReleaseArtifactPackage({
        artifact: artifactBuffer,
        signature: release.signature,
        publicKey: this.config.publicKey,
        expectedChecksum: release.checksum,
        sbom: (release.sbom as SBOMMetadata) || {
          bomFormat: "CycloneDX",
          specVersion: "1.5",
          metadata: { timestamp: "", component: { name: "app", version: release.version, type: "application" } },
          components: [],
        },
      });

      if (!verification.verified) {
        throw new Error(`PACKAGE_VERIFICATION_FAILED: ${verification.reason}`);
      }

      // Perform forward data migration
      const currentState = this.config.getLocalState();
      const migratedState = this.config.migrationEngine.migrateForward(
        currentState,
        this.config.currentVersion,
        release.version
      );

      this.config.setLocalState(migratedState);

      return {
        status: "UPDATED",
        newVersion: release.version,
      };
    }

    // 3. Rollback Required
    if (response.status === "ROLLBACK_REQUIRED" && response.release) {
      const release = response.release;
      const artifactBuffer = await this.config.downloadArtifact(release.downloadUrl);

      const verification = verifyReleaseArtifactPackage({
        artifact: artifactBuffer,
        signature: release.signature,
        publicKey: this.config.publicKey,
        expectedChecksum: release.checksum,
        sbom: (release.sbom as SBOMMetadata) || {
          bomFormat: "CycloneDX",
          specVersion: "1.5",
          metadata: { timestamp: "", component: { name: "app", version: response.targetVersion, type: "application" } },
          components: [],
        },
      });

      if (!verification.verified) {
        throw new Error(`PACKAGE_VERIFICATION_FAILED: ${verification.reason}`);
      }

      // Perform rollback data migration
      const currentState = this.config.getLocalState();
      const rolledBackState = this.config.migrationEngine.migrateRollback(
        currentState,
        this.config.currentVersion,
        response.targetVersion
      );

      this.config.setLocalState(rolledBackState);

      return {
        status: "ROLLED_BACK",
        targetVersion: response.targetVersion,
      };
    }

    return { status: "UP_TO_DATE", isGatewayAllowed: true };
  }
}
