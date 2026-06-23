import { describe, it, expect } from "vitest";
import {
  filterInstructorRecordUsers,
  filterInstructorRecordUsersBySearch,
  formatInstructorLicenseExpiry,
  formatInstructorProfileContactLine,
  getInstructorAppAccessSectionTheme,
  getInstructorAppAccountStatusLabel,
  getInstructorEditAppAccessStatusBadge,
  getInstructorPeopleStatusBadge,
  getInstructorProfileAppAccountSubtitle,
  getInstructorRecordDisplayName,
  hasOperationalInstructorRecord,
  isInstructorProfileInactive,
  matchesInstructorRecordSearch,
} from "./instructor-record-ui-utils";
import { PEOPLE_APP_ACCESS_SECTION_THEME } from "@/lib/people/people-app-access-ui-theme";
import type { InstructorRecordUserDto } from "./instructor-record-ui-types";

const baseInstructor = (
  overrides: Partial<InstructorRecordUserDto> = {},
): InstructorRecordUserDto => ({
  id: "user-1",
  email: "inst@school.test",
  firstName: "Ana",
  lastName: "Silva",
  phoneNumber: "+351912000000",
  role: "INSTRUCTOR",
  isApproved: true,
  instructor: {
    id: "inst-1",
    instructorLicenseNumber: "LIC-001",
    instructorLicenseExpiry: "2027-06-15",
  },
  ...overrides,
});

describe("filterInstructorRecordUsers", () => {
  it("returns only INSTRUCTOR role users", () => {
    const users: InstructorRecordUserDto[] = [
      baseInstructor(),
      { ...baseInstructor(), id: "user-2", role: "STUDENT" },
    ];
    expect(filterInstructorRecordUsers(users)).toHaveLength(1);
    expect(filterInstructorRecordUsers(users)[0].id).toBe("user-1");
  });
});

describe("getInstructorRecordDisplayName", () => {
  it("joins first and last name", () => {
    expect(getInstructorRecordDisplayName(baseInstructor())).toBe("Ana Silva");
  });

  it("falls back to email", () => {
    expect(
      getInstructorRecordDisplayName(
        baseInstructor({ firstName: "", lastName: "" }),
      ),
    ).toBe("inst@school.test");
  });
});

describe("formatInstructorLicenseExpiry", () => {
  it("formats valid ISO date", () => {
    expect(formatInstructorLicenseExpiry("2027-06-15")).not.toBe("—");
  });

  it("returns em dash for invalid", () => {
    expect(formatInstructorLicenseExpiry("not-a-date")).toBe("—");
  });
});

describe("getInstructorAppAccountStatusLabel", () => {
  it("maps approval state", () => {
    expect(getInstructorAppAccountStatusLabel(true)).toBe("App access active");
    expect(getInstructorAppAccountStatusLabel(false)).toBe(
      "App access pending approval",
    );
  });
});

describe("matchesInstructorRecordSearch", () => {
  it("matches name, email, and license number", () => {
    const user = baseInstructor();
    expect(matchesInstructorRecordSearch(user, "ana")).toBe(true);
    expect(matchesInstructorRecordSearch(user, "inst@school")).toBe(true);
    expect(matchesInstructorRecordSearch(user, "lic-001")).toBe(true);
    expect(matchesInstructorRecordSearch(user, "unknown")).toBe(false);
  });
});

describe("filterInstructorRecordUsersBySearch", () => {
  it("returns all instructors when search is empty", () => {
    const users = [baseInstructor(), baseInstructor({ id: "user-2" })];
    expect(filterInstructorRecordUsersBySearch(users, "")).toHaveLength(2);
  });

  it("filters by search query", () => {
    const users = [
      baseInstructor(),
      baseInstructor({ id: "user-2", email: "other@school.test" }),
    ];
    expect(filterInstructorRecordUsersBySearch(users, "other@")).toHaveLength(
      1,
    );
  });
});

describe("hasOperationalInstructorRecord", () => {
  it("is true when license fields exist", () => {
    expect(hasOperationalInstructorRecord(baseInstructor())).toBe(true);
  });

  it("is false for INVITE-PENDING placeholder license numbers", () => {
    expect(
      hasOperationalInstructorRecord(
        baseInstructor({
          instructor: {
            ...baseInstructor().instructor!,
            instructorLicenseNumber: "INVITE-PENDING-cmqqq1l1",
          },
        }),
      ),
    ).toBe(false);
  });

  it("is false without instructor row", () => {
    expect(
      hasOperationalInstructorRecord(baseInstructor({ instructor: null })),
    ).toBe(false);
  });
});

describe("getInstructorPeopleStatusBadge", () => {
  it("shows Inactive with secondary variant (Vehicles convention)", () => {
    const badge = getInstructorPeopleStatusBadge(
      baseInstructor({
        isApproved: false,
        instructor: {
          ...baseInstructor().instructor!,
          isAvailableForBooking: false,
        },
      }),
    );
    expect(badge.label).toBe("Inactive");
    expect(badge.variant).toBe("secondary");
  });

  it("shows Active with default variant (Vehicles convention)", () => {
    const badge = getInstructorPeopleStatusBadge(
      baseInstructor({
        isApproved: true,
        instructor: {
          ...baseInstructor().instructor!,
          isAvailableForBooking: true,
        },
      }),
    );
    expect(badge.label).toBe("Active");
    expect(badge.variant).toBe("default");
    expect(badge.className).toBeUndefined();
  });

  it("shows pending approval with default variant (Students app-access convention)", () => {
    const badge = getInstructorPeopleStatusBadge(
      baseInstructor({
        isApproved: false,
        instructor: {
          ...baseInstructor().instructor!,
          isAvailableForBooking: true,
        },
      }),
    );
    expect(badge.label).toBe("App access pending approval");
    expect(badge.variant).toBe("default");
  });

  it("isInstructorProfileInactive reflects booking flag", () => {
    expect(
      isInstructorProfileInactive(
        baseInstructor({
          instructor: {
            ...baseInstructor().instructor!,
            isAvailableForBooking: false,
          },
        }),
      ),
    ).toBe(true);
  });
});

describe("getInstructorAppAccessSectionTheme", () => {
  it("uses shared blue theme matching Edit Student App access", () => {
    expect(getInstructorAppAccessSectionTheme()).toEqual(
      PEOPLE_APP_ACCESS_SECTION_THEME,
    );
  });
});

describe("getInstructorProfileAppAccountSubtitle", () => {
  it("returns linked when active and approved", () => {
    expect(getInstructorProfileAppAccountSubtitle(baseInstructor())).toBe(
      "App account linked",
    );
  });

  it("returns awaiting approval when not approved but available for booking", () => {
    expect(
      getInstructorProfileAppAccountSubtitle(
        baseInstructor({
          isApproved: false,
          instructor: {
            ...baseInstructor().instructor!,
            isAvailableForBooking: true,
          },
        }),
      ),
    ).toBe("App account awaiting approval");
  });

  it("returns inactive when deactivated", () => {
    expect(
      getInstructorProfileAppAccountSubtitle(
        baseInstructor({
          isApproved: false,
          instructor: {
            ...baseInstructor().instructor!,
            isAvailableForBooking: false,
          },
        }),
      ),
    ).toBe("App account inactive");
  });
});

describe("formatInstructorProfileContactLine", () => {
  it("joins phone and app-account subtitle", () => {
    expect(formatInstructorProfileContactLine(baseInstructor())).toBe(
      "+351912000000 · App account linked",
    );
  });

  it("uses No phone when phone is empty", () => {
    expect(
      formatInstructorProfileContactLine(baseInstructor({ phoneNumber: null })),
    ).toBe("No phone · App account linked");
  });
});

describe("getInstructorEditAppAccessStatusBadge", () => {
  it("matches Edit Student approved/pending labels and variants", () => {
    expect(
      getInstructorEditAppAccessStatusBadge(
        baseInstructor({ isApproved: true }),
      ),
    ).toMatchObject({
      label: "Approved — can sign in",
      variant: "secondary",
    });
    expect(
      getInstructorEditAppAccessStatusBadge(
        baseInstructor({
          isApproved: false,
          instructor: {
            ...baseInstructor().instructor!,
            isAvailableForBooking: true,
          },
        }),
      ),
    ).toMatchObject({
      label: "Pending approval",
      variant: "default",
    });
  });

  it("uses Inactive secondary badge when deactivated", () => {
    expect(
      getInstructorEditAppAccessStatusBadge(
        baseInstructor({
          isApproved: false,
          instructor: {
            ...baseInstructor().instructor!,
            isAvailableForBooking: false,
          },
        }),
      ),
    ).toMatchObject({
      label: "Inactive",
      variant: "secondary",
    });
  });
});
