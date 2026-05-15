import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { errorResponse, verifyAuth, withErrorHandling } from "@/lib/api-utils";
import { HTTP_STATUS, API_MESSAGES, USER_ROLES } from "@/lib/constants";
import { addDays } from "date-fns";
import { guardTenantAuthenticatedRoute } from "@/lib/tenant";
import { validateLessonCalendarRange } from "@/lib/lessons/calendar-range";
import { getInstructorCalendarLessons } from "@/lib/lessons/lesson-queries";
import { mapInstructorLessonsResponse } from "@/lib/lessons/lesson-mappers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async (request: NextRequest) => {
  const user = await verifyAuth(USER_ROLES.INSTRUCTOR);
  if (!user) {
    return errorResponse(API_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
  }

  const orgId = user.organizationId;
  if (!orgId) {
    return errorResponse("No organization found", HTTP_STATUS.BAD_REQUEST);
  }

  const tenantGuard = await guardTenantAuthenticatedRoute(request, orgId);
  if (!tenantGuard.allowed) {
    return errorResponse(tenantGuard.error, tenantGuard.status);
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const range = validateLessonCalendarRange({ from, to });
  if (!range.ok) {
    return NextResponse.json(
      { error: range.message, code: range.code },
      { status: HTTP_STATUS.BAD_REQUEST },
    );
  }

  const instructor = await prisma.instructor.findFirst({
    where: { userId: user.id, organizationId: orgId },
  });

  if (!instructor) {
    return errorResponse("Instructor profile not found", HTTP_STATUS.NOT_FOUND);
  }

  const lessons = await getInstructorCalendarLessons({
    organizationId: orgId,
    instructorId: instructor.id,
    fromDate: range.from,
    toDateExclusive: addDays(range.to, 1),
  });

  return NextResponse.json(mapInstructorLessonsResponse(lessons), {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
});
