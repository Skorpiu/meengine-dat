import { describe, it, expect } from "vitest";
import {
  buildEmailVerificationEmail,
  formatEmailVerificationEmailExpiry,
} from "./email-verification-email";

const baseInput = {
  verificationLink: "https://school.example.com/auth/verify-email?token=secret",
  expiresAt: new Date("2026-06-01T12:00:00.000Z"),
  recipientEmail: "user@school.test",
};

describe("buildEmailVerificationEmail", () => {
  it("subject does not contain token or link", () => {
    const result = buildEmailVerificationEmail(baseInput);
    expect(result.subject).toBe("Verify your Driving Academy Tool email");
    expect(result.subject).not.toContain("secret");
    expect(result.subject).not.toContain("verify-email");
  });

  it("includes tags and verification link in body", () => {
    const result = buildEmailVerificationEmail(baseInput);
    expect(result.tags).toEqual(["email-verification"]);
    expect(result.text).toContain(baseInput.verificationLink);
    expect(result.html).toContain("user@school.test");
  });

  it("escapes HTML in recipient email and malicious app name", () => {
    const result = buildEmailVerificationEmail({
      ...baseInput,
      recipientEmail: 'a<b>"@school.test',
      appName: '<script>alert("x")</script>',
    });

    expect(result.html).toContain("a&lt;b&gt;&quot;@school.test");
    expect(result.html).not.toContain("<script>");
    expect(result.subject).not.toContain("<script>");
  });

  it("includes formatted expiry in text", () => {
    const label = formatEmailVerificationEmailExpiry(baseInput.expiresAt);
    expect(label.length).toBeGreaterThan(0);
    expect(buildEmailVerificationEmail(baseInput).text).toContain(label);
  });
});
