import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as emailService from "@/lib/email/email-service";
import * as invitationEmailTemplate from "@/lib/email/templates/invitation-email";
import {
  attemptInvitationEmailDelivery,
  mapSendEmailResultToDelivery,
} from "./invitation-email-delivery";

const invitation = {
  id: "inv-1",
  studentId: null,
  email: "student@school.test",
  role: "STUDENT" as const,
  status: "PENDING" as const,
  expiresAt: "2026-05-28T12:00:00.000Z",
  acceptedAt: null,
  revokedAt: null,
  createdAt: "2026-05-21T12:00:00.000Z",
  updatedAt: "2026-05-21T12:00:00.000Z",
  createdBy: {
    id: "admin-1",
    email: "admin@school.test",
    firstName: "Ada",
    lastName: "Min",
  },
  acceptedUser: null,
};

const testInviteLink =
  "https://demo.example.test/invitations/accept?token=test-token";

describe("attemptInvitationEmailDelivery", () => {
  const originalProvider = process.env.EMAIL_PROVIDER;
  let sendEmailSpy: ReturnType<typeof vi.spyOn>;
  let buildInvitationEmailSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    delete process.env.EMAIL_PROVIDER;
    sendEmailSpy = vi.spyOn(emailService, "sendEmail");
    buildInvitationEmailSpy = vi.spyOn(
      invitationEmailTemplate,
      "buildInvitationEmail",
    );
  });

  afterEach(() => {
    sendEmailSpy.mockRestore();
    buildInvitationEmailSpy.mockRestore();
    if (originalProvider === undefined) {
      delete process.env.EMAIL_PROVIDER;
    } else {
      process.env.EMAIL_PROVIDER = originalProvider;
    }
  });

  it("builds template then calls sendEmail with template fields (noop)", async () => {
    const delivery = await attemptInvitationEmailDelivery({
      inviteLink: testInviteLink,
      invitation,
      organizationName: "Demo School",
    });

    expect(buildInvitationEmailSpy).toHaveBeenCalledWith({
      inviteLink: testInviteLink,
      organizationName: "Demo School",
      role: "STUDENT",
      expiresAt: new Date("2026-05-28T12:00:00.000Z"),
      invitedEmail: "student@school.test",
      invitedByName: "Ada Min",
      appName: undefined,
    });

    const template = buildInvitationEmailSpy.mock.results[0]?.value;
    expect(sendEmailSpy).toHaveBeenCalledWith({
      to: "student@school.test",
      subject: template.subject,
      html: template.html,
      text: template.text,
      tags: ["invitation"],
    });

    expect(delivery).toEqual({
      attempted: true,
      ok: true,
      provider: "noop",
      noop: true,
    });
    expect(sendEmailSpy.mock.invocationCallOrder[0]).toBeGreaterThan(
      buildInvitationEmailSpy.mock.invocationCallOrder[0]!,
    );
  });

  it("maps resend env to PROVIDER_NOT_IMPLEMENTED without throwing", async () => {
    process.env.EMAIL_PROVIDER = "resend";
    delete process.env.POSTMARK_SERVER_TOKEN;
    delete process.env.POSTMARK_FROM_EMAIL;

    const delivery = await attemptInvitationEmailDelivery({
      inviteLink: testInviteLink,
      invitation,
      organizationName: "Demo School",
    });

    expect(delivery).toEqual({
      attempted: true,
      ok: false,
      provider: "resend",
      errorCode: "PROVIDER_NOT_IMPLEMENTED",
    });
    expect(delivery).not.toHaveProperty("message");
  });

  it("maps postmark misconfiguration to PROVIDER_MISCONFIGURED without throwing", async () => {
    process.env.EMAIL_PROVIDER = "postmark";
    delete process.env.POSTMARK_SERVER_TOKEN;
    delete process.env.POSTMARK_FROM_EMAIL;

    const delivery = await attemptInvitationEmailDelivery({
      inviteLink: testInviteLink,
      invitation,
      organizationName: "Demo School",
    });

    expect(delivery).toEqual({
      attempted: true,
      ok: false,
      provider: "postmark",
      errorCode: "PROVIDER_MISCONFIGURED",
    });
  });

  it("maps unknown env to PROVIDER_UNKNOWN", async () => {
    process.env.EMAIL_PROVIDER = "mailgun";

    const delivery = await attemptInvitationEmailDelivery({
      inviteLink: testInviteLink,
      invitation,
      organizationName: "Demo School",
    });

    expect(delivery).toEqual({
      attempted: true,
      ok: false,
      provider: "noop",
      errorCode: "PROVIDER_UNKNOWN",
    });
  });

  it("returns EMAIL_DELIVERY_FAILED when sendEmail throws", async () => {
    sendEmailSpy.mockRejectedValue(new Error("provider network failure"));

    const delivery = await attemptInvitationEmailDelivery({
      inviteLink: testInviteLink,
      invitation,
      organizationName: "Demo School",
    });

    expect(delivery).toEqual({
      attempted: true,
      ok: false,
      provider: "noop",
      errorCode: "EMAIL_DELIVERY_FAILED",
    });
    expect(delivery).not.toHaveProperty("message");
  });

  it("returns EMAIL_DELIVERY_FAILED when buildInvitationEmail throws", async () => {
    buildInvitationEmailSpy.mockImplementation(() => {
      throw new Error("template build failure");
    });

    const delivery = await attemptInvitationEmailDelivery({
      inviteLink: testInviteLink,
      invitation,
      organizationName: "Demo School",
    });

    expect(delivery).toEqual({
      attempted: true,
      ok: false,
      provider: "noop",
      errorCode: "EMAIL_DELIVERY_FAILED",
    });
    expect(sendEmailSpy).not.toHaveBeenCalled();
  });
});

describe("mapSendEmailResultToDelivery", () => {
  it("maps provider errors without message field", () => {
    expect(
      mapSendEmailResultToDelivery({
        ok: false,
        provider: "noop",
        errorCode: "PROVIDER_UNKNOWN",
        message: "sanitized internally only",
      }),
    ).toEqual({
      attempted: true,
      ok: false,
      provider: "noop",
      errorCode: "PROVIDER_UNKNOWN",
    });
  });
});
