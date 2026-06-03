/**
 * Pure UI rules for practical lessons import dialog (preview → apply).
 */

import type { PracticalLessonsImportDryRunReport } from "@/lib/lessons/practical-lessons-import-client";

export type PracticalLessonsImportPayload = {
  format: "csv" | "json";
  content: string;
};

export function canApplyPracticalLessonsImport(input: {
  importPayload: PracticalLessonsImportPayload | null;
  report: PracticalLessonsImportDryRunReport | null;
  previewLoading: boolean;
  applyLoading: boolean;
  applyCompleted: boolean;
}): boolean {
  if (input.applyCompleted) return false;
  if (input.previewLoading || input.applyLoading) return false;
  if (!input.importPayload || !input.report) return false;
  if (input.report.errors.length > 0) return false;
  return input.report.validRows > 0;
}

export function formatPracticalLessonsImportApplySuccess(input: {
  createdCount: number;
  skippedCount: number;
  warningCount: number;
}): string {
  const parts = [
    `Import applied: ${input.createdCount} practical lesson record(s) created.`,
  ];
  if (input.skippedCount > 0) {
    parts.push(`${input.skippedCount} row(s) skipped.`);
  }
  if (input.warningCount > 0) {
    parts.push(`${input.warningCount} warning(s) in the report.`);
  }
  return parts.join(" ");
}
