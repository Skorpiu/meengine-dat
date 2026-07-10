import { z } from "zod";

export const AUDIT_LOG_LIST_DEFAULT_LIMIT = 50;
export const AUDIT_LOG_LIST_MAX_LIMIT = 100;

const optionalFilterString = (max: number) =>
  z.string().trim().min(1, "filter_must_not_be_empty").max(max).optional();

const auditLogDateParamSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "invalid_date",
  });

const auditLogFilterFieldsSchema = z.object({
  action: optionalFilterString(128),
  entityType: optionalFilterString(128),
  entityId: optionalFilterString(128),
  actorUserId: optionalFilterString(128),
  targetUserId: optionalFilterString(128),
  requestId: optionalFilterString(256),
  dateFrom: auditLogDateParamSchema.optional(),
  dateTo: auditLogDateParamSchema.optional(),
});

function refineAuditLogDateRange<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((value, ctx) => {
    const filters = value as z.infer<typeof auditLogFilterFieldsSchema>;
    if (filters.dateFrom && filters.dateTo) {
      const from = Date.parse(filters.dateFrom);
      const to = Date.parse(filters.dateTo);
      if (from > to) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "date_range_invalid",
          path: ["dateTo"],
        });
      }
    }
  });
}

export const auditLogExportQuerySchema = refineAuditLogDateRange(
  auditLogFilterFieldsSchema,
);

export type AuditLogExportQuery = z.infer<typeof auditLogExportQuerySchema>;

export const auditLogListQuerySchema = refineAuditLogDateRange(
  auditLogFilterFieldsSchema.extend({
    limit: z.coerce
      .number()
      .int()
      .min(1, "limit_out_of_range")
      .max(AUDIT_LOG_LIST_MAX_LIMIT, "limit_out_of_range")
      .optional()
      .default(AUDIT_LOG_LIST_DEFAULT_LIMIT),
    cursor: z.string().trim().min(1).optional(),
  }),
);

export type AuditLogListQuery = z.infer<typeof auditLogListQuerySchema>;

export type AuditLogListCursor = {
  createdAt: string;
  id: string;
};

export function encodeAuditLogListCursor(cursor: AuditLogListCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeAuditLogListCursor(
  value: string,
): AuditLogListCursor | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as { createdAt?: unknown; id?: unknown };

    if (typeof parsed.createdAt !== "string" || typeof parsed.id !== "string") {
      return null;
    }

    const createdAt = new Date(parsed.createdAt);
    if (Number.isNaN(createdAt.getTime())) {
      return null;
    }

    const id = parsed.id.trim();
    if (!id) {
      return null;
    }

    return { createdAt: createdAt.toISOString(), id };
  } catch {
    return null;
  }
}

export function parseAuditLogListQueryFromSearchParams(
  searchParams: URLSearchParams,
):
  | { success: true; data: AuditLogListQuery }
  | { success: false; error: string } {
  const raw = {
    limit: searchParams.get("limit") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
    action: searchParams.get("action") ?? undefined,
    entityType: searchParams.get("entityType") ?? undefined,
    entityId: searchParams.get("entityId") ?? undefined,
    actorUserId: searchParams.get("actorUserId") ?? undefined,
    targetUserId: searchParams.get("targetUserId") ?? undefined,
    requestId: searchParams.get("requestId") ?? undefined,
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
  };

  const result = auditLogListQuerySchema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    return {
      success: false,
      error: issue?.message ?? "invalid_query_params",
    };
  }

  if (result.data.cursor) {
    const decoded = decodeAuditLogListCursor(result.data.cursor);
    if (!decoded) {
      return { success: false, error: "invalid_cursor" };
    }
  }

  return { success: true, data: result.data };
}

export function parseAuditLogExportQueryFromSearchParams(
  searchParams: URLSearchParams,
):
  | { success: true; data: AuditLogExportQuery }
  | { success: false; error: string } {
  const raw = {
    action: searchParams.get("action") ?? undefined,
    entityType: searchParams.get("entityType") ?? undefined,
    entityId: searchParams.get("entityId") ?? undefined,
    actorUserId: searchParams.get("actorUserId") ?? undefined,
    targetUserId: searchParams.get("targetUserId") ?? undefined,
    requestId: searchParams.get("requestId") ?? undefined,
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
  };

  const result = auditLogExportQuerySchema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    return {
      success: false,
      error: issue?.message ?? "invalid_query_params",
    };
  }

  return { success: true, data: result.data };
}
