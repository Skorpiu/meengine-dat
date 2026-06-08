import { describe, expect, it } from "vitest";
import { getPeopleProfileInitials } from "@/lib/people/people-profile-initials";

describe("getPeopleProfileInitials", () => {
  it("returns uppercase initials from first and last name", () => {
    expect(getPeopleProfileInitials("Ana", "Silva")).toBe("AS");
    expect(getPeopleProfileInitials("ana", "silva")).toBe("AS");
  });

  it("trims whitespace before deriving initials", () => {
    expect(getPeopleProfileInitials("  Ana ", " Silva ")).toBe("AS");
  });

  it("uses first initial only when last name is missing", () => {
    expect(getPeopleProfileInitials("Ana", null)).toBe("A");
    expect(getPeopleProfileInitials("Ana", "")).toBe("A");
  });

  it("uses last initial only when first name is missing", () => {
    expect(getPeopleProfileInitials(null, "Silva")).toBe("S");
    expect(getPeopleProfileInitials("", "Silva")).toBe("S");
  });

  it("returns ? when both names are missing or blank", () => {
    expect(getPeopleProfileInitials(null, null)).toBe("?");
    expect(getPeopleProfileInitials("", "")).toBe("?");
    expect(getPeopleProfileInitials("  ", "  ")).toBe("?");
  });
});
