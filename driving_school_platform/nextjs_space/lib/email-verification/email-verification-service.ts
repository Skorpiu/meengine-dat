import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/email-service";
import { buildEmailVerificationEmail } from "@/lib/email/templates/email-verification-email";
import {
  buildEmailVerificationUrl,
  calculateEmailVerificationExpiry,
  canUseEmailVerificationToken,
  generateEmailVerificationToken,
  hashEmailVerificationToken,
} from "@/lib/auth/email-verification-token-service";

export const EMAIL_VERIFICATION_GENERIC_SUCCESS_MESSAGE =
  "If an account exists and needs verification, instructions have been sent.";

export type EmailVerificationConfirmErrorCode =
  | "invalid_token"
  | "token_expired"
  | "token_already_used";

export type RequestEmailVerificationInput = {
  email: string;
  baseUrl: string;
};

export type ConfirmEmailVerificationInput = {
  token: string;
};

export type ConfirmEmailVerificationResult =
  | { ok: true; message: string }
  | {
      ok: false;
      error: string;
      code: EmailVerificationConfirmErrorCode;
      status: number;
    };

function normalizeVerificationEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isUserEmailVerified(user: {
  isEmailVerified: boolean;
  emailVerified: Date | null;
}): boolean {
  return user.isEmailVerified || user.emailVerified != null;
}

async function sendEmailVerificationBestEffort(input: {
  to: string;
  verificationLink: string;
  expiresAt: Date;
}): Promise<void> {
  try {
    const template = buildEmailVerificationEmail({
      verificationLink: input.verificationLink,
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
 * Request email verification. Always returns the same generic message (anti-enumeration).
 */
export async function requestEmailVerification(
  input: RequestEmailVerificationInput,
): Promise<{ message: string }> {
  const email = normalizeVerificationEmail(input.email);

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      isEmailVerified: true,
      emailVerified: true,
    },
  });

  if (!user || isUserEmailVerified(user)) {
    return { message: EMAIL_VERIFICATION_GENERIC_SUCCESS_MESSAGE };
  }

  const rawToken = generateEmailVerificationToken();
  const tokenHash = hashEmailVerificationToken(rawToken);
  const expiresAt = calculateEmailVerificationExpiry();

  await prisma.$transaction(async (tx) => {
    await tx.emailVerificationToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });

    await tx.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });
  });

  const verificationLink = buildEmailVerificationUrl({
    baseUrl: input.baseUrl,
    token: rawToken,
  });

  await sendEmailVerificationBestEffort({
    to: user.email,
    verificationLink,
    expiresAt,
  });

  return { message: EMAIL_VERIFICATION_GENERIC_SUCCESS_MESSAGE };
}

export async function confirmEmailVerification(
  input: ConfirmEmailVerificationInput,
): Promise<ConfirmEmailVerificationResult> {
  const token = input.token.trim();
  if (!token) {
    return {
      ok: false,
      error: "Invalid or expired verification link",
      code: "invalid_token",
      status: 400,
    };
  }

  const tokenHash = hashEmailVerificationToken(token);

  const record = await prisma.emailVerificationToken.findUnique({
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
      error: "Invalid or expired verification link",
      code: "invalid_token",
      status: 400,
    };
  }

  const usable = canUseEmailVerificationToken({
    usedAt: record.usedAt,
    expiresAt: record.expiresAt,
  });

  if (!usable.allowed) {
    if (usable.reason === "already_used") {
      return {
        ok: false,
        error: "This verification link has already been used",
        code: "token_already_used",
        status: 400,
      };
    }
    return {
      ok: false,
      error: "This verification link has expired",
      code: "token_expired",
      status: 400,
    };
  }

  const txResult = await prisma.$transaction(async (tx) => {
    const consumed = await tx.emailVerificationToken.updateMany({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });

    if (consumed.count === 0) {
      const current = await tx.emailVerificationToken.findUnique({
        where: { tokenHash },
        select: { usedAt: true, expiresAt: true },
      });

      if (!current) {
        return {
          ok: false as const,
          error: "Invalid or expired verification link",
          code: "invalid_token" as const,
          status: 400,
        };
      }

      if (current.usedAt) {
        return {
          ok: false as const,
          error: "This verification link has already been used",
          code: "token_already_used" as const,
          status: 400,
        };
      }

      return {
        ok: false as const,
        error: "This verification link has expired",
        code: "token_expired" as const,
        status: 400,
      };
    }

    const verifiedAt = new Date();

    await tx.user.update({
      where: { id: record.userId },
      data: {
        isEmailVerified: true,
        emailVerified: verifiedAt,
      },
    });

    await tx.emailVerificationToken.updateMany({
      where: {
        userId: record.userId,
        usedAt: null,
        id: { not: record.id },
      },
      data: { usedAt: verifiedAt },
    });

    return { ok: true as const };
  });

  if (!txResult.ok) {
    return txResult;
  }

  return {
    ok: true,
    message: "Your email has been verified. You can sign in.",
  };
}
