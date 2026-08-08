import { IdentityDomainError } from "./identity-errors.js";
import { requireText, requireTimestamp, requireUuid } from "./validation.js";

type DeviceBase = Readonly<{
  deviceId: string;
  tenantId: string;
  userId: string;
  publicKeyThumbprint: string;
  version: number;
  registeredAt: string;
}>;

export type Device = DeviceBase & Readonly<{
  status: "PENDING" | "ACTIVE" | "REVOKED";
  activatedAt?: string;
  revokedAt?: string;
  revokedBy?: string;
  reasonCode?: string;
}>;

type RegisterDeviceInput = Omit<DeviceBase, "version">;

export function registerDevice(input: RegisterDeviceInput): Device {
  requireUuid(input.deviceId, "deviceId");
  requireUuid(input.tenantId, "tenantId");
  requireUuid(input.userId, "userId");
  requireTimestamp(input.registeredAt, "registeredAt");
  if (!/^sha256:[a-f0-9]{64}$/.test(input.publicKeyThumbprint)) {
    throw new IdentityDomainError("IDENTITY_INVALID", "publicKeyThumbprint must be SHA-256");
  }
  return Object.freeze({...input, status: "PENDING", version: 1});
}

export function activateDevice(device: Device, activatedAt: string): Device {
  if (device.status === "REVOKED") throw new IdentityDomainError("DEVICE_REVOKED");
  if (device.status !== "PENDING") throw new IdentityDomainError("IDENTITY_INVALID", "device is already active");
  requireTimestamp(activatedAt, "activatedAt");
  return Object.freeze({...device, status: "ACTIVE", activatedAt, version: device.version + 1});
}

export function revokeDevice(
  device: Device,
  revocation: Readonly<{revokedAt: string; revokedBy: string; reasonCode: string}>,
): Device {
  if (device.status === "REVOKED") throw new IdentityDomainError("DEVICE_REVOKED");
  requireTimestamp(revocation.revokedAt, "revokedAt");
  requireUuid(revocation.revokedBy, "revokedBy");
  requireText(revocation.reasonCode, "reasonCode");
  return Object.freeze({...device, ...revocation, status: "REVOKED", version: device.version + 1});
}
