// apps/control-plane/src/domain/security/indirect-prompt-injection-guard.ts
export type FramedContentResult = Readonly<{
  framedOutput: string;
  injectionDetected: boolean;
  warnings: readonly string[];
}>;

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /system\s+prompt:/i,
  /new\s+instruction:/i,
  /you\s+are\s+now\s+an?\s+unrestricted/i,
  /override\s+system\s+policy/i,
];

export function frameUntrustedContent(
  payload: unknown,
  toolId: string,
  riskLevel: string = "LOW"
): FramedContentResult {
  const rawString = typeof payload === "string" ? payload : JSON.stringify(payload);
  const warnings: string[] = [];

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(rawString)) {
      warnings.push(`INDIRECT_PROMPT_INJECTION_PATTERN:${pattern.source}`);
    }
  }

  const injectionDetected = warnings.length > 0;
  const safePayload = rawString.replaceAll("</untrusted_content>", "&lt;/untrusted_content&gt;");
  const framedOutput = `<untrusted_content tool_id="${toolId}" risk="${riskLevel}">\n${safePayload}\n</untrusted_content>`;

  return Object.freeze({
    framedOutput,
    injectionDetected,
    warnings: Object.freeze(warnings),
  });
}
