/**
 * Client-side helpers for practical lesson import dry-run preview.
 */

import type {
  ImportDryRunPreviewRow,
  ImportDryRunReport,
  PracticalLessonImportDryRunRow,
} from "@/lib/import-export/import-export-contracts";

export const PRACTICAL_LESSONS_IMPORT_DRY_RUN_API_PATH =
  "/api/admin/practical-lessons/import/dry-run";

export const PRACTICAL_LESSONS_IMPORT_APPLY_API_PATH =
  "/api/admin/practical-lessons/import/apply";

export type PracticalLessonsImportFormat = "csv" | "json";

export type PracticalLessonsImportDryRunReport = ImportDryRunReport<
  ImportDryRunPreviewRow<PracticalLessonImportDryRunRow>
>;

export function inferPracticalLessonsImportFormat(
  filename: string,
): PracticalLessonsImportFormat | null {
  const lower = filename.trim().toLowerCase();
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".json")) return "json";
  return null;
}

export type PracticalLessonsImportDryRunResult =
  | { ok: true; report: PracticalLessonsImportDryRunReport }
  | { ok: false; message: string };

export async function fetchPracticalLessonsImportDryRun(
  format: PracticalLessonsImportFormat,
  content: string,
): Promise<PracticalLessonsImportDryRunResult> {
  let response: Response;
  try {
    response = await fetch(PRACTICAL_LESSONS_IMPORT_DRY_RUN_API_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format, content }),
    });
  } catch {
    return {
      ok: false,
      message: "Import preview failed. Check your connection and try again.",
    };
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return {
      ok: false,
      message: response.ok
        ? "Import preview failed."
        : "Import preview failed. Please try again.",
    };
  }

  let body: {
    success?: boolean;
    data?: PracticalLessonsImportDryRunReport;
    error?: string;
  };
  try {
    body = (await response.json()) as typeof body;
  } catch {
    return { ok: false, message: "Import preview failed." };
  }

  if (!response.ok) {
    const message =
      typeof body.error === "string" && body.error.trim()
        ? body.error
        : "Import preview failed.";
    return { ok: false, message };
  }

  if (!body.success || !body.data) {
    return { ok: false, message: "Import preview failed." };
  }

  return { ok: true, report: body.data };
}

export type PracticalLessonsImportApplyResult = {
  applied: boolean;
  createdCount: number;
  skippedCount: number;
  report: PracticalLessonsImportDryRunReport;
};

export type PracticalLessonsImportApplyResponse =
  | { ok: true; result: PracticalLessonsImportApplyResult }
  | {
      ok: false;
      message: string;
      demoBlocked?: boolean;
      result?: PracticalLessonsImportApplyResult;
    };

const DEMO_RESTRICTED_MESSAGE =
  "This action is restricted in the public demo environment.";

async function readImportApiJson<T>(
  response: Response,
  failureMessage: string,
): Promise<
  | { ok: true; data: T }
  | { ok: false; message: string; demoBlocked: boolean; data?: T }
> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return {
      ok: false,
      message: response.ok
        ? failureMessage
        : `${failureMessage} Please try again.`,
      demoBlocked: response.status === 403,
    };
  }

  let body: {
    success?: boolean;
    data?: T;
    error?: string;
    code?: string;
  };
  try {
    body = (await response.json()) as typeof body;
  } catch {
    return { ok: false, message: failureMessage, demoBlocked: false };
  }

  if (!response.ok) {
    const demoBlocked =
      response.status === 403 && body.code === "demo_restricted_action";
    const message = demoBlocked
      ? typeof body.error === "string" && body.error.trim()
        ? body.error
        : DEMO_RESTRICTED_MESSAGE
      : typeof body.error === "string" && body.error.trim()
        ? body.error
        : failureMessage;
    return { ok: false, message, demoBlocked, data: body.data };
  }

  if (!body.success || body.data === undefined) {
    return {
      ok: false,
      message: failureMessage,
      demoBlocked: false,
      data: body.data,
    };
  }

  return { ok: true, data: body.data };
}

export async function fetchPracticalLessonsImportApply(
  format: PracticalLessonsImportFormat,
  content: string,
): Promise<PracticalLessonsImportApplyResponse> {
  let response: Response;
  try {
    response = await fetch(PRACTICAL_LESSONS_IMPORT_APPLY_API_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format, content, mode: "createOnly" }),
    });
  } catch {
    return {
      ok: false,
      message: "Import apply failed. Check your connection and try again.",
    };
  }

  const parsed = await readImportApiJson<PracticalLessonsImportApplyResult>(
    response,
    "Import apply failed.",
  );

  if (!parsed.ok) {
    return {
      ok: false,
      message: parsed.message,
      demoBlocked: parsed.demoBlocked,
      result: parsed.data,
    };
  }

  if (!parsed.data.applied) {
    return {
      ok: false,
      message:
        "Import was not applied. Fix validation errors and run preview again.",
      result: parsed.data,
    };
  }

  return { ok: true, result: parsed.data };
}
