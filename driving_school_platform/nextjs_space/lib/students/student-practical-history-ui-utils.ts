import { MANUAL_PRACTICAL_LESSON_DEFAULT_DURATION_MINUTES } from "@/lib/lessons/manual-practical-lesson-validation";

export type PracticalLessonHistoryItem = {
  id: string;
  lessonDate: string | Date;
  startTime: string;
  endTime: string;
  practicalLessonNumber: number | null;
  status: string;
  lessonSource: string;
  instructorName: string;
};

export type PracticalLessonHistoryListResponse = {
  success: true;
  data: { lessons: PracticalLessonHistoryItem[] };
};

export type PracticalLessonHistoryCreateResponse = {
  success: true;
  data: { lesson: PracticalLessonHistoryItem };
};

export type PracticalLessonHistoryApiError = {
  error?: string;
  code?: string;
};

export type InstructorOption = {
  id: string;
  name: string;
};

export const emptyPracticalHistoryForm = () => ({
  lessonDate: "",
  startTime: "",
  instructorId: "",
  practicalLessonNumber: "",
  durationMinutes: String(MANUAL_PRACTICAL_LESSON_DEFAULT_DURATION_MINUTES),
  notes: "",
});

export function formatPracticalHistoryDate(
  value: string | Date | null | undefined,
): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function practicalHistoryApiErrorMessage(
  code: string | undefined,
  fallback: string,
): string {
  switch (code) {
    case "practical_lesson_number_already_exists":
      return "Já existe uma aula prática com este nº para este aluno.";
    case "practical_lesson_number_out_of_range":
      return "O nº da aula deve estar entre 1 e 999.";
    case "practical_lesson_number_required":
      return "Indique o nº da aula prática.";
    case "duration_minutes_invalid":
      return "Duração inválida (1–480 minutos).";
    case "demo_restricted_action":
    case "demo_write_quota_exceeded":
      return fallback;
    default:
      return fallback;
  }
}

export function buildManualPracticalLessonPayload(form: {
  lessonDate: string;
  startTime: string;
  instructorId: string;
  practicalLessonNumber: string;
  durationMinutes: string;
  notes: string;
}):
  | {
      lessonDate: string;
      startTime: string;
      instructorId: string;
      practicalLessonNumber: number;
      durationMinutes: number;
      notes?: string;
    }
  | { error: string } {
  if (!form.lessonDate.trim()) {
    return { error: "Indique a data da aula." };
  }
  if (!form.startTime.trim()) {
    return { error: "Indique a hora da aula." };
  }
  if (!form.instructorId.trim()) {
    return { error: "Selecione o instrutor." };
  }

  const practicalLessonNumber = Number.parseInt(
    form.practicalLessonNumber.trim(),
    10,
  );
  if (!Number.isFinite(practicalLessonNumber) || practicalLessonNumber < 1) {
    return { error: "O nº da aula deve ser um número positivo." };
  }
  if (practicalLessonNumber > 999) {
    return { error: "O nº da aula deve estar entre 1 e 999." };
  }

  const durationMinutes = Number.parseInt(form.durationMinutes.trim(), 10);
  if (
    !Number.isFinite(durationMinutes) ||
    durationMinutes < 1 ||
    durationMinutes > 480
  ) {
    return { error: "Duração inválida (1–480 minutos)." };
  }

  const notes = form.notes.trim();
  return {
    lessonDate: form.lessonDate,
    startTime: form.startTime,
    instructorId: form.instructorId,
    practicalLessonNumber,
    durationMinutes,
    ...(notes ? { notes } : {}),
  };
}

export function getPracticalHistorySourceLabel(source: string): string {
  if (source === "MANUAL") return "Manual";
  if (source === "IMPORT") return "Importado";
  return "Sistema";
}
