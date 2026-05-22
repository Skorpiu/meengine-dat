import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/email-service";
import { buildPasswordResetEmail } from "@/lib/email/templates/password-reset-email";
import {
  buildPasswordResetUrl,
  calculatePasswordResetExpiry,
  canUsePasswordResetToken,
  generatePasswordResetToken,
  hashPasswordResetToken,
} from "@/lib/auth/password-reset-token-service";
import { commonSchemas } from "@/lib/validation";

const BCRYPT_COST = 12;

export const PASSWORD_RESET_GENERIC_SUCCESS_MESSAGE =
  "If an account exists, reset instructions have been sent.";

export type PasswordResetConfirmErrorCode =
  | "invalid_token"
  | "token_expired"
  | "token_already_used"
  | "weak_password";

export type RequestPasswordResetInput = {
  email: string;
  baseUrl: string;
};

export type ConfirmPasswordResetInput = {
  token: string;
  newPassword: string;
};

export type ConfirmPasswordResetResult =
  | { ok: true; message: string }
  | {
      ok: false;
      error: string;
      code: PasswordResetConfirmErrorCode;
      status: number;
    };

function normalizeResetEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function sendPasswordResetEmailBestEffort(input: {
  to: string;
  resetLink: string;
  expiresAt: Date;
}): Promise<void> {
  try {
    const template = buildPasswordResetEmail({
      resetLink: input.resetLink,
      expiresAt: input.expiresAt,
      recipientEmail: input.to,
    });

    await sendEmail({
      to: input.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
      tags: [...template.tags],
    });
  } catch {
    // Never reveal account existence or delivery failures to the client.
  }
}

/**
 * Request password reset. Always returns the same generic message (anti-enumeration).
 */
export async function requestPasswordReset(
  input: RequestPasswordResetInput,
): Promise<{ message: string }> {
  const email = normalizeResetEmail(input.email);

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
    },
  });

  if (!user?.passwordHash) {
    return { message: PASSWORD_RESET_GENERIC_SUCCESS_MESSAGE };
  }

  const rawToken = generatePasswordResetToken();
  const tokenHash = hashPasswordResetToken(rawToken);
  const expiresAt = calculatePasswordResetExpiry();

  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });

    await tx.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });
  });

  const resetLink = buildPasswordResetUrl({
    baseUrl: input.baseUrl,
    token: rawToken,
  });

  await sendPasswordResetEmailBestEffort({
    to: user.email,
    resetLink,
    expiresAt,
  });

  return { message: PASSWORD_RESET_GENERIC_SUCCESS_MESSAGE };
}

export async function confirmPasswordReset(
  input: ConfirmPasswordResetInput,
): Promise<ConfirmPasswordResetResult> {
  const passwordCheck = commonSchemas.password.safeParse(input.newPassword);
  if (!passwordCheck.success) {
    return {
      ok: false,
      error: passwordCheck.error.errors[0]?.message ?? "Invalid password",
      code: "weak_password",
      status: 400,
    };
  }

  const token = input.token.trim();
  if (!token) {
    return {
      ok: false,
      error: "Invalid or expired reset link",
      code: "invalid_token",
      status: 400,
    };
  }

  const tokenHash = hashPasswordResetToken(token);

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      usedAt: true,
    },
  });

  if (!record) {
    return {
      ok: false,
      error: "Invalid or expired reset link",
      code: "invalid_token",
      status: 400,
    };
  }

  const usable = canUsePasswordResetToken({
    usedAt: record.usedAt,
    expiresAt: record.expiresAt,
  });

  if (!usable.allowed) {
    if (usable.reason === "already_used") {
      return {
        ok: false,
        error: "This reset link has already been used",
        code: "token_already_used",
        status: 400,
      };
    }
    return {
      ok: false,
      error: "This reset link has expired",
      code: "token_expired",
      status: 400,
    };
  }

  const txResult = await prisma.$transaction(async (tx) => {
    const consumed = await tx.passwordResetToken.updateMany({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });

    if (consumed.count === 0) {
      const current = await tx.passwordResetToken.findUnique({
        where: { tokenHash },
        select: { usedAt: true, expiresAt: true },
      });

      if (!current) {
        return {
          ok: false as const,
          error: "Invalid or expired reset link",
          code: "invalid_token" as const,
          status: 400,
        };
      }

      if (current.usedAt) {
        return {
          ok: false as const,
          error: "This reset link has already been used",
          code: "token_already_used" as const,
          status: 400,
        };
      }

      return {
        ok: false as const,
        error: "This reset link has expired",
        code: "token_expired" as const,
        status: 400,
      };
    }

    const passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_COST);

    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });

    await tx.passwordResetToken.updateMany({
      where: {
        userId: record.userId,
        usedAt: null,
        id: { not: record.id },
      },
      data: { usedAt: new Date() },
    });

    return { ok: true as const };
  });

  if (!txResult.ok) {
    return txResult;
  }

  return {
    ok: true,
    message:
      "Your password has been reset. You can sign in with your new password.",
  };
}
