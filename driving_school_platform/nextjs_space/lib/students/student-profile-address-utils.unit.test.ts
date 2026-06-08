import { describe, expect, it } from "vitest";
import { resolveStudentProfileAddress } from "@/lib/students/student-profile-address-utils";

describe("resolveStudentProfileAddress", () => {
  it("prefers Student.address over linked User address", () => {
    expect(
      resolveStudentProfileAddress({ address: "Rua Student 1" }, "Rua User 2"),
    ).toBe("Rua Student 1");
  });

  it("falls back to linked User address when Student address is empty", () => {
    expect(resolveStudentProfileAddress({ address: null }, "Rua User 2")).toBe(
      "Rua User 2",
    );
  });

  it("returns empty string when both are unset", () => {
    expect(resolveStudentProfileAddress({ address: null }, null)).toBe("");
  });
});
