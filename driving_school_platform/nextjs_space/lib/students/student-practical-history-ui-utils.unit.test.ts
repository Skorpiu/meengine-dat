import { describe, it, expect } from "vitest";
import {
  buildManualPracticalLessonPayload,
  practicalHistoryApiErrorMessage,
} from "./student-practical-history-ui-utils";

describe("student-practical-history-ui-utils", () => {
  it("buildManualPracticalLessonPayload maps form fields", () => {
    const payload = buildManualPracticalLessonPayload({
      lessonDate: "2026-05-15",
      startTime: "10:00",
      instructorId: "inst-user-1",
      practicalLessonNumber: "3",
      durationMinutes: "60",
      notes: "  Histórico antigo  ",
    });

    expect(payload).toEqual({
      lessonDate: "2026-05-15",
      startTime: "10:00",
      instructorId: "inst-user-1",
      practicalLessonNumber: 3,
      durationMinutes: 60,
      notes: "Histórico antigo",
    });
  });

  it("returns error for missing required fields", () => {
    expect(
      buildManualPracticalLessonPayload({
        lessonDate: "",
        startTime: "10:00",
        instructorId: "x",
        practicalLessonNumber: "1",
        durationMinutes: "60",
        notes: "",
      }),
    ).toEqual({ error: "Indique a data da aula." });
  });

  it("maps duplicate number API code to user message", () => {
    expect(
      practicalHistoryApiErrorMessage(
        "practical_lesson_number_already_exists",
        "fallback",
      ),
    ).toMatch(/Já existe/);
  });
});
