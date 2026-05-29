import { describe, it, expect } from "vitest";
import {
  mapStudentRecordToLessonFormOption,
  parseAdminStudentsListResponse,
} from "./student-lesson-form-options";

describe("student-lesson-form-options", () => {
  it("maps operational student to label with schoolStudentId", () => {
    const option = mapStudentRecordToLessonFormOption({
      id: "stu-1",
      firstName: "João",
      lastName: "Silva",
      schoolStudentId: "26001",
      appAccessMode: "MANUAL_ONLY",
      userId: null,
      user: null,
    });

    expect(option.id).toBe("stu-1");
    expect(option.label).toBe("26001 — João Silva");
  });

  it("maps student without schoolStudentId to name only", () => {
    const option = mapStudentRecordToLessonFormOption({
      id: "stu-2",
      firstName: "Ana",
      lastName: "Costa",
      schoolStudentId: null,
      appAccessMode: "APP_USER",
      userId: "user-1",
      user: {
        id: "user-1",
        firstName: "Ana",
        lastName: "Costa",
      },
    });

    expect(option.label).toBe("Ana Costa");
    expect(option.id).toBe("stu-2");
  });

  it("parses admin students list envelope using Student.id", () => {
    const options = parseAdminStudentsListResponse({
      success: true,
      data: {
        students: [
          {
            id: "stu-manual",
            firstName: "Manual",
            lastName: "Student",
            schoolStudentId: "26002",
            appAccessMode: "MANUAL_ONLY",
            userId: null,
            user: null,
          },
        ],
      },
    });

    expect(options).toHaveLength(1);
    expect(options[0]?.id).toBe("stu-manual");
    expect(options[0]?.label).toBe("26002 — Manual Student");
  });
});
