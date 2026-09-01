import { test, expect } from "@playwright/test";

import { loginWithLocalE2eCredentials } from "../helpers/local-e2e-auth";
import { assertLocalBrowserE2eConfig } from "../helpers/local-e2e-guards";
import {
  E2E_FIXTURE_ADMIN_EMAIL,
  E2E_FIXTURE_ADMIN_PASSWORD,
  E2E_FIXTURE_INSTRUCTOR_USER_ID,
  E2E_FIXTURE_STUDENT_1_ID,
  E2E_FIXTURE_STUDENT_1_USER_ID,
  E2E_FIXTURE_STUDENT_2_ID,
  E2E_FIXTURE_STUDENT_2_USER_ID,
} from "@/lib/ops/provision-e2e-fixtures";

test.beforeAll(() => {
  assertLocalBrowserE2eConfig();
});

type InstructorListResponse = {
  instructors?: Array<{ id?: unknown }>;
};

type StudentListResponse = {
  success?: unknown;
  data?: {
    students?: Array<{ id?: unknown; userId?: unknown }>;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

test("admin can create THEORY_EXAM with operational Student.id participants -> 201", async ({
  page,
}) => {
  await loginWithLocalE2eCredentials(
    page,
    E2E_FIXTURE_ADMIN_EMAIL,
    E2E_FIXTURE_ADMIN_PASSWORD,
    "SUPER_ADMIN",
  );

  const result = await page.evaluate(
    async (fixture) => {
      const baseDate = new Date().toISOString().slice(0, 10);

      const instructorsRes = await fetch("/api/admin/instructors/all");
      const instructorsJson =
        (await instructorsRes.json()) as InstructorListResponse;
      const instructorId = (instructorsJson.instructors ?? []).find(
        (instructor) => instructor.id === fixture.instructorUserId,
      )?.id;

      const studentsRes = await fetch("/api/admin/students");
      const studentsJson = (await studentsRes.json()) as StudentListResponse;
      const students = studentsJson.data?.students ?? [];
      const student1 = students.find(
        (student) => student.id === fixture.student1Id,
      );
      const student2 = students.find(
        (student) => student.id === fixture.student2Id,
      );

      const studentIds = [student1?.id, student2?.id].filter(
        (id): id is string => typeof id === "string",
      );

      const r = await fetch("/api/admin/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonType: "THEORY_EXAM",
          instructorId,
          studentIds,
          lessonDate: baseDate,
          startTime: "10:00",
          endTime: "11:00",
        }),
      });

      return {
        instructorId: typeof instructorId === "string" ? instructorId : null,
        student1Id: typeof student1?.id === "string" ? student1.id : null,
        student1UserId:
          typeof student1?.userId === "string" ? student1.userId : null,
        student2Id: typeof student2?.id === "string" ? student2.id : null,
        student2UserId:
          typeof student2?.userId === "string" ? student2.userId : null,
        status: r.status,
        body: await r.json().catch(() => null),
      };
    },
    {
      instructorUserId: E2E_FIXTURE_INSTRUCTOR_USER_ID,
      student1Id: E2E_FIXTURE_STUDENT_1_ID,
      student2Id: E2E_FIXTURE_STUDENT_2_ID,
    },
  );

  expect(result.instructorId).toBe(E2E_FIXTURE_INSTRUCTOR_USER_ID);
  expect(result.student1Id).toBe(E2E_FIXTURE_STUDENT_1_ID);
  expect(result.student2Id).toBe(E2E_FIXTURE_STUDENT_2_ID);
  expect(result.student1Id).not.toBe(E2E_FIXTURE_STUDENT_1_USER_ID);
  expect(result.student2Id).not.toBe(E2E_FIXTURE_STUDENT_2_USER_ID);
  expect(result.student1UserId).toBe(E2E_FIXTURE_STUDENT_1_USER_ID);
  expect(result.student2UserId).toBe(E2E_FIXTURE_STUDENT_2_USER_ID);

  expect(result.status).toBe(201);
  expect(isRecord(result.body) && result.body.success).toBe(true);
});
