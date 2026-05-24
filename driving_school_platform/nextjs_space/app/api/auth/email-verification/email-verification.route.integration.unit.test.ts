import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  requestEmailVerificationMock: vi.fn(),
  confirmEmailVerificationMock: vi.fn(),
}));

vi.mock("@/lib/email-verification/email-verification-service", () => ({
  requestEmailVerification: h.requestEmailVerificationMock,
  confirmEmailVerification: h.confirmEmailVerificationMock,
  EMAIL_VERIFICATION_GENERIC_SUCCESS_MESSAGE:
    "If an account exists and needs verification, instructions have been sent.",
}));

import { POST as requestPost } from "./request/route";
import { POST as confirmPost } from "./confirm/route";

function req(url: string, payload: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  h.requestEmailVerificationMock.mockResolvedValue({
    message:
      "If an account exists and needs verification, instructions have been sent.",
  });
});

describe("POST /api/auth/email-verification/request", () => {
  it("returns generic success without verificationLink or token", async () => {
    const res = await requestPost(
      req("http://school.example.com/api/auth/email-verification/request", {
        email: "user@school.test",
      }) as never,
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.message).toContain("If an account exists");
    expect(json).not.toHaveProperty("verificationLink");
    expect(json).not.toHaveProperty("token");
    expect(JSON.stringify(json)).not.toContain("token=");
  });

  it("returns generic success when service throws", async () => {
    h.requestEmailVerificationMock.mockRejectedValue(new Error("db down"));

    const res = await requestPost(
      req("http://school.example.com/api/auth/email-verification/request", {
        email: "user@school.test",
      }) as never,
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.message).toContain("If an account exists");
    expect(json).not.toHaveProperty("verificationLink");
  });

  it("passes baseUrl from request origin", async () => {
    await requestPost(
      req("https://tenant.example.com/api/auth/email-verification/request", {
        email: "user@school.test",
      }) as never,
    );

    expect(h.requestEmailVerificationMock).toHaveBeenCalledWith({
      email: "user@school.test",
      baseUrl: "https://tenant.example.com",
    });
  });
});

describe("POST /api/auth/email-verification/confirm", () => {
  it("returns success without sensitive fields", async () => {
    h.confirmEmailVerificationMock.mockResolvedValue({
      ok: true,
      message: "Your email has been verified.",
    });

    const res = await confirmPost(
      req("http://school.example.com/api/auth/email-verification/confirm", {
        token: "test-token",
      }) as never,
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json).not.toHaveProperty("tokenHash");
    expect(json).not.toHaveProperty("userId");
    expect(json).not.toHaveProperty("html");
  });

  it("returns controlled errors without userId or tokenHash", async () => {
    for (const failure of [
      {
        ok: false as const,
        error: "This verification link has expired",
        code: "token_expired" as const,
        status: 400,
      },
      {
        ok: false as const,
        error: "This verification link has already been used",
        code: "token_already_used" as const,
        status: 400,
      },
    ]) {
      h.confirmEmailVerificationMock.mockResolvedValueOnce(failure);

      const res = await confirmPost(
        req("http://school.example.com/api/auth/email-verification/confirm", {
          token: "test-token",
        }) as never,
      );

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.code).toBe(failure.code);
      expect(json).not.toHaveProperty("tokenHash");
      expect(json).not.toHaveProperty("userId");
      expect(JSON.stringify(json)).not.toContain("stack");
    }
  });

  it("returns controlled error for invalid token", async () => {
    h.confirmEmailVerificationMock.mockResolvedValue({
      ok: false,
      error: "Invalid or expired verification link",
      code: "invalid_token",
      status: 400,
    });

    const res = await confirmPost(
      req("http://school.example.com/api/auth/email-verification/confirm", {
        token: "bad",
      }) as never,
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("invalid_token");
    expect(json).not.toHaveProperty("tokenHash");
  });
});
