import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  inferPracticalLessonsImportFormat,
  PRACTICAL_LESSONS_IMPORT_APPLY_API_PATH,
  PRACTICAL_LESSONS_IMPORT_DRY_RUN_API_PATH,
  fetchPracticalLessonsImportApply,
} from "./practical-lessons-import-client";

describe("inferPracticalLessonsImportFormat", () => {
  it("detects csv extension", () => {
    expect(inferPracticalLessonsImportFormat("lessons.csv")).toBe("csv");
  });

  it("detects json extension", () => {
    expect(inferPracticalLessonsImportFormat("lessons.json")).toBe("json");
  });

  it("returns null for unsupported extensions", () => {
    expect(inferPracticalLessonsImportFormat("lessons.xlsx")).toBeNull();
  });
});

describe("PRACTICAL_LESSONS_IMPORT API paths", () => {
  it("points dry-run at admin dry-run route", () => {
    expect(PRACTICAL_LESSONS_IMPORT_DRY_RUN_API_PATH).toBe(
      "/api/admin/practical-lessons/import/dry-run",
    );
  });

  it("points apply at admin apply route", () => {
    expect(PRACTICAL_LESSONS_IMPORT_APPLY_API_PATH).toBe(
      "/api/admin/practical-lessons/import/apply",
    );
  });
});

describe("fetchPracticalLessonsImportApply", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const applyReport = {
    totalRows: 1,
    validRows: 1,
    invalidRows: 0,
    warnings: [],
    errors: [],
    preview: [],
  };

  it("posts createOnly payload to apply endpoint", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            applied: true,
            createdCount: 2,
            skippedCount: 0,
            report: applyReport,
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    const result = await fetchPracticalLessonsImportApply("csv", "header;row");

    expect(fetchMock).toHaveBeenCalledWith(
      PRACTICAL_LESSONS_IMPORT_APPLY_API_PATH,
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: "csv",
          content: "header;row",
          mode: "createOnly",
        }),
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result.createdCount).toBe(2);
    }
  });

  it("returns failure when apply is not applied", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            applied: false,
            createdCount: 0,
            skippedCount: 0,
            report: {
              ...applyReport,
              errors: [
                {
                  rowNumber: 1,
                  field: null,
                  code: "duplicate_practical_lesson_number",
                  message: "Duplicate",
                  rawValue: null,
                },
              ],
            },
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    const result = await fetchPracticalLessonsImportApply("json", "[]");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("not applied");
    }
  });

  it("surfaces API errors", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "Server error" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await fetchPracticalLessonsImportApply("csv", "x");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("Server error");
    }
  });

  it("flags demo blocked responses with stable message", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "This action is restricted in the public demo environment.",
          code: "demo_restricted_action",
        }),
        {
          status: 403,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    const result = await fetchPracticalLessonsImportApply("csv", "x");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.demoBlocked).toBe(true);
      expect(result.message).toContain("restricted in the public demo");
    }
  });
});
