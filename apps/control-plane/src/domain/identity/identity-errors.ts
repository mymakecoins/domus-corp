export type IdentityErrorCode =
  | "IDENTITY_INVALID"
  | "TENANT_ACCESS_DENIED"
  | "TENANT_SELECTION_REQUIRED"
  | "DEVICE_NOT_REGISTERED"
  | "DEVICE_REVOKED";

export class IdentityDomainError extends Error {
  constructor(readonly code: IdentityErrorCode, message: string = code) {
    super(message);
    this.name = "IdentityDomainError";
  }
}
