const SENSITIVE_KEYS = new Set([
  "authorization",
  "access_token",
  "refresh_token",
  "client_secret",
  "secret",
  "api_key",
  "apikey",
  "token",
]);

export function redactText(input: string, tokensToScrub: readonly string[] = []): string {
  let result = input;

  // Redact Bearer patterns
  result = result.replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [REDACTED_OAUTH_TOKEN]");

  // Scrub explicit tokens passed in array
  for (const token of tokensToScrub) {
    if (token && token.length > 3) {
      result = result.split(token).join("[REDACTED_OAUTH_TOKEN]");
    }
  }

  return result;
}

export function redactObject<T>(obj: T, tokensToScrub: readonly string[] = []): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactObject(item, tokensToScrub)) as unknown as T;
  }

  const sensitive = new Set([...SENSITIVE_KEYS, ...tokensToScrub.map((k) => k.toLowerCase())]);
  const copy: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (sensitive.has(key.toLowerCase())) {
      copy[key] = "[REDACTED_OAUTH_TOKEN]";
    } else if (value !== null && typeof value === "object") {
      copy[key] = redactObject(value, tokensToScrub);
    } else if (typeof value === "string") {
      copy[key] = redactText(value, tokensToScrub);
    } else {
      copy[key] = value;
    }
  }

  return copy as T;
}
