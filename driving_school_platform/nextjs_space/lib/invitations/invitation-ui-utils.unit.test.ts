import { describe, it, expect } from "vitest";
import {
  filterInvitationsByRole,
  formatInvitationDateTime,
  invitationApiErrorMessage,
  invitationStatusLabel,
} from "./invitation-ui-utils";
import type { InvitationDto } from "./invitation-dto";

describe("filterInvitationsByRole", () => {
  const base = {
    id: "inv-1",
    studentId: null,
    email: "a@example.com",
    status: "PENDING" as const,
    expiresAt: "2026-06-01T00:00:00.000Z",
    acceptedAt: null,
    revokedAt: null,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    createdBy: null,
    acceptedUser: null,
  };

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
