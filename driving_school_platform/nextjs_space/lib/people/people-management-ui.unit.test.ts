import { describe, expect, it } from "vitest";
import {
  ADVANCED_ACCOUNTS_SECTION,
  PEOPLE_L1_TAB_LABELS,
  PEOPLE_L1_TAB_VALUES,
  PEOPLE_PAGE_HEADER_DESCRIPTION,
  getAppAccountApprovalLabel,
  getAppAccountLinkLabel,
  getAppAccountLinkStatus,
} from "@/lib/people/people-management-ui";

describe("people-management-ui", () => {
  it("exposes only Students and Instructors as L1 tabs", () => {
    expect(PEOPLE_L1_TAB_VALUES).toEqual(["students", "instructors"]);
    expect(PEOPLE_L1_TAB_VALUES).not.toContain("app-accounts");
    expect(PEOPLE_L1_TAB_LABELS).toEqual({
      students: "Students",
      instructors: "Instructors",
    });
  });

  it("defines Advanced accounts as collapsed read-only diagnostics", () => {
    expect(ADVANCED_ACCOUNTS_SECTION.title).toBe("Advanced accounts");
    expect(ADVANCED_ACCOUNTS_SECTION.defaultOpen).toBe(false);
    expect(ADVANCED_ACCOUNTS_SECTION.description).toContain("for diagnostics");
    expect(ADVANCED_ACCOUNTS_SECTION.description).toContain(
      "Profiles and Onboarding",
    );
  });

  it("frames People header around students/instructors, not app accounts", () => {
    expect(PEOPLE_PAGE_HEADER_DESCRIPTION).toContain(
      "students and instructors",
    );
    expect(PEOPLE_PAGE_HEADER_DESCRIPTION).toContain("advanced diagnostics");
    expect(PEOPLE_PAGE_HEADER_DESCRIPTION.toLowerCase()).not.toContain(
      "app accounts tab",
    );
  });

  it("derives linked/unlinked diagnostics from existing profile relations", () => {
    expect(
      getAppAccountLinkStatus({ role: "STUDENT", student: { id: "s1" } }),
    ).toBe("linked");
    expect(getAppAccountLinkStatus({ role: "STUDENT", student: null })).toBe(
      "unlinked",
    );
    expect(
      getAppAccountLinkStatus({
        role: "INSTRUCTOR",
        instructor: { id: "i1" },
      }),
    ).toBe("linked");
    expect(
      getAppAccountLinkStatus({ role: "INSTRUCTOR", instructor: null }),
    ).toBe("unlinked");
    expect(getAppAccountLinkLabel("linked")).toBe("Linked profile");
    expect(getAppAccountLinkLabel("unlinked")).toBe("Unlinked account");
    expect(getAppAccountApprovalLabel(true)).toBe("Approved");
    expect(getAppAccountApprovalLabel(false)).toBe("Pending approval");
  });
});
