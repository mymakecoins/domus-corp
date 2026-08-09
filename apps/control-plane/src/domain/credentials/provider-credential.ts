export type CredentialState = "PENDING" | "ACTIVE" | "REVOKED";

export type ProviderCredential = Readonly<{
  credentialId: string;
  providerKey: string;
  version: number;
  state: CredentialState;
  secretReference: string;
  createdAt: string;
  activatedAt?: string;
  revokedAt?: string;
}>;

function assertMetadata(input: ProviderCredential): void {
  if (!/^[a-z][a-z0-9-]{1,62}$/.test(input.providerKey) || input.version < 1 ||
      input.secretReference.length < 1 || !Number.isFinite(Date.parse(input.createdAt))) {
    throw new Error("CREDENTIAL_INVALID");
  }
}

export function createPendingCredential(input: ProviderCredential): ProviderCredential {
  assertMetadata(input);
  if (input.state !== "PENDING" || input.activatedAt || input.revokedAt) throw new Error("CREDENTIAL_STATE_INVALID");
  return Object.freeze({...input});
}

export function activateCredential(
  credential: ProviderCredential,
  input: Readonly<{testedVersion: number; activatedAt: string}>,
): ProviderCredential {
  if (credential.state !== "PENDING") throw new Error("CREDENTIAL_STATE_INVALID");
  if (input.testedVersion !== credential.version) throw new Error("CREDENTIAL_TEST_REQUIRED");
  return Object.freeze({...credential, state: "ACTIVE", activatedAt: input.activatedAt});
}

export function revokeCredential(credential: ProviderCredential, revokedAt: string): ProviderCredential {
  if (credential.state === "REVOKED") throw new Error("CREDENTIAL_STATE_INVALID");
  return Object.freeze({...credential, state: "REVOKED", revokedAt});
}
