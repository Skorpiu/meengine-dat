import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  countExistingPracticalLessonsForStudent,
  getNextPracticalLessonNumber,
  resolvePracticalLessonNumberOnStudentChange,
  shouldAssignPracticalLessonNumber,
  shouldReassignPracticalLessonNumberOnStudentChange,
} from "./practical-lesson-counter";
import { LESSON_TYPES } from "@/lib/constants";

describe("practical-lesson-counter", () => {
  const scope = { organizationId: "org-1", studentId: "stu-1" };

  describe("shouldAssignPracticalLessonNumber", () => {
    it("returns true for DRIVING", () => {
      expect(shouldAssignPracticalLessonNumber(LESSON_TYPES.DRIVING)).toBe(
        true,
      );
    });

    it("returns false for THEORY, THEORY_EXAM, and EXAM", () => {
      expect(shouldAssignPracticalLessonNumber(LESSON_TYPES.THEORY)).toBe(
        false,
      );
      expect(shouldAssignPracticalLessonNumber(LESSON_TYPES.THEORY_EXAM)).toBe(
        false,
      );
      expect(shouldAssignPracticalLessonNumber(LESSON_TYPES.EXAM)).toBe(false);
    });
  });

  describe("getNextPracticalLessonNumber", () => {
    const countMock = vi.fn();
    const aggregateMock = vi.fn();
    const db = {
      lesson: {
        count: countMock,
        aggregate: aggregateMock,
      },
    };

    beforeEach(() => {
      vi.resetAllMocks();
    });

    it("returns 1 when there are no DRIVING lessons", async () => {
      countMock.mockResolvedValue(0);
      aggregateMock.mockResolvedValue({
        _max: { practicalLessonNumber: null },
      });

      await expect(
        getNextPracticalLessonNumber(scope, db as never),
      ).resolves.toBe(1);
    });

    it("returns max assigned number + 1 when numbered lessons exist", async () => {
      countMock.mockResolvedValue(2);
      aggregateMock.mockResolvedValue({ _max: { practicalLessonNumber: 2 } });

      await expect(
        getNextPracticalLessonNumber(scope, db as never),
      ).resolves.toBe(3);
    });

    it("uses DRIVING count when legacy lessons lack practicalLessonNumber", async () => {
      countMock.mockResolvedValue(3);
      aggregateMock.mockResolvedValue({
        _max: { practicalLessonNumber: null },
      });

      await expect(
        getNextPracticalLessonNumber(scope, db as never),
      ).resolves.toBe(4);
    });

    it("returns 6 when manual history has practical lesson #5", async () => {
      countMock.mockResolvedValue(1);
      aggregateMock.mockResolvedValue({ _max: { practicalLessonNumber: 5 } });

      await expect(
        getNextPracticalLessonNumber(scope, db as never),
      ).resolves.toBe(6);
    });
  });

  describe("shouldReassignPracticalLessonNumberOnStudentChange", () => {
    it("returns true for DRIVING when next student differs", () => {
      expect(
        shouldReassignPracticalLessonNumberOnStudentChange({
          lessonType: LESSON_TYPES.DRIVING,
          existingStudentId: "stu-a",
          nextStudentId: "stu-b",
        }),
      ).toBe(true);
    });

    it("returns false when student is unchanged or omitted", () => {
      expect(
        shouldReassignPracticalLessonNumberOnStudentChange({
          lessonType: LESSON_TYPES.DRIVING,
          existingStudentId: "stu-a",
          nextStudentId: "stu-a",
        }),
      ).toBe(false);
      expect(
        shouldReassignPracticalLessonNumberOnStudentChange({
          lessonType: LESSON_TYPES.DRIVING,
          existingStudentId: "stu-a",
          nextStudentId: undefined,
        }),
      ).toBe(false);
    });

    it("returns false for non-DRIVING lesson types", () => {
      expect(
        shouldReassignPracticalLessonNumberOnStudentChange({
          lessonType: LESSON_TYPES.THEORY,
          existingStudentId: "stu-a",
          nextStudentId: "stu-b",
        }),
      ).toBe(false);
    });
  });

  describe("resolvePracticalLessonNumberOnStudentChange", () => {
    const countMock = vi.fn();
    const aggregateMock = vi.fn();
    const db = {
      lesson: {
        count: countMock,
        aggregate: aggregateMock,
      },
    };

    beforeEach(() => {
      vi.resetAllMocks();
    });

    it("returns undefined when student does not change", async () => {
      await expect(
        resolvePracticalLessonNumberOnStudentChange(
          {
            organizationId: "org-1",
            lessonType: LESSON_TYPES.DRIVING,
            existingStudentId: "stu-a",
            nextStudentId: "stu-a",
          },
          db as never,
        ),
      ).resolves.toBeUndefined();
      expect(countMock).not.toHaveBeenCalled();
    });

    it("delegates to getNext when DRIVING student changes", async () => {
      countMock.mockResolvedValue(2);
      aggregateMock.mockResolvedValue({ _max: { practicalLessonNumber: 2 } });

      await expect(
        resolvePracticalLessonNumberOnStudentChange(
          {
            organizationId: "org-1",
            lessonType: LESSON_TYPES.DRIVING,
            existingStudentId: "stu-a",
            nextStudentId: "stu-b",
          },
          db as never,
        ),
      ).resolves.toBe(3);
    });
  });

  describe("countExistingPracticalLessonsForStudent", () => {
    it("counts DRIVING lessons scoped by organization and student", async () => {
      const countMock = vi.fn().mockResolvedValue(5);
      const db = { lesson: { count: countMock } };

      await expect(
        countExistingPracticalLessonsForStudent(scope, db as never),
      ).resolves.toBe(5);

      expect(countMock).toHaveBeenCalledWith({
        where: {
          organizationId: "org-1",
          studentId: "stu-1",
          lessonType: LESSON_TYPES.DRIVING,
        },
      });
    });
  });
});
