import { describe, expect, it } from "vitest";
import {
  AUDIT_METADATA_MAX_JSON_BYTES,
  redactAuditMetadata,
} from "@/lib/audit/audit-log-redaction";

describe("redactAuditMetadata", () => {
  it("redacts sensitive keys case-insensitively", () => {
    const result = redactAuditMetadata({
      studentId: "stu_1",
      passwordHash: "secret-hash",
      Password: "plain",
      refresh_token: "rt_123",
      nested: { apiKey: "k" },
    }) as Record<string, unknown>;

    expect(result.studentId).toBe("stu_1");
    expect(result.passwordHash).toBe("[REDACTED]");
    expect(result.Password).toBe("[REDACTED]");
    expect(result.refresh_token).toBe("[REDACTED]");
    expect((result.nested as Record<string, unknown>).apiKey).toBe(
      "[REDACTED]",
    );
  });

  it("redacts token query params in string values", () => {
    const result = redactAuditMetadata({
      link: "https://app.example/reset?token=abc123&next=/home",
    }) as Record<string, unknown>;

    expect(result.link).toBe(
      "https://app.example/reset?token=[REDACTED]&next=/home",
    );
  });

  it("truncates oversized payloads", () => {
    const big = { blob: "x".repeat(AUDIT_METADATA_MAX_JSON_BYTES + 100) };
    const result = redactAuditMetadata(big) as Record<string, unknown>;

    expect(result._truncated).toBe(true);
    expect(result._originalBytes).toBeGreaterThan(
      AUDIT_METADATA_MAX_JSON_BYTES,
    );
  });

  it("stops recursion at max depth", () => {
    const deep: Record<string, unknown> = {};
    let cursor = deep;
    for (let i = 0; i < 12; i += 1) {
      const next: Record<string, unknown> = {};
      cursor.child = next;
      cursor = next;
    }

    const result = redactAuditMetadata(deep) as Record<string, unknown>;
    let node: unknown = result;
    for (let i = 0; i < 8; i += 1) {
      node = (node as Record<string, unknown>).child;
    }
    expect(node).toEqual({ child: "[MAX_DEPTH]" });
  });
});
