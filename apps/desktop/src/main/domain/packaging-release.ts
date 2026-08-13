import crypto from "node:crypto";

export type PackageMeta = Readonly<{
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  license?: string;
}>;

export type SBOMMetadata = Readonly<{
  bomFormat: "CycloneDX";
  specVersion: "1.5";
  metadata: {
    timestamp: string;
    component: {
      name: string;
      version: string;
      type: "application";
    };
  };
  components: Array<{
    type: "library";
    name: string;
    version: string;
    hashes: Array<{ alg: "SHA-256"; content: string }>;
  }>;
}>;

export type VerificationResult =
  | { verified: true }
  | { verified: false; reason: "CHECKSUM_MISMATCH" | "INVALID_SIGNATURE" | "INVALID_SBOM" };

export function generateSBOM(meta: PackageMeta): SBOMMetadata {
  const deps = meta.dependencies ?? {};
  const components = Object.entries(deps).map(([name, version]) => {
    const hash = crypto.createHash("sha256").update(`${name}@${version}`).digest("hex");
    return {
      type: "library" as const,
      name,
      version: version.replace(/^[\^~]/, ""),
      hashes: [{ alg: "SHA-256" as const, content: hash }],
    };
  });

  return {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    metadata: {
      timestamp: new Date().toISOString(),
      component: {
        name: meta.name,
        version: meta.version,
        type: "application",
      },
    },
    components,
  };
}

export function computeArtifactChecksum(data: Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function signReleaseArtifact(checksumHex: string, privateKeyPem: string): string {
  const signer = crypto.createSign("SHA256");
  signer.update(checksumHex);
  signer.end();
  return signer.sign(privateKeyPem, "base64");
}

export function verifyReleaseArtifactPackage(params: {
  artifact: Buffer;
  signature: string;
  publicKey: string;
  expectedChecksum: string;
  sbom: SBOMMetadata | null | undefined;
}): VerificationResult {
  const { artifact, signature, publicKey, expectedChecksum, sbom } = params;

  // 1. Verify SBOM validity
  if (!sbom || sbom.bomFormat !== "CycloneDX" || !sbom.metadata?.component?.name) {
    return { verified: false, reason: "INVALID_SBOM" };
  }

  // 2. Verify Checksum of artifact
  const actualChecksum = computeArtifactChecksum(artifact);
  if (actualChecksum !== expectedChecksum) {
    return { verified: false, reason: "CHECKSUM_MISMATCH" };
  }

  // 3. Verify Signature over Checksum
  try {
    const verifier = crypto.createVerify("SHA256");
    verifier.update(actualChecksum);
    verifier.end();
    const isValidSignature = verifier.verify(publicKey, signature, "base64");
    if (!isValidSignature) {
      return { verified: false, reason: "INVALID_SIGNATURE" };
    }
  } catch (_err) {
    return { verified: false, reason: "INVALID_SIGNATURE" };
  }

  return { verified: true };
}
