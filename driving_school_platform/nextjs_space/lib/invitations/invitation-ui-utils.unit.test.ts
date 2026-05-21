import { describe, it, expect } from "vitest";
import {
  formatInvitationDateTime,
  invitationStatusLabel,
} from "./invitation-ui-utils";

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
