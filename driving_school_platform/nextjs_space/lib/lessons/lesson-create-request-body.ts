/**
 * Maps LessonForm client payload to POST /api/admin/lessons JSON body.
 * vehicleId must be a positive integer for Zod lessonCreationSchema.
 */
export type LessonCreateFormPayload = {
  lessonType: string;
  instructorId?: string;
  studentId?: string;
  studentIds?: string[];
  vehicleId?: string;
  lessonDate: string;
  startTime: string;
  endTime: string;
  status?: string;
};

export function buildAdminLessonCreateRequestBody(
  payload: LessonCreateFormPayload,
  options?: { instructorId?: string },
): Record<string, unknown> {
  const requestBody: Record<string, unknown> = {
    lessonType: payload.lessonType,
    lessonDate: payload.lessonDate,
    startTime: payload.startTime,
    endTime: payload.endTime,
  };

  const instructorId = options?.instructorId ?? payload.instructorId;
  if (instructorId) {
    requestBody.instructorId = instructorId;
  }

  if (payload.studentIds && payload.studentIds.length > 0) {
    requestBody.studentIds = payload.studentIds;
  } else if (payload.studentId) {
    requestBody.studentId = payload.studentId;
  }

  if (payload.vehicleId) {
    const vehicleId = Number.parseInt(payload.vehicleId, 10);
    if (Number.isFinite(vehicleId) && vehicleId > 0) {
      requestBody.vehicleId = vehicleId;
    }
  }

  if (payload.status) {
    requestBody.status = payload.status;
  }

  return requestBody;
}
