import { describe, it, expect } from "vitest";
import {
  addMinutesToTime,
  MANUAL_PRACTICAL_LESSON_DEFAULT_DURATION_MINUTES,
} from "./manual-practical-lesson-validation";

describe("manual-practical-lesson-validation", () => {
  it("addMinutesToTime computes end time for default duration", () => {
    expect(
      addMinutesToTime(
        "10:00",
        MANUAL_PRACTICAL_LESSON_DEFAULT_DURATION_MINUTES,
      ),
    ).toBe("11:00");
  });

  it("addMinutesToTime wraps within same day modulo 24h", () => {
    expect(addMinutesToTime("23:30", 60)).toBe("00:30");
  });
});
