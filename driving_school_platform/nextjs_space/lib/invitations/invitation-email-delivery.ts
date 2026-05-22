import { sendEmail } from "@/lib/email/email-service";
import { buildInvitationEmail } from "@/lib/email/templates/invitation-email";
import type { EmailErrorCode, SendEmailResult } from "@/lib/email/types";
import type { InvitationDto, InvitationUserDisplayDto } from "./invitation-dto";
import type { InvitableUserRole } from "./invitation-policy";

export type InvitationEmailDeliveryErrorCode =
  | EmailErrorCode
  | "EMAIL_DELIVERY_FAILED";

export type InvitationEmailDelivery = {
  attempted: true;
  ok: boolean;
  provider: string;
  noop?: boolean;
  errorCode?: InvitationEmailDeliveryErrorCode;
};

export type AttemptInvitationEmailDeliveryInput = {
  inviteLink: string;
  invitation: InvitationDto;
  organizationName: string;
  appName?: string;
};

function formatInvitedByName(
  createdBy: InvitationUserDisplayDto | null,
): string | null {
  if (!createdBy) return null;
  const name = [createdBy.firstName, createdBy.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || null;
}

export function mapSendEmailResultToDelivery(
  result: SendEmailResult,
): InvitationEmailDelivery {
  if (result.ok) {
    return {
      attempted: true,
      ok: true,
      provider: result.provider,
      ...(result.noop ? { noop: true } : {}),
    };
  }

  return {
    attempted: true,
    ok: false,
    provider: result.provider,
    errorCode: result.errorCode,
  };
}

export function invitationEmailDeliveryFailed(): InvitationEmailDelivery {
  return {
    attempted: true,
    ok: false,
    provider: "noop",
    errorCode: "EMAIL_DELIVERY_FAILED",
  };
}

/**
 * Build invitation email from template and send via email boundary.
 * Never throws — callers treat delivery as best-effort after invite create.
 */
export async function attemptInvitationEmailDelivery(
  input: AttemptInvitationEmailDeliveryInput,
): Promise<InvitationEmailDelivery> {
  try {
    const expiresAt = new Date(input.invitation.expiresAt);
    const role = input.invitation.role as InvitableUserRole;

    const template = buildInvitationEmail({
      inviteLink: input.inviteLink,
      organizationName: input.organizationName,
      role,
      expiresAt,
      invitedEmail: input.invitation.email,
      invitedByName: formatInvitedByName(input.invitation.createdBy),
      appName: input.appName,
    });

    const sendResult = await sendEmail({
      to: input.invitation.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      tags: [...template.tags],
    });

    return mapSendEmailResultToDelivery(sendResult);
  } catch {
    return invitationEmailDeliveryFailed();
  }
}
