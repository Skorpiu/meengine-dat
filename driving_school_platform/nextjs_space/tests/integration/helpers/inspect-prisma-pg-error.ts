/**
 * Inspect Prisma-wrapped PostgreSQL errors without printing connection URLs.
 */

export type InspectedPrismaPgError = {
  prismaCode: string | null;
  driverCode: string | null;
  sqlState: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>;
  }
  return null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function collectCandidateCodes(error: unknown): string[] {
  const codes: string[] = [];
  const root = asRecord(error);
  if (!root) return codes;

  const prismaCode = readString(root.code);
  if (prismaCode) codes.push(prismaCode);

  const meta = asRecord(root.meta);
  if (meta) {
    for (const key of ["code", "driverAdapterError", "errno"]) {
      const nested = readString(meta[key]);
      if (nested) codes.push(nested);
    }

    const cause = asRecord(meta.cause) ?? asRecord(meta.error);
    if (cause) {
      const causeCode = readString(cause.code);
      if (causeCode) codes.push(causeCode);
    }
  }

  const original = asRecord(root.original) ?? asRecord(root.cause);
  if (original) {
    const originalCode = readString(original.code);
    if (originalCode) codes.push(originalCode);
  }

  return codes;
}

export function inspectPrismaPgError(error: unknown): InspectedPrismaPgError {
  const codes = collectCandidateCodes(error);
  const prismaCode = codes.find((code) => /^P\d{4}$/.test(code)) ?? null;
  const sqlState =
    codes.find(
      (code) => /^[0-9A-Z]{5}$/.test(code) && !/^P\d{4}$/.test(code),
    ) ?? null;
  const driverCode =
    codes.find((code) => code !== prismaCode && code !== sqlState) ?? sqlState;

  return {
    prismaCode,
    driverCode,
    sqlState,
  };
}

export function errorLooksLikePostgresState(
  error: unknown,
  sqlState: string,
): boolean {
  const inspected = inspectPrismaPgError(error);
  if (inspected.sqlState === sqlState || inspected.driverCode === sqlState) {
    return true;
  }

  const root = asRecord(error);
  const meta = root ? asRecord(root.meta) : null;
  const serialized = JSON.stringify({
    code: root?.code ?? null,
    meta: meta,
    causeCode: asRecord(root?.cause)?.code ?? null,
  });
  return serialized.includes(sqlState);
}
