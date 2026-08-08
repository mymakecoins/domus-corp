import { IdentityDomainError } from "./identity-errors.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requireText(value: unknown, name: string): asserts value is string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new IdentityDomainError("IDENTITY_INVALID", `${name} is required`);
  }
}

export function requireUuid(value: unknown, name: string): asserts value is string {
  requireText(value, name);
  if (!UUID.test(value)) throw new IdentityDomainError("IDENTITY_INVALID", `${name} must be a UUID`);
}

export function requireTimestamp(value: unknown, name: string): asserts value is string {
  requireText(value, name);
  if (Number.isNaN(Date.parse(value))) {
    throw new IdentityDomainError("IDENTITY_INVALID", `${name} must be a timestamp`);
  }
}

export function rejectUnknown(input: object, allowed: ReadonlySet<string>): void {
  const unknown = Object.keys(input).find((name) => !allowed.has(name));
  if (unknown) throw new IdentityDomainError("IDENTITY_INVALID", `unsupported identity field: ${unknown}`);
}

export function immutableStrings(values: readonly string[], name: string): readonly string[] {
  if (!Array.isArray(values)) throw new IdentityDomainError("IDENTITY_INVALID", `${name} is required`);
  for (const value of values) requireText(value, name);
  if (new Set(values).size !== values.length) {
    throw new IdentityDomainError("IDENTITY_INVALID", `${name} contains duplicates`);
  }
  return Object.freeze([...values]);
}
