import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const userFindUniqueMock = vi.fn();
  const emailVerificationUpdateManyMock = vi.fn();
  const emailVerificationCreateMock = vi.fn();
  const emailVerificationFindUniqueMock = vi.fn();
  const userUpdateMock = vi.fn();
  const transactionMock = vi.fn();
  const sendEmailMock = vi.fn();

  const prismaMock = {
    user: {
      findUnique: userFindUniqueMock,
      update: userUpdateMock,
    },
    emailVerificationToken: {
      updateMany: emailVerificationUpdateManyMock,
      create: emailVerificationCreateMock,
      findUnique: emailVerificationFindUniqueMock,
    },
    $transaction: transactionMock,
  };

  return {
    userFindUniqueMock,
    emailVerificationUpdateManyMock,
    emailVerificationCreateMock,
    emailVerificationFindUniqueMock,
    userUpdateMock,
    transactionMock,
    sendEmailMock,
    prismaMock,
  };
});

vi.mock("@/lib/db", () => ({
  prisma: h.prismaMock,
  db: h.prismaMock,
}));

vi.mock("@/lib/email/email-service", () => ({
  sendEmail: h.sendEmailMock,
}));

import {
  confirmEmailVerification,
  EMAIL_VERIFICATION_GENERIC_SUCCESS_MESSAGE,
  requestEmailVerification,
} from "./email-verification-service";
import { hashEmailVerificationToken } from "@/lib/auth/email-verification-token-service";

const RAW_TOKEN = "verify-token-raw-test";
const TOKEN_HASH = hashEmailVerificationToken(RAW_TOKEN);

beforeEach(() => {
  vi.resetAllMocks();
  h.sendEmailMock.mockResolvedValue({ ok: true, provider: "noop", noop: true });
  h.transactionMock.mockImplementation(
    async (fn: (tx: typeof h.prismaMock) => unknown) => fn(h.prismaMock),
  );
  h.emailVerificationUpdateManyMock.mockResolvedValue({ count: 0 });
  h.emailVerificationCreateMock.mockResolvedValue({ id: "evt-1" });
  h.userUpdateMock.mockResolvedValue({});
});

describe("requestEmailVerification", () => {
  it("returns generic success for unknown email without creating token", async () => {
    h.userFindUniqueMock.mockResolvedValue(null);

    const result = await requestEmailVerification({
      email: "unknown@school.test",
      baseUrl: "https://school.example.com",
    });

    expect(result.message).toBe(EMAIL_VERIFICATION_GENERIC_SUCCESS_MESSAGE);
    expect(h.emailVerificationCreateMock).not.toHaveBeenCalled();
    expect(h.sendEmailMock).not.toHaveBeenCalled();
  });

  it("returns generic success for already verified user without creating token", async () => {
    h.userFindUniqueMock.mockResolvedValue({
      id: "u1",
      email: "verified@school.test",
      isEmailVerified: true,
      emailVerified: new Date("2026-01-01T00:00:00.000Z"),
    });

    const result = await requestEmailVerification({
      email: "verified@school.test",
      baseUrl: "https://school.example.com",
    });

    expect(result.message).toBe(EMAIL_VERIFICATION_GENERIC_SUCCESS_MESSAGE);
    expect(h.emailVerificationCreateMock).not.toHaveBeenCalled();
    expect(h.sendEmailMock).not.toHaveBeenCalled();
  });

  it("creates token hash and calls sendEmail for unverified user", async () => {
    h.userFindUniqueMock.mockResolvedValue({
      id: "u1",
      email: "user@school.test",
      isEmailVerified: false,
      emailVerified: null,
    });

    const result = await requestEmailVerification({
      email: "  User@School.TEST ",
      baseUrl: "https://school.example.com",
    });

    expect(result.message).toBe(EMAIL_VERIFICATION_GENERIC_SUCCESS_MESSAGE);
    expect(h.emailVerificationCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "u1",
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    });
    expect(
      h.emailVerificationCreateMock.mock.calls[0][0].data.tokenHash,
    ).not.toBe(RAW_TOKEN);

    expect(h.sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@school.test",
        tags: ["email-verification"],
      }),
    );
    const emailArg = h.sendEmailMock.mock.calls[0][0];
    expect(emailArg.html).toContain("/auth/verify-email?token=");
    expect(emailArg.html).not.toContain(
      h.emailVerificationCreateMock.mock.calls[0][0].data.tokenHash,
    );
  });

  it("still returns generic success when sendEmail fails", async () => {
    h.userFindUniqueMock.mockResolvedValue({
      id: "u1",
      email: "user@school.test",
      isEmailVerified: false,
      emailVerified: null,
    });
    h.sendEmailMock.mockRejectedValue(new Error("provider down"));

    const result = await requestEmailVerification({
      email: "user@school.test",
      baseUrl: "https://school.example.com",
    });

    expect(result.message).toBe(EMAIL_VERIFICATION_GENERIC_SUCCESS_MESSAGE);
  });
});

describe("confirmEmailVerification", () => {
  it("rejects invalid token", async () => {
    h.emailVerificationFindUniqueMock.mockResolvedValue(null);

    const result = await confirmEmailVerification({ token: "bad-token" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("invalid_token");
      expect(result).not.toHaveProperty("userId");
      expect(result).not.toHaveProperty("tokenHash");
    }
  });

  it("rejects expired token", async () => {
    h.emailVerificationFindUniqueMock.mockResolvedValue({
      id: "evt-1",
      userId: "u1",
      expiresAt: new Date("2020-01-01T00:00:00.000Z"),
      usedAt: null,
    });

    const result = await confirmEmailVerification({ token: RAW_TOKEN });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("token_expired");
    }
  });

  it("rejects used token", async () => {
    h.emailVerificationFindUniqueMock.mockResolvedValue({
      id: "evt-1",
      userId: "u1",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      usedAt: new Date("2026-05-22T10:00:00.000Z"),
    });

    const result = await confirmEmailVerification({ token: RAW_TOKEN });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("token_already_used");
    }
  });

  it("marks user verified and atomically consumes token", async () => {
    h.emailVerificationFindUniqueMock.mockResolvedValue({
      id: "evt-1",
      userId: "u1",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      usedAt: null,
    });
    h.emailVerificationUpdateManyMock
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const result = await confirmEmailVerification({ token: RAW_TOKEN });

    expect(result.ok).toBe(true);
    expect(h.userUpdateMock).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: {
        isEmailVerified: true,
        emailVerified: expect.any(Date),
      },
    });
    expect(h.emailVerificationUpdateManyMock).toHaveBeenCalledWith({
      where: {
        tokenHash: TOKEN_HASH,
        usedAt: null,
        expiresAt: { gt: expect.any(Date) },
      },
      data: { usedAt: expect.any(Date) },
    });
  });

  it("rejects second use when atomic consume returns count 0 (race)", async () => {
    h.emailVerificationFindUniqueMock
      .mockResolvedValueOnce({
        id: "evt-1",
        userId: "u1",
        expiresAt: new Date("2099-01-01T00:00:00.000Z"),
        usedAt: null,
      })
      .mockResolvedValueOnce({
        usedAt: new Date("2026-05-22T12:00:00.000Z"),
        expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      });
    h.emailVerificationUpdateManyMock.mockResolvedValue({ count: 0 });

    const result = await confirmEmailVerification({ token: RAW_TOKEN });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("token_already_used");
    }
    expect(h.userUpdateMock).not.toHaveBeenCalled();
  });

  it("looks up token by hash not raw token", async () => {
    h.emailVerificationFindUniqueMock.mockResolvedValue({
      id: "evt-1",
      userId: "u1",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      usedAt: null,
    });
    h.emailVerificationUpdateManyMock.mockResolvedValue({ count: 1 });

    await confirmEmailVerification({ token: RAW_TOKEN });

    expect(h.emailVerificationFindUniqueMock).toHaveBeenCalledWith({
      where: { tokenHash: TOKEN_HASH },
      select: expect.any(Object),
    });
  });
});
