import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildEmailLogContext,
  redactEmailRecipient,
  redactSensitiveUrls,
} from "./redaction";
import { sendEmail } from "./email-service";
import { noopEmailProvider } from "./providers/noop-provider";

const sampleInput = {
  to: "student.secret@school.example",
  subject: "You are invited",
  html: "<p>Accept at https://app.example/invitations/accept?token=super-secret-token</p>",
  text: "Accept at https://app.example/invitations/accept?token=super-secret-token",
  replyTo: "admin@school.example",
  tags: ["invitation"],
};

describe("email boundary (noop default)", () => {
  const originalProvider = process.env.EMAIL_PROVIDER;

  beforeEach(() => {
    delete process.env.EMAIL_PROVIDER;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (originalProvider === undefined) {
      delete process.env.EMAIL_PROVIDER;
    } else {
      process.env.EMAIL_PROVIDER = originalProvider;
    }
  });

  it("uses noop when EMAIL_PROVIDER is unset", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await sendEmail(sampleInput);

    expect(result).toEqual({
      ok: true,
      provider: "noop",
      noop: true,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses noop when EMAIL_PROVIDER is empty or noop", async () => {
    for (const value of [undefined, "", "  ", "noop", "NOOP"]) {
      if (value === undefined) {
        delete process.env.EMAIL_PROVIDER;
      } else {
        process.env.EMAIL_PROVIDER = value;
      }
      const result = await sendEmail(sampleInput);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.provider).toBe("noop");
        expect(result.noop).toBe(true);
      }
    }
  });

  it("noop provider does not perform network I/O", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await noopEmailProvider.send(sampleInput);
    expect(result.ok).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("email boundary (planned / unknown providers)", () => {
  const originalProvider = process.env.EMAIL_PROVIDER;

  afterEach(() => {
    if (originalProvider === undefined) {
      delete process.env.EMAIL_PROVIDER;
    } else {
      process.env.EMAIL_PROVIDER = originalProvider;
    }
    vi.restoreAllMocks();
  });

  it.each(["resend", "postmark", "smtp", "Resend"])(
    "returns PROVIDER_NOT_IMPLEMENTED for %s without network",
    async (provider) => {
      process.env.EMAIL_PROVIDER = provider;
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      const result = await sendEmail(sampleInput);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errorCode).toBe("PROVIDER_NOT_IMPLEMENTED");
        expect(result.provider).toBe(provider.toLowerCase());
        expect(result.message).not.toContain("super-secret-token");
      }
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it("returns PROVIDER_UNKNOWN for unrecognized EMAIL_PROVIDER", async () => {
    process.env.EMAIL_PROVIDER = "mailgun";
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const result = await sendEmail(sampleInput);

    expect(result).toEqual({
      ok: false,
      provider: "noop",
      errorCode: "PROVIDER_UNKNOWN",
      message: "Unknown EMAIL_PROVIDER value; no email was sent.",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("email redaction", () => {
  it("buildEmailLogContext omits full html/text and redacts recipient", () => {
    const ctx = buildEmailLogContext(sampleInput, "noop");
    const serialized = JSON.stringify(ctx);

    expect(ctx.to).toBe("s***@school.example");
    expect(ctx.replyTo).toBe("a***@school.example");
    expect(ctx.htmlLength).toBe(sampleInput.html.length);
    expect(ctx.textLength).toBe(sampleInput.text.length);
    expect(ctx.tags).toEqual(["invitation"]);
    expect(serialized).not.toContain("super-secret-token");
    expect(serialized).not.toContain(sampleInput.html);
    expect(serialized).not.toContain(sampleInput.text);
  });

  it("redacts token= and related query params in URLs", () => {
    const url =
      "https://app.example/accept?token=abc&resetToken=r1&verificationToken=v1&inviteToken=i1&ok=1";
    expect(redactSensitiveUrls(url)).toBe(
      "https://app.example/accept?token=[REDACTED]&resetToken=[REDACTED]&verificationToken=[REDACTED]&inviteToken=[REDACTED]&ok=1",
    );
  });

  it("redacts email local part", () => {
    expect(redactEmailRecipient("alice@example.com")).toBe("a***@example.com");
    expect(redactEmailRecipient("bad")).toBe("[invalid-email]");
  });
});
