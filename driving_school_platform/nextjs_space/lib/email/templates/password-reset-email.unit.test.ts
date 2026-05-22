import { describe, expect, it } from "vitest";

import {
  buildPasswordResetEmail,
  formatPasswordResetEmailExpiry,
} from "./password-reset-email";

export const PASSWORD_RESET_TEST_LINK =
  "https://demo.example.test/auth/reset-password?token=test-token";

describe("buildPasswordResetEmail", () => {
  const baseInput = {
    resetLink: PASSWORD_RESET_TEST_LINK,
    expiresAt: new Date("2026-05-22T15:00:00.000Z"),
    recipientEmail: "user@demo.example.test",
  };

  it("subject does not contain token or reset URL", () => {
    const result = buildPasswordResetEmail(baseInput);
    expect(result.subject).toBe("Reset your Driving Academy Tool password");
    expect(result.subject).not.toContain("test-token");
    expect(result.subject).not.toContain("demo.example.test");
  });

  it("html and text include reset link", () => {
    const result = buildPasswordResetEmail(baseInput);
    expect(result.html).toContain(PASSWORD_RESET_TEST_LINK);
    expect(result.text).toContain(PASSWORD_RESET_TEST_LINK);
    expect(result.tags).toEqual(["password-reset"]);
  });

  it("escapes interpolated HTML", () => {
    const result = buildPasswordResetEmail({
      ...baseInput,
      recipientEmail: 'evil"><script>alert(1)</script>',
    });
    expect(result.html).not.toContain("<script>alert(1)</script>");
    expect(result.html).toContain("&quot;&gt;&lt;script&gt;");
  });

  it("formats expiry legibly", () => {
    const label = formatPasswordResetEmailExpiry(baseInput.expiresAt);
    expect(label).toBe("May 22, 2026, 3:00 PM");
    expect(buildPasswordResetEmail(baseInput).text).toContain(label);
  });
});
