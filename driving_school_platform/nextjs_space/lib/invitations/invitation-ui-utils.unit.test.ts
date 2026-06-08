import { describe, it, expect } from "vitest";
import {
  countLinkedPendingStudentInvitations,
  filterUnlinkedPendingStudentInvitations,
  formatInvitationDateTime,
  getInvitationDisplayStatus,
  getOnboardingVisibleInvitations,
  invitationApiErrorMessage,
  invitationDisplayStatusLabel,
  invitationStatusLabel,
  isInvitationExpiredForDisplay,
  partitionStudentPendingInvitations,
  filterInvitationsByRole,
} from "./invitation-ui-utils";
import type { InvitationDto } from "./invitation-dto";

const baseInvitation = {
  id: "inv-1",
  studentId: null,
  email: "a@example.com",
  status: "PENDING" as const,
  expiresAt: "2099-06-01T00:00:00.000Z",
  acceptedAt: null,
  revokedAt: null,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
  createdBy: null,
  acceptedUser: null,
};

function invitation(
  overrides: Partial<InvitationDto> & Pick<InvitationDto, "id" | "role">,
): InvitationDto {
  return { ...baseInvitation, ...overrides };
}

describe("filterInvitationsByRole", () => {
  const base = baseInvitation;

  it("returns only invitations matching the role", () => {
    const invitations: InvitationDto[] = [
      { ...base, id: "1", role: "STUDENT" },
      { ...base, id: "2", role: "INSTRUCTOR" },
      { ...base, id: "3", role: "STUDENT" },
    ];
    expect(filterInvitationsByRole(invitations, "STUDENT")).toHaveLength(2);
    expect(filterInvitationsByRole(invitations, "INSTRUCTOR")).toHaveLength(1);
  });
});

describe("formatInvitationDateTime", () => {
  it("formats a valid ISO timestamp", () => {
    const formatted = formatInvitationDateTime("2026-05-21T12:00:00.000Z");
    expect(formatted).toContain("2026");
  });

  it("returns input when date is invalid", () => {
    expect(formatInvitationDateTime("not-a-date")).toBe("not-a-date");
  });
});

describe("invitationStatusLabel", () => {
  it("maps known statuses", () => {
    expect(invitationStatusLabel("PENDING")).toBe("Pending");
    expect(invitationStatusLabel("ACCEPTED")).toBe("Accepted");
    expect(invitationStatusLabel("REVOKED")).toBe("Revoked");
  });
});

describe("invitationApiErrorMessage", () => {
  it("maps revoked and expired codes", () => {
    expect(invitationApiErrorMessage("invitation_revoked", "x")).toContain(
      "revoked",
    );
    expect(invitationApiErrorMessage("invitation_expired", "x")).toContain(
      "expired",
    );
    expect(
      invitationApiErrorMessage("invitation_already_accepted", "x"),
    ).toContain("already used");
  });

  it("falls back for unknown codes", () => {
    expect(invitationApiErrorMessage(undefined, "Server error")).toBe(
      "Server error",
    );
  });

  it("maps user_already_exists for admin surface", () => {
    expect(
      invitationApiErrorMessage("user_already_exists", "x", { forAdmin: true }),
    ).toContain("Ask the user to sign in");
  });
});

describe("partitionStudentPendingInvitations", () => {
  it("splits pending student invites by profile link", () => {
    const invitations: InvitationDto[] = [
      invitation({ id: "1", role: "STUDENT", studentId: null }),
      invitation({ id: "2", role: "STUDENT", studentId: "stu-1" }),
      invitation({ id: "3", role: "INSTRUCTOR", studentId: null }),
      invitation({
        id: "4",
        role: "STUDENT",
        studentId: "stu-2",
        status: "REVOKED",
      }),
    ];

    expect(partitionStudentPendingInvitations(invitations)).toEqual({
      linked: [invitations[1]],
      unlinked: [invitations[0]],
    });
  });
});

describe("filterUnlinkedPendingStudentInvitations", () => {
  it("returns only pending student invites without a profile", () => {
    const invitations: InvitationDto[] = [
      invitation({ id: "1", role: "STUDENT", studentId: null }),
      invitation({ id: "2", role: "STUDENT", studentId: "stu-1" }),
    ];

    expect(filterUnlinkedPendingStudentInvitations(invitations)).toEqual([
      invitations[0],
    ]);
    expect(countLinkedPendingStudentInvitations(invitations)).toBe(1);
  });
});

describe("getOnboardingVisibleInvitations", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");

  it("shows unlinked pending students only on student onboarding", () => {
    const invitations: InvitationDto[] = [
      invitation({ id: "1", role: "STUDENT", studentId: null }),
      invitation({ id: "2", role: "STUDENT", studentId: "stu-1" }),
      invitation({ id: "3", role: "INSTRUCTOR", studentId: null }),
    ];

    expect(getOnboardingVisibleInvitations(invitations, "STUDENT")).toEqual([
      invitations[0],
    ]);
  });

  it("keeps all pending instructor invites on instructor onboarding", () => {
    const invitations: InvitationDto[] = [
      invitation({ id: "1", role: "INSTRUCTOR", studentId: null }),
      invitation({ id: "2", role: "STUDENT", studentId: null }),
    ];

    expect(getOnboardingVisibleInvitations(invitations, "INSTRUCTOR")).toEqual([
      invitations[0],
    ]);
  });

  it("includes expired-but-pending rows for revoke UX", () => {
    const expiredUnlinked = invitation({
      id: "exp",
      role: "STUDENT",
      studentId: null,
      expiresAt: "2026-06-01T00:00:00.000Z",
    });

    expect(
      getOnboardingVisibleInvitations([expiredUnlinked], "STUDENT"),
    ).toEqual([expiredUnlinked]);
    expect(getInvitationDisplayStatus(expiredUnlinked, now)).toBe("Expired");
  });
});

describe("getInvitationDisplayStatus", () => {
  const now = new Date("2026-06-15T12:00:00.000Z");

  it("returns Pending for active pending invites", () => {
    expect(
      getInvitationDisplayStatus(
        { status: "PENDING", expiresAt: "2099-01-01T00:00:00.000Z" },
        now,
      ),
    ).toBe("Pending");
  });

  it("returns Expired for pending invites past expiresAt", () => {
    expect(
      getInvitationDisplayStatus(
        { status: "PENDING", expiresAt: "2026-06-01T00:00:00.000Z" },
        now,
      ),
    ).toBe("Expired");
    expect(isInvitationExpiredForDisplay("2026-06-01T00:00:00.000Z", now)).toBe(
      true,
    );
  });

  it("maps stored EXPIRED status to Expired display", () => {
    expect(
      getInvitationDisplayStatus(
        { status: "EXPIRED", expiresAt: "2026-06-01T00:00:00.000Z" },
        now,
      ),
    ).toBe("Expired");
    expect(invitationDisplayStatusLabel("Expired")).toBe("Expired");
  });
});
