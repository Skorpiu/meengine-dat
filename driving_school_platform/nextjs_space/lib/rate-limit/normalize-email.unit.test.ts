import { describe, it, expect } from "vitest";

import { normalizeEmailForRateLimit } from "./normalize-email";

describe("normalizeEmailForRateLimit", () => {
  it("trims and lowercases email", () => {
    expect(normalizeEmailForRateLimit("  User@School.TEST  ")).toBe(
      "user@school.test",
    );
  });
});
