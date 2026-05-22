import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const userFindUniqueMock = vi.fn();
  const passwordResetUpdateManyMock = vi.fn();
  const passwordResetCreateMock = vi.fn();
  const passwordResetFindUniqueMock = vi.fn();
  const userUpdateMock = vi.fn();
  const transactionMock = vi.fn();
  const sendEmailMock = vi.fn();
  const bcryptHashMock = vi.fn();

  const prismaMock = {
    user: {
      findUnique: userFindUniqueMock,
      update: userUpdateMock,
    },
    passwordResetToken: {
      updateMany: passwordResetUpdateManyMock,
      create: passwordResetCreateMock,
      findUnique: passwordResetFindUniqueMock,
    },
    $transaction: transactionMock,
  };

  return {
    userFindUniqueMock,
    passwordResetUpdateManyMock,
    passwordResetCreateMock,
    passwordResetFindUniqueMock,
    userUpdateMock,
    transactionMock,
    sendEmailMock,
    bcryptHashMock,
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

vi.mock("bcryptjs", () => ({
  default: {
    hash: h.bcryptHashMock,
  },
}));

import {
  confirmPasswordReset,
  PASSWORD_RESET_GENERIC_SUCCESS_MESSAGE,
  requestPasswordReset,
} from "./password-reset-service";
import { hashPasswordResetToken } from "@/lib/auth/password-reset-token-service";

const RAW_TOKEN = "reset-token-raw-test";
const TOKEN_HASH = hashPasswordResetToken(RAW_TOKEN);

const validPassword = "SecurePass1!";

beforeEach(() => {
  vi.resetAllMocks();
  h.sendEmailMock.mockResolvedValue({ ok: true, provider: "noop", noop: true });
  h.bcryptHashMock.mockResolvedValue("hashed-new-password");
  h.transactionMock.mockImplementation(
    async (fn: (tx: typeof h.prismaMock) => unknown) => fn(h.prismaMock),
  );
  h.passwordResetUpdateManyMock.mockResolvedValue({ count: 0 });
  h.passwordResetCreateMock.mockResolvedValue({ id: "prt-1" });
  h.userUpdateMock.mockResolvedValue({});
});

describe("requestPasswordReset", () => {
  it("returns generic success for unknown email without creating token", async () => {
    h.userFindUniqueMock.mockResolvedValue(null);

    const result = await requestPasswordReset({
      email: "unknown@school.test",
      baseUrl: "https://school.example.com",
    });

    expect(result.message).toBe(PASSWORD_RESET_GENERIC_SUCCESS_MESSAGE);
    expect(h.passwordResetCreateMock).not.toHaveBeenCalled();
    expect(h.sendEmailMock).not.toHaveBeenCalled();
  });

  it("returns generic success for user without passwordHash", async () => {
    h.userFindUniqueMock.mockResolvedValue({
      id: "u1",
      email: "oauth@school.test",
      passwordHash: null,
    });

    const result = await requestPasswordReset({
      email: "oauth@school.test",
      baseUrl: "https://school.example.com",
    });

    expect(result.message).toBe(PASSWORD_RESET_GENERIC_SUCCESS_MESSAGE);
    expect(h.passwordResetCreateMock).not.toHaveBeenCalled();
    expect(h.sendEmailMock).not.toHaveBeenCalled();
  });

  it("creates token hash and calls sendEmail for existing credentials user", async () => {
    h.userFindUniqueMock.mockResolvedValue({
      id: "u1",
      email: "user@school.test",
      passwordHash: "existing-hash",
    });

    const result = await requestPasswordReset({
      email: "  User@School.TEST ",
      baseUrl: "https://school.example.com",
    });

    expect(result.message).toBe(PASSWORD_RESET_GENERIC_SUCCESS_MESSAGE);
    expect(h.passwordResetCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "u1",
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    });
    expect(h.passwordResetCreateMock.mock.calls[0][0].data.tokenHash).not.toBe(
      RAW_TOKEN,
    );

    expect(h.sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@school.test",
        tags: ["password-reset"],
      }),
    );
    const emailArg = h.sendEmailMock.mock.calls[0][0];
    expect(emailArg.html).toContain("/auth/reset-password?token=");
    expect(emailArg.html).not.toContain(
      h.passwordResetCreateMock.mock.calls[0][0].data.tokenHash,
    );
  });

  it("still returns generic success when sendEmail fails", async () => {
    h.userFindUniqueMock.mockResolvedValue({
      id: "u1",
      email: "user@school.test",
      passwordHash: "existing-hash",
    });
    h.sendEmailMock.mockRejectedValue(new Error("provider down"));

    const result = await requestPasswordReset({
      email: "user@school.test",
      baseUrl: "https://school.example.com",
    });

    expect(result.message).toBe(PASSWORD_RESET_GENERIC_SUCCESS_MESSAGE);
  });
});

describe("confirmPasswordReset", () => {
  it("rejects weak password", async () => {
    const result = await confirmPasswordReset({
      token: RAW_TOKEN,
      newPassword: "short",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("weak_password");
    }
    expect(h.passwordResetFindUniqueMock).not.toHaveBeenCalled();
  });

  it("rejects invalid token", async () => {
    h.passwordResetFindUniqueMock.mockResolvedValue(null);

    const result = await confirmPasswordReset({
      token: "bad-token",
      newPassword: validPassword,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("invalid_token");
    }
  });

  it("rejects expired token", async () => {
    h.passwordResetFindUniqueMock.mockResolvedValue({
      id: "prt-1",
      userId: "u1",
      expiresAt: new Date("2020-01-01T00:00:00.000Z"),
      usedAt: null,
    });

    const result = await confirmPasswordReset({
      token: RAW_TOKEN,
      newPassword: validPassword,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("token_expired");
    }
  });

  it("rejects used token", async () => {
    h.passwordResetFindUniqueMock.mockResolvedValue({
      id: "prt-1",
      userId: "u1",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      usedAt: new Date("2026-05-22T10:00:00.000Z"),
    });

    const result = await confirmPasswordReset({
      token: RAW_TOKEN,
      newPassword: validPassword,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("token_already_used");
    }
  });

  it("updates password and atomically consumes token for valid token", async () => {
    h.passwordResetFindUniqueMock.mockResolvedValue({
      id: "prt-1",
      userId: "u1",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      usedAt: null,
    });
    h.passwordResetUpdateManyMock
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const result = await confirmPasswordReset({
      token: RAW_TOKEN,
      newPassword: validPassword,
    });

    expect(result.ok).toBe(true);
    expect(h.bcryptHashMock).toHaveBeenCalledWith(validPassword, 12);
    expect(h.userUpdateMock).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { passwordHash: "hashed-new-password" },
    });
    expect(h.passwordResetUpdateManyMock).toHaveBeenCalledWith({
      where: {
        tokenHash: TOKEN_HASH,
        usedAt: null,
        expiresAt: { gt: expect.any(Date) },
      },
      data: { usedAt: expect.any(Date) },
    });
  });

  it("rejects second use when atomic consume returns count 0 (race)", async () => {
    h.passwordResetFindUniqueMock
      .mockResolvedValueOnce({
        id: "prt-1",
        userId: "u1",
        expiresAt: new Date("2099-01-01T00:00:00.000Z"),
        usedAt: null,
      })
      .mockResolvedValueOnce({
        usedAt: new Date("2026-05-22T12:00:00.000Z"),
        expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      });
    h.passwordResetUpdateManyMock.mockResolvedValue({ count: 0 });

    const result = await confirmPasswordReset({
      token: RAW_TOKEN,
      newPassword: validPassword,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("token_already_used");
    }
    expect(h.userUpdateMock).not.toHaveBeenCalled();
    expect(h.bcryptHashMock).not.toHaveBeenCalled();
  });

  it("looks up token by hash not raw token", async () => {
    h.passwordResetFindUniqueMock.mockResolvedValue({
      id: "prt-1",
      userId: "u1",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      usedAt: null,
    });
    h.passwordResetUpdateManyMock.mockResolvedValue({ count: 1 });

    await confirmPasswordReset({
      token: RAW_TOKEN,
      newPassword: validPassword,
    });

    expect(h.passwordResetFindUniqueMock).toHaveBeenCalledWith({
      where: { tokenHash: TOKEN_HASH },
      select: expect.any(Object),
    });
  });
});
