import { describe, expect, it } from "vitest";

import {
  buildInvitationEmail,
  formatInvitationEmailExpiry,
  invitationEmailRoleLabel,
} from "./invitation-email";

/** Fake invite URL for tests — not a production secret. */
export const INVITATION_EMAIL_TEST_LINK =
  "https://demo.example.test/invitations/accept?token=test-token";

const baseInput = {
  inviteLink: INVITATION_EMAIL_TEST_LINK,
  organizationName: "Demo Driving School",
  role: "STUDENT" as const,
  expiresAt: new Date("2026-06-15T14:30:00.000Z"),
  invitedEmail: "new.student@demo.example.test",
  invitedByName: "Alex Admin",
  appName: "Driving Academy Tool",
};

describe("buildInvitationEmail", () => {
  it("returns stable subject without token or invite URL", () => {
    const result = buildInvitationEmail(baseInput);

    expect(result.subject).toBe(
      "Invitation to join Demo Driving School on Driving Academy Tool",
    );
    expect(result.subject).not.toContain("test-token");
    expect(result.subject).not.toContain("demo.example.test");
    expect(result.subject).not.toContain(INVITATION_EMAIL_TEST_LINK);
  });

  it("includes organization, role label, CTA link, and full invite link in html", () => {
    const result = buildInvitationEmail(baseInput);

    expect(result.html).toContain("Demo Driving School");
    expect(result.html).toContain("Student");
    expect(result.html).toContain(
      'href="https://demo.example.test/invitations/accept?token=test-token"',
    );
    expect(result.html).toContain("Accept invitation");
    expect(result.html).toContain(INVITATION_EMAIL_TEST_LINK);
    expect(result.tags).toEqual(["invitation"]);
  });

  it("includes invite link and essential copy in text", () => {
    const result = buildInvitationEmail(baseInput);

    expect(result.text).toContain(INVITATION_EMAIL_TEST_LINK);
    expect(result.text).toContain("Demo Driving School");
    expect(result.text).toContain("Student");
    expect(result.text).toContain("new.student@demo.example.test");
    expect(result.text).toContain("Invited by Alex Admin.");
    expect(result.text).toContain("ignore this email");
  });

  it("formats expiresAt legibly (UTC)", () => {
    const result = buildInvitationEmail(baseInput);
    const expected = formatInvitationEmailExpiry(baseInput.expiresAt);

    expect(expected).toBe("Jun 15, 2026, 2:30 PM");
    expect(result.html).toContain(expected);
    expect(result.text).toContain(expected);
  });

  it("escapes interpolated values in html", () => {
    const result = buildInvitationEmail({
      ...baseInput,
      organizationName: '<img src=x onerror="alert(1)">',
      invitedEmail: 'evil@example"><test.com',
      invitedByName: "O'Brien & Co",
      role: "INSTRUCTOR",
    });

    expect(result.html).not.toContain('<img src=x onerror="alert(1)">');
    expect(result.html).toContain("&lt;img src=x onerror=");
    expect(result.html).toContain("Instructor");
    expect(result.html).toContain("O&#39;Brien &amp; Co");
    expect(result.html).toContain("evil@example&quot;&gt;&lt;test.com");
  });

  it("uses default app name when appName is omitted", () => {
    const { appName: _omit, ...withoutAppName } = baseInput;
    const result = buildInvitationEmail(withoutAppName);

    expect(result.subject).toContain("Driving Academy Tool");
    expect(result.html).toContain("Driving Academy Tool");
  });

  it("maps invitation roles to readable labels", () => {
    expect(invitationEmailRoleLabel("STUDENT")).toBe("Student");
    expect(invitationEmailRoleLabel("INSTRUCTOR")).toBe("Instructor");
  });
});
