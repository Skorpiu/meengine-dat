import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  requestPasswordResetMock: vi.fn(),
  confirmPasswordResetMock: vi.fn(),
}));

vi.mock("@/lib/password-reset/password-reset-service", () => ({
  requestPasswordReset: h.requestPasswordResetMock,
  confirmPasswordReset: h.confirmPasswordResetMock,
  PASSWORD_RESET_GENERIC_SUCCESS_MESSAGE:
    "If an account exists, reset instructions have been sent.",
}));

vi.mock("@/lib/rate-limit/enforce-auth-rate-limits", () => ({
  enforcePasswordResetRequestRateLimits: vi.fn().mockResolvedValue(null),
}));

import { NextResponse } from "next/server";
import { enforcePasswordResetRequestRateLimits } from "@/lib/rate-limit/enforce-auth-rate-limits";
import { POST as requestPost } from "./request/route";
import { POST as confirmPost } from "./confirm/route";

function req(url: string, payload: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

const enforcePasswordResetRequestRateLimitsMock =
  enforcePasswordResetRequestRateLimits as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetAllMocks();
  enforcePasswordResetRequestRateLimitsMock.mockResolvedValue(null);
  h.requestPasswordResetMock.mockResolvedValue({
    message: "If an account exists, reset instructions have been sent.",
  });
});

describe("POST /api/auth/password-reset/request", () => {
  it("returns generic success without resetLink or token", async () => {
    const res = await requestPost(
      req("http://school.example.com/api/auth/password-reset/request", {
        email: "user@school.test",
      }) as never,
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.message).toContain("If an account exists");
    expect(json).not.toHaveProperty("resetLink");
    expect(json).not.toHaveProperty("token");
    expect(JSON.stringify(json)).not.toContain("token=");
  });

  it("returns generic success when service throws", async () => {
    h.requestPasswordResetMock.mockRejectedValue(new Error("db down"));

    const res = await requestPost(
      req("http://school.example.com/api/auth/password-reset/request", {
        email: "user@school.test",
      }) as never,
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.message).toContain("If an account exists");
    expect(json).not.toHaveProperty("resetLink");
  });

  it("passes baseUrl from request origin", async () => {
    await requestPost(
      req("https://tenant.example.com/api/auth/password-reset/request", {
        email: "user@school.test",
      }) as never,
    );

    expect(h.requestPasswordResetMock).toHaveBeenCalledWith({
      email: "user@school.test",
      baseUrl: "https://tenant.example.com",
    });
  });

  it("returns 429 when rate limited without revealing account existence", async () => {
    enforcePasswordResetRequestRateLimitsMock.mockResolvedValueOnce(
      NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          code: "rate_limited",
        },
        { status: 429 },
      ),
    );

    const res = await requestPost(
      req("http://school.example.com/api/auth/password-reset/request", {
        email: "user@school.test",
      }) as never,
    );

    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.code).toBe("rate_limited");
    expect(json.error).toContain("Too many requests");
    expect(json).not.toHaveProperty("success");
    expect(json).not.toHaveProperty("resetLink");
    expect(h.requestPasswordResetMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/password-reset/confirm", () => {
  it("returns success without sensitive fields", async () => {
    h.confirmPasswordResetMock.mockResolvedValue({
      ok: true,
      message: "Your password has been reset.",
    });

    const res = await confirmPost(
      req("http://school.example.com/api/auth/password-reset/confirm", {
        token: "test-token",
        newPassword: "SecurePass1!",
      }) as never,
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json).not.toHaveProperty("tokenHash");
    expect(json).not.toHaveProperty("html");
  });

  it("returns controlled errors without userId or tokenHash", async () => {
    for (const failure of [
      {
        ok: false as const,
        error: "This reset link has expired",
        code: "token_expired" as const,
        status: 400,
      },
      {
        ok: false as const,
        error: "This reset link has already been used",
        code: "token_already_used" as const,
        status: 400,
      },
    ]) {
      h.confirmPasswordResetMock.mockResolvedValueOnce(failure);

      const res = await confirmPost(
        req("http://school.example.com/api/auth/password-reset/confirm", {
          token: "test-token",
          newPassword: "SecurePass1!",
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
    h.confirmPasswordResetMock.mockResolvedValue({
      ok: false,
      error: "Invalid or expired reset link",
      code: "invalid_token",
      status: 400,
    });

    const res = await confirmPost(
      req("http://school.example.com/api/auth/password-reset/confirm", {
        token: "bad",
        newPassword: "SecurePass1!",
      }) as never,
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.code).toBe("invalid_token");
    expect(json).not.toHaveProperty("tokenHash");
  });
});
