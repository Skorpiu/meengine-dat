/**
 * Maps LessonForm client payload to PUT /api/admin/lessons/[id] JSON body.
 * instructorId must be Instructor User.id (same as create / form options).
 * studentId must be operational Student.id.
 */
export type LessonUpdateFormPayload = {
  lessonDate: string;
  startTime: string;
  endTime: string;
  status?: string;
  vehicleId?: string;
  instructorId?: string;
  studentId?: string;
};

export function buildAdminLessonUpdateRequestBody(
  payload: LessonUpdateFormPayload,
  options?: { instructorId?: string },
): Record<string, unknown> {
  const requestBody: Record<string, unknown> = {
    lessonDate: payload.lessonDate,
    startTime: payload.startTime,
    endTime: payload.endTime,
  };

  if (payload.status) {
    requestBody.status = payload.status;
  }

  if (payload.vehicleId) {
    const vehicleId = Number.parseInt(payload.vehicleId, 10);
    requestBody.vehicleId =
      Number.isFinite(vehicleId) && vehicleId > 0 ? vehicleId : null;
  } else {
    requestBody.vehicleId = null;
  }

  const instructorId = options?.instructorId ?? payload.instructorId;
  if (instructorId) {
    requestBody.instructorId = instructorId;
  }

  if (payload.studentId) {
    requestBody.studentId = payload.studentId;
  }

  return requestBody;
}
