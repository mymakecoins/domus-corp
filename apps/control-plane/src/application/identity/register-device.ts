export type RegisterDeviceCommand = Readonly<{
  tenantId: string;
  userId: string;
  deviceId: string;
  publicKeyJwk: Readonly<Record<string, unknown>>;
  nonce: string;
  audience: string;
  proof: string;
  requestId: string;
  eventId: string;
}>;

export async function registerDeviceAccess(
  dependencies: Readonly<{
    proofVerifier: {
      verify(input: RegisterDeviceCommand): Promise<{publicKeyThumbprint: string}>;
    };
    repository: {
      registerActive(command: Omit<RegisterDeviceCommand, "publicKeyJwk" | "nonce" | "audience" | "proof"> & {
        publicKeyThumbprint: string; registeredAt: string;
      }): Promise<{version: number}>;
    };
    cache: {publish(deviceId: string, state: {status: "ACTIVE"; version: number}): Promise<void>};
    clock: {now(): Date};
  }>,
  command: RegisterDeviceCommand,
): Promise<{status: "ACTIVE"; version: number}> {
  const verified = await dependencies.proofVerifier.verify(command);
  const result = await dependencies.repository.registerActive({
    tenantId: command.tenantId,
    userId: command.userId,
    deviceId: command.deviceId,
    publicKeyThumbprint: verified.publicKeyThumbprint,
    requestId: command.requestId,
    eventId: command.eventId,
    registeredAt: dependencies.clock.now().toISOString(),
  });
  await dependencies.cache.publish(command.deviceId, {status: "ACTIVE", version: result.version});
  return {status: "ACTIVE", version: result.version};
}
