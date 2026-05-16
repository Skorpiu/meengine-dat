import { describe, it, expect } from "vitest";
import {
  SCHEDULE_MAP_LESSON_TYPE_COLOR_CLASSES,
  getScheduleLessonTypeColorClasses,
  getScheduleLessonTypeShortLabel,
  getScheduleMapChipLines,
  getScheduleMapLessonColorClasses,
} from "./schedule-map-card";

describe("schedule-map-card", () => {
  describe("getScheduleLessonTypeShortLabel", () => {
    it("THEORY uses theory lesson label", () => {
      expect(getScheduleLessonTypeShortLabel("THEORY")).toBe("Theory");
    });

    it("DRIVING uses driving lesson label", () => {
      expect(getScheduleLessonTypeShortLabel("DRIVING")).toBe("Drive");
    });

    it("THEORY_EXAM uses theoretical exam label", () => {
      expect(getScheduleLessonTypeShortLabel("THEORY_EXAM")).toBe("Th. exam");
    });

    it("EXAM uses practical exam label", () => {
      expect(getScheduleLessonTypeShortLabel("EXAM")).toBe("Exam");
    });
  });

  describe("getScheduleLessonTypeColorClasses", () => {
    it("THEORY uses green classes", () => {
      expect(getScheduleLessonTypeColorClasses("THEORY")).toBe(
        SCHEDULE_MAP_LESSON_TYPE_COLOR_CLASSES.THEORY,
      );
      expect(getScheduleLessonTypeColorClasses("THEORY")).toContain("green");
    });

    it("DRIVING uses blue classes", () => {
      expect(getScheduleLessonTypeColorClasses("DRIVING")).toBe(
        SCHEDULE_MAP_LESSON_TYPE_COLOR_CLASSES.DRIVING,
      );
      expect(getScheduleLessonTypeColorClasses("DRIVING")).toContain("blue");
    });

    it("THEORY_EXAM uses yellow classes", () => {
      expect(getScheduleLessonTypeColorClasses("THEORY_EXAM")).toBe(
        SCHEDULE_MAP_LESSON_TYPE_COLOR_CLASSES.THEORY_EXAM,
      );
      expect(getScheduleLessonTypeColorClasses("THEORY_EXAM")).toContain(
        "yellow",
      );
    });

    it("EXAM uses orange classes", () => {
      expect(getScheduleLessonTypeColorClasses("EXAM")).toBe(
        SCHEDULE_MAP_LESSON_TYPE_COLOR_CLASSES.EXAM,
      );
      expect(getScheduleLessonTypeColorClasses("EXAM")).toContain("orange");
    });

    it("THEORY_EXAM and EXAM use distinct colors", () => {
      expect(getScheduleLessonTypeColorClasses("THEORY_EXAM")).not.toBe(
        getScheduleLessonTypeColorClasses("EXAM"),
      );
    });
  });

  describe("getScheduleMapLessonColorClasses", () => {
    it("COMPLETED status overrides type color", () => {
      expect(
        getScheduleMapLessonColorClasses({
          lessonType: "EXAM",
          status: "COMPLETED",
        }),
      ).toContain("green");
    });
  });

  it("builds compact chip lines with type, time, and student", () => {
    const lines = getScheduleMapChipLines({
      lessonType: "DRIVING",
      startTime: "09:00",
      endTime: "10:00",
      student: { user: { firstName: "Ana", lastName: "Silva" } },
      vehicle: { registrationNumber: "AB-12-CD" },
    });

    expect(lines[0]).toBe("Drive · 09:00");
    expect(lines[1]).toBe("Ana Silva");
    expect(lines[2]).toBe("AB-12-CD");
    expect(lines).toHaveLength(3);
  });

  it("prefers instructor name when requested", () => {
    const lines = getScheduleMapChipLines(
      {
        lessonType: "EXAM",
        startTime: "14:00",
        endTime: "15:00",
        instructor: { user: { firstName: "João", lastName: "Costa" } },
        category: { name: "B" },
      },
      { preferInstructor: true },
    );

    expect(lines[0]).toBe("Exam · 14:00");
    expect(lines[1]).toBe("João Costa");
    expect(lines[2]).toBe("B");
  });
});
