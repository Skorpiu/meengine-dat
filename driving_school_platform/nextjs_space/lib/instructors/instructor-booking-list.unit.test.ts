import { describe, expect, it } from "vitest";
import {
  formatInstructorLicenseExpiryForBooking,
  mapInstructorUserToBookingListItem,
  mapInstructorUsersToBookingList,
} from "./instructor-booking-list";

describe("formatInstructorLicenseExpiryForBooking", () => {
  it("formats Date to YYYY-MM-DD", () => {
    expect(
      formatInstructorLicenseExpiryForBooking(
        new Date("2030-12-31T12:00:00.000Z"),
      ),
    ).toBe("2030-12-31");
  });

  it("returns null for missing or invalid values", () => {
    expect(formatInstructorLicenseExpiryForBooking(null)).toBeNull();
    expect(formatInstructorLicenseExpiryForBooking("not-a-date")).toBeNull();
  });
});

describe("mapInstructorUserToBookingListItem", () => {
  const baseUser = {
    id: "user-inst-1",
    firstName: "Smoke",
    lastName: "Instructor",
    email: "instructor@example.com",
    instructor: {
      isAvailableForBooking: true,
      instructorLicenseExpiry: new Date("2030-12-31T00:00:00.000Z"),
      qualifiedCategories: [{ name: "B" }, { name: "A1" }],
    },
  };

  it("omits booking metadata when includeBookingMetadata is false", () => {
    const item = mapInstructorUserToBookingListItem(baseUser, {
      includeBookingMetadata: false,
    });

    expect(item.qualifiedCategoryNames).toBeUndefined();
    expect(item.instructorLicenseExpiry).toBeUndefined();
    expect(item.isAvailableForBooking).toBe(true);
  });

  it("includes qualified categories and license expiry when forBooking metadata requested", () => {
    const item = mapInstructorUserToBookingListItem(baseUser, {
      includeBookingMetadata: true,
    });

    expect(item.qualifiedCategoryNames).toEqual(["B", "A1"]);
    expect(item.instructorLicenseExpiry).toBe("2030-12-31");
  });

  it("returns empty qualified categories when instructor has none linked", () => {
    const item = mapInstructorUserToBookingListItem(
      {
        ...baseUser,
        instructor: {
          isAvailableForBooking: true,
          instructorLicenseExpiry: new Date("2030-12-31T00:00:00.000Z"),
          qualifiedCategories: [],
        },
      },
      { includeBookingMetadata: true },
    );

    expect(item.qualifiedCategoryNames).toEqual([]);
  });
});

describe("mapInstructorUsersToBookingList", () => {
  it("maps all rows with booking metadata", () => {
    const items = mapInstructorUsersToBookingList(
      [
        {
          id: "user-1",
          firstName: "A",
          lastName: "B",
          email: "a@example.com",
          instructor: {
            isAvailableForBooking: true,
            qualifiedCategories: [{ name: "B" }],
          },
        },
      ],
      { includeBookingMetadata: true },
    );

    expect(items).toHaveLength(1);
    expect(items[0]?.qualifiedCategoryNames).toEqual(["B"]);
  });
});
