import { describe, expect, it } from "vitest";
import { getStudentProfileOperationalCompactBadges } from "@/lib/students/student-profile-operational-utils";

describe("getStudentProfileOperationalCompactBadges", () => {
  it("returns transmission and category badges for manual profiles", () => {
    const badges = getStudentProfileOperationalCompactBadges({
      category: { name: "B" },
      transmissionType: { name: "Manual" },
    });
    expect(badges.map((b) => b.label)).toEqual(["Manual", "Category B"]);
  });

  it("returns badges for APP_USER profiles from student operational fields", () => {
    const badges = getStudentProfileOperationalCompactBadges({
      category: { name: "B" },
      transmissionType: { name: "Automatic" },
    });
    expect(badges).toHaveLength(2);
    expect(badges[0]?.key).toBe("profile-transmission");
    expect(badges[1]?.key).toBe("profile-category");
  });

  it("returns empty when category and transmission are unset", () => {
    expect(
      getStudentProfileOperationalCompactBadges({
        category: null,
        transmissionType: null,
      }),
    ).toEqual([]);
  });
});
