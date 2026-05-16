import { describe, it, expect } from "vitest";
import {
  decideDemoWriteSandbox,
  isDemoWriteSandboxEnabled,
  type DemoWriteSandboxCategory,
} from "./demo-write-sandbox-policy";

const cat: DemoWriteSandboxCategory = "lesson_driving";

describe("isDemoWriteSandboxEnabled", () => {
  it("is false by default / unset", () => {
    expect(isDemoWriteSandboxEnabled({})).toBe(false);
    expect(isDemoWriteSandboxEnabled({ DEMO_WRITE_SANDBOX_ENABLED: "" })).toBe(
      false,
    );
    expect(
      isDemoWriteSandboxEnabled({ DEMO_WRITE_SANDBOX_ENABLED: "false" }),
    ).toBe(false);
    expect(isDemoWriteSandboxEnabled({ DEMO_WRITE_SANDBOX_ENABLED: "0" })).toBe(
      false,
    );
  });

  it("is true only for case-insensitive trimmed true", () => {
    expect(
      isDemoWriteSandboxEnabled({ DEMO_WRITE_SANDBOX_ENABLED: "true" }),
    ).toBe(true);
    expect(
      isDemoWriteSandboxEnabled({ DEMO_WRITE_SANDBOX_ENABLED: " TRUE " }),
    ).toBe(true);
  });
});

describe("decideDemoWriteSandbox", () => {
  it("allows when organization is not demo regardless of sandbox flag", () => {
    expect(
      decideDemoWriteSandbox({
        isDemoOrganization: false,
        sandboxEnabled: false,
        category: cat,
        currentCount: 99,
      }),
    ).toEqual({ allowed: true });

    expect(
      decideDemoWriteSandbox({
        isDemoOrganization: false,
        sandboxEnabled: true,
        category: cat,
        currentCount: 99,
      }),
    ).toEqual({ allowed: true });
  });

  it("blocks demo org when sandbox is disabled", () => {
    expect(
      decideDemoWriteSandbox({
        isDemoOrganization: true,
        sandboxEnabled: false,
        category: cat,
        currentCount: 0,
      }),
    ).toEqual({ allowed: false, reason: "demo_write_sandbox_disabled" });
  });

  it("allows demo org with sandbox on and count 0 with default pending 1", () => {
    expect(
      decideDemoWriteSandbox({
        isDemoOrganization: true,
        sandboxEnabled: true,
        category: cat,
        currentCount: 0,
      }),
    ).toEqual({ allowed: true });
  });

  it("blocks demo org with sandbox on when currentCount >= max (default 1)", () => {
    expect(
      decideDemoWriteSandbox({
        isDemoOrganization: true,
        sandboxEnabled: true,
        category: cat,
        currentCount: 1,
      }),
    ).toEqual({ allowed: false, reason: "demo_write_quota_exceeded" });
  });

  it("respects custom maxCount", () => {
    expect(
      decideDemoWriteSandbox({
        isDemoOrganization: true,
        sandboxEnabled: true,
        category: cat,
        currentCount: 2,
        maxCount: 3,
      }),
    ).toEqual({ allowed: true });

    expect(
      decideDemoWriteSandbox({
        isDemoOrganization: true,
        sandboxEnabled: true,
        category: cat,
        currentCount: 3,
        maxCount: 3,
      }),
    ).toEqual({ allowed: false, reason: "demo_write_quota_exceeded" });
  });

  it("blocks when pendingCreates would exceed max", () => {
    expect(
      decideDemoWriteSandbox({
        isDemoOrganization: true,
        sandboxEnabled: true,
        category: "lesson_theory_exam",
        currentCount: 0,
        maxCount: 1,
        pendingCreates: 2,
      }),
    ).toEqual({ allowed: false, reason: "demo_write_quota_exceeded" });
  });

  it("treats theory exam and practical exam as separate quota categories", () => {
    expect(
      decideDemoWriteSandbox({
        isDemoOrganization: true,
        sandboxEnabled: true,
        category: "lesson_theory_exam",
        currentCount: 1,
      }),
    ).toEqual({ allowed: false, reason: "demo_write_quota_exceeded" });

    expect(
      decideDemoWriteSandbox({
        isDemoOrganization: true,
        sandboxEnabled: true,
        category: "lesson_practical_exam",
        currentCount: 0,
      }),
    ).toEqual({ allowed: true });
  });
});
