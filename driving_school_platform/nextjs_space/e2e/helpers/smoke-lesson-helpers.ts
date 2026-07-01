/**
 * Production smoke lesson mutation helpers (API-first; no DB access).
 */

import type { SmokeFixtureConfig } from "./smoke-fixture-preflight";

export type SmokeLessonSlot = {
  lessonDate: string;
  startTime: string;
  endTime: string;
  runLabel: string;
};

export type SmokeLessonDetail = {
  id: string;
  lessonType: string;
  status?: string | null;
  lessonDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  studentId?: string | null;
  vehicleId?: number | null;
  instructorId?: string | null;
  practicalLessonNumber?: number | null;
  instructor?: {
    userId?: string | null;
    user?: { id?: string | null } | null;
  } | null;
};

export type SmokeLessonHttpResponse = {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
};

export type SmokeLessonRequest = (
  path: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    data?: unknown;
  },
) => Promise<SmokeLessonHttpResponse>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hashRunLabel(label: string): number {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function formatDateYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addMinutesToTime(time: string, minutes: number): string {
  const [hours, mins] = time
    .split(":")
    .map((part) => Number.parseInt(part, 10));
  const total = hours * 60 + mins + minutes;
  const normalized = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const nh = Math.floor(normalized / 60);
  const nm = normalized % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

export function resolveSmokeRunLabel(): string {
  const fromEnv = process.env.DAT_SMOKE_RUN_ID?.trim();
  if (fromEnv) return fromEnv;

  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `auto-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

/**
 * Derive a future lesson slot from run label (tomorrow, business-hour window).
 */
export function buildSmokeDrivingLessonSlot(
  runLabel?: string,
): SmokeLessonSlot {
  const label = runLabel ?? resolveSmokeRunLabel();
  const hash = hashRunLabel(label);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const hour = 8 + (hash % 8);
  const minute = (Math.floor(hash / 8) % 6) * 10;
  const startTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const endTime = addMinutesToTime(startTime, 60);

  return {
    lessonDate: formatDateYmd(tomorrow),
    startTime,
    endTime,
    runLabel: label,
  };
}

export function shiftSmokeLessonSlot(
  slot: SmokeLessonSlot,
  startOffsetMinutes: number,
): SmokeLessonSlot {
  return {
    ...slot,
    startTime: addMinutesToTime(slot.startTime, startOffsetMinutes),
    endTime: addMinutesToTime(slot.endTime, startOffsetMinutes),
  };
}

export function buildSmokeDrivingLessonCreateBody(
  config: SmokeFixtureConfig,
  slot: SmokeLessonSlot,
): Record<string, unknown> {
  return {
    lessonType: "DRIVING",
    instructorId: config.instructorUserId,
    studentId: config.studentId,
    vehicleId: config.vehicleId,
    lessonDate: slot.lessonDate,
    startTime: slot.startTime,
    endTime: slot.endTime,
  };
}

export function buildSmokeDrivingLessonUpdateBody(
  config: SmokeFixtureConfig,
  slot: SmokeLessonSlot,
): Record<string, unknown> {
  return {
    lessonDate: slot.lessonDate,
    startTime: slot.startTime,
    endTime: slot.endTime,
    instructorId: config.instructorUserId,
    studentId: config.studentId,
    vehicleId: config.vehicleId,
  };
}

function unwrapApiData(body: unknown): unknown {
  if (!isRecord(body)) return null;
  if (isRecord(body.data)) return body.data;
  return body;
}

export function parseSmokeLessonCreateResponse(
  body: unknown,
): SmokeLessonDetail | null {
  const data = unwrapApiData(body);
  if (!isRecord(data)) return null;

  const lesson = isRecord(data.lesson) ? data.lesson : data;
  if (typeof lesson.id !== "string") return null;

  return parseSmokeLessonDetail(lesson);
}

export function parseSmokeLessonDetail(
  body: unknown,
): SmokeLessonDetail | null {
  const lesson = unwrapApiData(body);
  if (!isRecord(lesson) || typeof lesson.id !== "string") return null;

  return {
    id: lesson.id,
    lessonType: typeof lesson.lessonType === "string" ? lesson.lessonType : "",
    status: typeof lesson.status === "string" ? lesson.status : null,
    lessonDate:
      typeof lesson.lessonDate === "string"
        ? lesson.lessonDate
        : lesson.lessonDate instanceof Date
          ? lesson.lessonDate.toISOString()
          : null,
    startTime: typeof lesson.startTime === "string" ? lesson.startTime : null,
    endTime: typeof lesson.endTime === "string" ? lesson.endTime : null,
    studentId: typeof lesson.studentId === "string" ? lesson.studentId : null,
    vehicleId: typeof lesson.vehicleId === "number" ? lesson.vehicleId : null,
    instructorId:
      typeof lesson.instructorId === "string" ? lesson.instructorId : null,
    practicalLessonNumber:
      typeof lesson.practicalLessonNumber === "number"
        ? lesson.practicalLessonNumber
        : null,
    instructor: isRecord(lesson.instructor)
      ? {
          userId:
            typeof lesson.instructor.userId === "string"
              ? lesson.instructor.userId
              : null,
          user: isRecord(lesson.instructor.user)
            ? {
                id:
                  typeof lesson.instructor.user.id === "string"
                    ? lesson.instructor.user.id
                    : null,
              }
            : null,
        }
      : null,
  };
}

export function parseSmokeLessonCalendar(body: unknown): SmokeLessonDetail[] {
  if (!isRecord(body)) return [];
  const raw = Array.isArray(body.lessons) ? body.lessons : [];
  return raw
    .map((row) => parseSmokeLessonDetail(row))
    .filter((lesson): lesson is SmokeLessonDetail => lesson !== null);
}

export type SmokeLessonFixtureAssertion = {
  name: string;
  ok: boolean;
  detail: string;
};

export function assertSmokeLessonMatchesFixture(
  lesson: SmokeLessonDetail,
  config: SmokeFixtureConfig,
): SmokeLessonFixtureAssertion[] {
  const results: SmokeLessonFixtureAssertion[] = [];

  const typeOk = lesson.lessonType === "DRIVING";
  results.push({
    name: "lesson_type",
    ok: typeOk,
    detail: typeOk
      ? "Lesson type is DRIVING"
      : `Lesson type expected DRIVING, got ${lesson.lessonType}`,
  });

  const studentOk = lesson.studentId === config.studentId;
  results.push({
    name: "lesson_student",
    ok: studentOk,
    detail: studentOk
      ? `Student id matches ${config.studentId}`
      : `Student id expected ${config.studentId}, got ${lesson.studentId ?? "(missing)"}`,
  });

  const vehicleOk = lesson.vehicleId === config.vehicleId;
  results.push({
    name: "lesson_vehicle",
    ok: vehicleOk,
    detail: vehicleOk
      ? `Vehicle id matches ${config.vehicleId}`
      : `Vehicle id expected ${config.vehicleId}, got ${String(lesson.vehicleId)}`,
  });

  const instructorUserId =
    lesson.instructor?.userId ?? lesson.instructor?.user?.id ?? null;
  const instructorOk = instructorUserId === config.instructorUserId;
  results.push({
    name: "lesson_instructor",
    ok: instructorOk,
    detail: instructorOk
      ? `Instructor user id matches ${config.instructorUserId}`
      : `Instructor user id expected ${config.instructorUserId}, got ${instructorUserId ?? "(missing)"}`,
  });

  if (lesson.practicalLessonNumber != null) {
    const practicalOk = lesson.practicalLessonNumber > 0;
    results.push({
      name: "lesson_practical_number",
      ok: practicalOk,
      detail: practicalOk
        ? `practicalLessonNumber is ${lesson.practicalLessonNumber}`
        : `practicalLessonNumber expected > 0, got ${lesson.practicalLessonNumber}`,
    });
  }

  return results;
}

export function summarizeSmokeLessonAssertions(
  results: SmokeLessonFixtureAssertion[],
): { ok: boolean; failed: SmokeLessonFixtureAssertion[] } {
  const failed = results.filter((result) => !result.ok);
  return { ok: failed.length === 0, failed };
}

export async function createSmokeDrivingLesson(
  request: SmokeLessonRequest,
  config: SmokeFixtureConfig,
  slot: SmokeLessonSlot,
): Promise<{ lesson: SmokeLessonDetail; status: number }> {
  const response = await request("/api/admin/lessons", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    data: buildSmokeDrivingLessonCreateBody(config, slot),
  });

  const body = await response.json().catch(() => null);
  const lesson = parseSmokeLessonCreateResponse(body);
  if (!response.ok || !lesson) {
    throw new Error(
      `POST /api/admin/lessons failed (HTTP ${response.status}): ${JSON.stringify(body)}`,
    );
  }

  return { lesson, status: response.status };
}

export async function fetchSmokeLessonDetail(
  request: SmokeLessonRequest,
  lessonId: string,
): Promise<SmokeLessonDetail> {
  const response = await request(`/api/admin/lessons/${lessonId}`, {
    headers: { Accept: "application/json" },
  });
  const body = await response.json().catch(() => null);
  const lesson = parseSmokeLessonDetail(body);
  if (!response.ok || !lesson) {
    throw new Error(
      `GET /api/admin/lessons/${lessonId} failed (HTTP ${response.status}): ${JSON.stringify(body)}`,
    );
  }
  return lesson;
}

export async function updateSmokeDrivingLesson(
  request: SmokeLessonRequest,
  lessonId: string,
  config: SmokeFixtureConfig,
  slot: SmokeLessonSlot,
): Promise<SmokeLessonDetail> {
  const response = await request(`/api/admin/lessons/${lessonId}`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    data: buildSmokeDrivingLessonUpdateBody(config, slot),
  });

  const body = await response.json().catch(() => null);
  const lesson = parseSmokeLessonCreateResponse(body);
  if (!response.ok || !lesson) {
    throw new Error(
      `PUT /api/admin/lessons/${lessonId} failed (HTTP ${response.status}): ${JSON.stringify(body)}`,
    );
  }
  return lesson;
}

export async function fetchSmokeLessonFromCalendar(
  request: SmokeLessonRequest,
  lessonDate: string,
  lessonId: string,
): Promise<SmokeLessonDetail | null> {
  const response = await request(
    `/api/admin/lessons?from=${encodeURIComponent(lessonDate)}&to=${encodeURIComponent(lessonDate)}`,
    { headers: { Accept: "application/json" } },
  );
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      `GET /api/admin/lessons calendar failed (HTTP ${response.status}): ${JSON.stringify(body)}`,
    );
  }
  return (
    parseSmokeLessonCalendar(body).find((lesson) => lesson.id === lessonId) ??
    null
  );
}
