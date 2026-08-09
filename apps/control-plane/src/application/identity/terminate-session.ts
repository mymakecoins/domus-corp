export type TerminateSessionCommand = Readonly<{
  tenantId: string;
  userId: string;
  sessionId: string;
  requestId: string;
  eventId: string;
}>;

export async function terminateSessionAccess(
  dependencies: Readonly<{
    repository: {
      terminate(command: TerminateSessionCommand & {terminatedAt: string}): Promise<{version: number}>;
    };
    clock: {now(): Date};
  }>,
  command: TerminateSessionCommand,
): Promise<{version: number}> {
  return dependencies.repository.terminate({
    ...command,
    terminatedAt: dependencies.clock.now().toISOString(),
  });
}
