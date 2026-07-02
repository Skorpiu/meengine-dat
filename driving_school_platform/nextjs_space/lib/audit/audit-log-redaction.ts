import { redactSensitiveUrls } from "@/lib/email/redaction";

/** Keys never persisted in audit metadata or legacy diff fields (case-insensitive). */
export const AUDIT_SENSITIVE_KEYS = [
  "password",
  "passwordhash",
  "token",
  "tokenhash",
  "accesstoken",
  "access_token",
  "refreshtoken",
  "refresh_token",
  "id_token",
  "secret",
  "apikey",
  "api_key",
  "authorization",
  "cookie",
  "credentials",
  "session_state",
  "provideraccountid",
  "passwordresettoken",
  "emailverificationtoken",
  "invitetoken",
  "resettoken",
  "verificationtoken",
] as const;

export const AUDIT_METADATA_MAX_DEPTH = 8;
export const AUDIT_METADATA_MAX_JSON_BYTES = 8_192;

export type RedactAuditMetadataOptions = {
  maxDepth?: number;
  maxJsonBytes?: number;
};

function isSensitiveAuditKey(key: string): boolean {
  const normalized = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return AUDIT_SENSITIVE_KEYS.some((blocked) => {
    const blockedNorm = blocked.replace(/[^a-z0-9]/gi, "").toLowerCase();
    return normalized === blockedNorm || normalized.includes(blockedNorm);
  });
}

function redactAuditString(value: string): string {
  return redactSensitiveUrls(value);
}

function truncateOversizedJson(value: unknown, maxJsonBytes: number): unknown {
  try {
    const serialized = JSON.stringify(value);
    if (serialized.length <= maxJsonBytes) {
      return value;
    }
    return {
      _truncated: true,
      _originalBytes: serialized.length,
      _maxBytes: maxJsonBytes,
    };
  } catch {
    return { _truncated: true, _reason: "non_serializable" };
  }
}

/**
 * Recursively redacts sensitive keys and URL tokens from audit payloads.
 * Returns JSON-safe primitives only; drops functions/symbols.
 */
export function redactAuditMetadata(
  value: unknown,
  options: RedactAuditMetadataOptions = {},
  depth = 0,
): unknown {
  const maxDepth = options.maxDepth ?? AUDIT_METADATA_MAX_DEPTH;
  const maxJsonBytes = options.maxJsonBytes ?? AUDIT_METADATA_MAX_JSON_BYTES;

  if (value === null || value === undefined) {
    return value;
  }

  if (depth > maxDepth) {
    return "[MAX_DEPTH]";
  }

  if (typeof value === "string") {
    return redactAuditString(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (Array.isArray(value)) {
    const next = value.map((item) =>
      redactAuditMetadata(item, options, depth + 1),
    );
    return truncateOversizedJson(next, maxJsonBytes);
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (isSensitiveAuditKey(key)) {
        result[key] = "[REDACTED]";
        continue;
      }
      result[key] = redactAuditMetadata(nested, options, depth + 1);
    }
    return truncateOversizedJson(result, maxJsonBytes);
  }

  return String(value);
}
