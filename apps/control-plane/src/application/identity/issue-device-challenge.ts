import {randomBytes as nodeRandomBytes} from "node:crypto";

export type DeviceChallengeBinding = Readonly<{
  tenantId: string;
  userId: string;
  deviceId: string;
  nonce: string;
  audience: string;
  purpose: "device-registration";
  expiresAt: string;
}>;

export type IssueDeviceChallengeCommand = Readonly<{
  tenantId: string;
  userId: string;
  deviceId: string;
  audience: string;
}>;

const CHALLENGE_TTL_SECONDS = 120;

export async function issueDeviceChallenge(
  dependencies: Readonly<{
    randomBytes?: () => Uint8Array;
    clock: {now(): Date};
    store: {save(binding: DeviceChallengeBinding, ttlSeconds: number): Promise<void>};
  }>,
  command: IssueDeviceChallengeCommand,
): Promise<Readonly<{nonce: string; audience: string; expiresAt: string}>> {
  const issuedAt = dependencies.clock.now();
  const nonce = Buffer.from(dependencies.randomBytes?.() ?? nodeRandomBytes(32)).toString("base64url");
  const expiresAt = new Date(issuedAt.getTime() + CHALLENGE_TTL_SECONDS * 1000).toISOString();
  await dependencies.store.save({
    ...command,
    nonce,
    purpose: "device-registration",
    expiresAt,
  }, CHALLENGE_TTL_SECONDS);
  return Object.freeze({nonce, audience: command.audience, expiresAt});
}
