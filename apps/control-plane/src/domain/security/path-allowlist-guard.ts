import path from "node:path";

export type PathValidationResult = Readonly<{
  allowed: boolean;
  reason?: string;
}>;

const FORBIDDEN_SYSTEM_PREFIXES = ["/etc", "/var", "/proc", "/sys", "C:\\Windows"];

export function validatePathAllowlist(
  inputPath: string,
  allowedPrefixes: readonly string[] = []
): PathValidationResult {
  if (inputPath.includes("\0")) {
    return Object.freeze({ allowed: false, reason: "NULL_BYTE_DETECTED" });
  }

  if (inputPath.includes("..")) {
    return Object.freeze({ allowed: false, reason: "PATH_TRAVERSAL_DETECTED" });
  }

  const normalized = path.normalize(inputPath);

  for (const sysPrefix of FORBIDDEN_SYSTEM_PREFIXES) {
    if (normalized.startsWith(sysPrefix)) {
      return Object.freeze({ allowed: false, reason: "SYSTEM_PATH_FORBIDDEN" });
    }
  }

  if (allowedPrefixes.length > 0) {
    const matchesPrefix = allowedPrefixes.some((prefix) => {
      const normPrefix = path.normalize(prefix);
      const prefixWithSep = normPrefix.endsWith(path.sep)
        ? normPrefix
        : normPrefix + path.sep;
      return (
        normalized === normPrefix ||
        normalized.startsWith(prefixWithSep)
      );
    });

    if (!matchesPrefix) {
      return Object.freeze({ allowed: false, reason: "PATH_OUTSIDE_ALLOWLIST" });
    }
  }

  return Object.freeze({ allowed: true });
}
