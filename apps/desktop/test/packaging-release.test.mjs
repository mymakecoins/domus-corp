import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  generateSBOM,
  computeArtifactChecksum,
  signReleaseArtifact,
  verifyReleaseArtifactPackage,
} from "../dist/main/main/domain/packaging-release.js";

// Generate test RSA keypair for signing tests
const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

test("generateSBOM creates valid CycloneDX SBOM metadata", () => {
  const packageMeta = {
    name: "domus-desktop",
    version: "1.2.0",
    dependencies: { react: "19.2.8", electron: "43.3.0" },
    license: "UNLICENSED",
  };

  const sbom = generateSBOM(packageMeta);
  assert.equal(sbom.bomFormat, "CycloneDX");
  assert.equal(sbom.specVersion, "1.5");
  assert.equal(sbom.metadata.component.name, "domus-desktop");
  assert.equal(sbom.metadata.component.version, "1.2.0");
  assert.equal(sbom.components.length, 2);
  assert.equal(sbom.components[0].name, "react");
});

test("computeArtifactChecksum calculates sha256 checksum", () => {
  const data = Buffer.from("domus-electron-binary-contents");
  const checksum = computeArtifactChecksum(data);
  const expected = crypto.createHash("sha256").update(data).digest("hex");
  assert.equal(checksum, expected);
});

test("signReleaseArtifact and verifyReleaseArtifactPackage verify valid package", () => {
  const artifactBuffer = Buffer.from("electron-app-v1.2.0-binary-bundle");
  const checksum = computeArtifactChecksum(artifactBuffer);
  const sbom = generateSBOM({
    name: "domus-desktop",
    version: "1.2.0",
    dependencies: { electron: "43.3.0" },
  });

  const signature = signReleaseArtifact(checksum, privateKey);

  const verification = verifyReleaseArtifactPackage({
    artifact: artifactBuffer,
    signature,
    publicKey,
    expectedChecksum: checksum,
    sbom,
  });

  assert.equal(verification.verified, true);
});

test("verifyReleaseArtifactPackage rejects tampered artifact binary", () => {
  const artifactBuffer = Buffer.from("electron-app-v1.2.0-binary-bundle");
  const checksum = computeArtifactChecksum(artifactBuffer);
  const sbom = generateSBOM({
    name: "domus-desktop",
    version: "1.2.0",
    dependencies: {},
  });
  const signature = signReleaseArtifact(checksum, privateKey);

  const tamperedBuffer = Buffer.from("electron-app-v1.2.0-tampered-binary");

  const verification = verifyReleaseArtifactPackage({
    artifact: tamperedBuffer,
    signature,
    publicKey,
    expectedChecksum: checksum,
    sbom,
  });

  assert.equal(verification.verified, false);
  assert.equal(verification.reason, "CHECKSUM_MISMATCH");
});

test("verifyReleaseArtifactPackage rejects invalid digital signature", () => {
  const artifactBuffer = Buffer.from("electron-app-v1.2.0-binary-bundle");
  const checksum = computeArtifactChecksum(artifactBuffer);
  const sbom = generateSBOM({ name: "domus-desktop", version: "1.2.0", dependencies: {} });
  
  // Create another keypair to produce invalid signature
  const { privateKey: wrongPrivateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  const invalidSignature = signReleaseArtifact(checksum, wrongPrivateKey);

  const verification = verifyReleaseArtifactPackage({
    artifact: artifactBuffer,
    signature: invalidSignature,
    publicKey,
    expectedChecksum: checksum,
    sbom,
  });

  assert.equal(verification.verified, false);
  assert.equal(verification.reason, "INVALID_SIGNATURE");
});

test("verifyReleaseArtifactPackage rejects missing or invalid SBOM", () => {
  const artifactBuffer = Buffer.from("electron-app-v1.2.0-binary-bundle");
  const checksum = computeArtifactChecksum(artifactBuffer);
  const signature = signReleaseArtifact(checksum, privateKey);

  const verification = verifyReleaseArtifactPackage({
    artifact: artifactBuffer,
    signature,
    publicKey,
    expectedChecksum: checksum,
    sbom: null,
  });

  assert.equal(verification.verified, false);
  assert.equal(verification.reason, "INVALID_SBOM");
});
