import { describe, expect, it } from "vitest";
import {
  PEOPLE_L1_TAB_LABELS,
  PEOPLE_L1_TAB_VALUES,
  PEOPLE_PAGE_HEADER_DESCRIPTION,
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

  it("frames People header around students and instructors only", () => {
    expect(PEOPLE_PAGE_HEADER_DESCRIPTION).toContain(
      "students and instructors",
    );
    expect(PEOPLE_PAGE_HEADER_DESCRIPTION.toLowerCase()).not.toContain(
      "advanced diagnostics",
    );
    expect(PEOPLE_PAGE_HEADER_DESCRIPTION.toLowerCase()).not.toContain(
      "app accounts tab",
    );
  });
});
