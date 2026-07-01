import { test, expect } from "@playwright/test";
import {
  assertProductionMutationsAllowed,
  assertSmokeFixtureEnvVars,
} from "../helpers/env-guards";
import {
  runSmokeFixturePreflight,
  summarizeSmokeFixtureResults,
} from "../helpers/smoke-fixture-preflight";
import {
  runSmokeMutationReadiness,
  summarizeSmokeMutationReadiness,
} from "../helpers/smoke-mutation-readiness";
import {
  assertSmokeLessonMatchesFixture,
  buildSmokeDrivingLessonSlot,
  createSmokeDrivingLesson,
  fetchSmokeLessonDetail,
  fetchSmokeLessonFromCalendar,
  resolveSmokeRunLabel,
  shiftSmokeLessonSlot,
  summarizeSmokeLessonAssertions,
  updateSmokeDrivingLesson,
  type SmokeLessonRequest,
} from "../helpers/smoke-lesson-helpers";
import { loginWithCredentials } from "../helpers/auth";
import {
  logSmokeAdminPageLoadResult,
  trySmokeAdminLessonsPageLoad,
  trySmokeAdminScheduleMapPageLoad,
} from "../helpers/smoke-admin-page-load";

const adminEmail = process.env.DAT_SMOKE_ADMIN_EMAIL?.trim();
const adminPassword = process.env.DAT_SMOKE_ADMIN_PASSWORD;
const hasAdminCredentials = Boolean(adminEmail && adminPassword);

test.beforeAll(() => {
  assertProductionMutationsAllowed();
});

test.describe("Production smoke (lesson mutations)", () => {
  test("@mutations creates and updates a DRIVING lesson using smoke fixtures", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    test.skip(
      !hasAdminCredentials,
      "Set DAT_SMOKE_ADMIN_EMAIL and DAT_SMOKE_ADMIN_PASSWORD (see docs/ops/production-smoke-e2e.md).",
    );

    const fixtureConfig = assertSmokeFixtureEnvVars();
    const runLabel = resolveSmokeRunLabel();
    const createSlot = buildSmokeDrivingLessonSlot(runLabel);
    const updateSlot = shiftSmokeLessonSlot(createSlot, 15);

    await loginWithCredentials(page, adminEmail!, adminPassword!);

    const request: SmokeLessonRequest = async (path, init) => {
      const method = init?.method ?? "GET";
      const response = await page.request.fetch(path, {
        method,
        headers: init?.headers,
        data: init?.data,
      });
      return {
        ok: response.ok(),
        status: response.status(),
        json: () => response.json(),
      };
    };

    const preflightResults = await runSmokeFixturePreflight(
      request,
      fixtureConfig,
    );
    const preflightSummary = summarizeSmokeFixtureResults(preflightResults);
    if (!preflightSummary.ok) {
      const details = preflightSummary.failed
        .map((result) => `${result.name}: ${result.detail}`)
        .join("; ");
      throw new Error(`Smoke fixture preflight failed — ${details}`);
    }

    const readinessResults = await runSmokeMutationReadiness(
      request,
      fixtureConfig,
    );
    for (const result of readinessResults) {
      if (result.detail.includes("WARN:")) {
        console.warn(
          `Smoke mutation readiness: ${result.name} — ${result.detail}`,
        );
      }
    }
    const readinessSummary = summarizeSmokeMutationReadiness(readinessResults);
    if (!readinessSummary.ok) {
      const details = readinessSummary.failed
        .map((result) => `${result.name}: ${result.detail}`)
        .join("; ");
      throw new Error(`Smoke mutation readiness failed — ${details}`);
    }

    console.log(`Smoke mutation run label: ${runLabel}`);
    console.log(
      `Creating DRIVING lesson on ${createSlot.lessonDate} ${createSlot.startTime}-${createSlot.endTime}`,
    );

    const { lesson: createdLesson, status: createStatus } =
      await createSmokeDrivingLesson(request, fixtureConfig, createSlot);
    expect(createStatus).toBe(201);
    expect(createdLesson.id).toBeTruthy();

    const createdDetail = await fetchSmokeLessonDetail(
      request,
      createdLesson.id,
    );
    const createAssertions = summarizeSmokeLessonAssertions(
      assertSmokeLessonMatchesFixture(createdDetail, fixtureConfig),
    );
    if (!createAssertions.ok) {
      const details = createAssertions.failed
        .map((result) => `${result.name}: ${result.detail}`)
        .join("; ");
      throw new Error(`Created lesson fixture assertions failed — ${details}`);
    }

    const calendarLesson = await fetchSmokeLessonFromCalendar(
      request,
      createSlot.lessonDate,
      createdLesson.id,
    );
    expect(calendarLesson).not.toBeNull();
    expect(calendarLesson?.startTime).toBe(createSlot.startTime);

    logSmokeAdminPageLoadResult(
      "Smoke mutation UI",
      await trySmokeAdminScheduleMapPageLoad(
        page,
        createSlot.lessonDate,
        createSlot.startTime,
      ),
    );

    console.log(
      `Updating lesson ${createdLesson.id} to ${updateSlot.startTime}-${updateSlot.endTime}`,
    );

    const updatedLesson = await updateSmokeDrivingLesson(
      request,
      createdLesson.id,
      fixtureConfig,
      updateSlot,
    );
    expect(updatedLesson.startTime).toBe(updateSlot.startTime);
    expect(updatedLesson.endTime).toBe(updateSlot.endTime);

    const updatedDetail = await fetchSmokeLessonDetail(
      request,
      createdLesson.id,
    );
    expect(updatedDetail.startTime).toBe(updateSlot.startTime);
    expect(updatedDetail.endTime).toBe(updateSlot.endTime);

    const updatedCalendarLesson = await fetchSmokeLessonFromCalendar(
      request,
      updateSlot.lessonDate,
      createdLesson.id,
    );
    expect(updatedCalendarLesson?.startTime).toBe(updateSlot.startTime);

    logSmokeAdminPageLoadResult(
      "Smoke mutation UI",
      await trySmokeAdminLessonsPageLoad(page),
    );

    console.log(
      `Smoke lesson trail retained (no cleanup): id=${createdLesson.id}, run=${runLabel}`,
    );
  });
});
