export type RegisterDeviceCommand = Readonly<{
  tenantId: string;
  userId: string;
  deviceId: string;
  publicKeyThumbprint: string;
  proof: string;
  requestId: string;
  eventId: string;
}>;

export async function registerDeviceAccess(
  dependencies: Readonly<{
    proofVerifier: {
      verify(input: {deviceId: string; publicKeyThumbprint: string; proof: string}): Promise<void>;
    };
    repository: {
      registerActive(command: RegisterDeviceCommand & {registeredAt: string}): Promise<{version: number}>;
    };
    cache: {publish(deviceId: string, state: {status: "ACTIVE"; version: number}): Promise<void>};
    clock: {now(): Date};
  }>,
  command: RegisterDeviceCommand,
): Promise<{status: "ACTIVE"; version: number}> {
  await dependencies.proofVerifier.verify({
    deviceId: command.deviceId,
    publicKeyThumbprint: command.publicKeyThumbprint,
    proof: command.proof,
  });
  const result = await dependencies.repository.registerActive({
    ...command,
    registeredAt: dependencies.clock.now().toISOString(),
  });
  await dependencies.cache.publish(command.deviceId, {status: "ACTIVE", version: result.version});
  return {status: "ACTIVE", version: result.version};
}
