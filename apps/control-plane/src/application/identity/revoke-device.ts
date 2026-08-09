export type RevokeDeviceCommand = Readonly<{
  tenantId: string;
  userId: string;
  deviceId: string;
  revokedBy: string;
  reasonCode: string;
  requestId: string;
  eventId: string;
}>;

export async function revokeDeviceAccess(
  dependencies: Readonly<{
    repository: {revoke(command: RevokeDeviceCommand & {revokedAt: string}): Promise<{version: number}>};
    cache: {publish(deviceId: string, state: {status: "REVOKED"; version: number}): Promise<void>};
    clock: {now(): Date};
  }>,
  command: RevokeDeviceCommand,
): Promise<{version: number}> {
  const result = await dependencies.repository.revoke({...command, revokedAt: dependencies.clock.now().toISOString()});
  await dependencies.cache.publish(command.deviceId, {status: "REVOKED", version: result.version});
  return result;
}
