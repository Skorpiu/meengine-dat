import { describe, it, expect } from 'vitest';
import { lessonCreationSchema } from './validation';
import { LESSON_TYPES } from './constants';

describe('lessonCreationSchema', () => {
  it('accepts THEORY_EXAM (requires studentIds)', () => {
    const r = lessonCreationSchema.safeParse({
      lessonType: LESSON_TYPES.THEORY_EXAM,
      instructorId: '11111111-1111-1111-1111-111111111111',
      studentIds: ['22222222-2222-2222-2222-222222222222'],
      lessonDate: '2026-01-06',
      startTime: '10:00',
      endTime: '11:00',
    });
    expect(r.success).toBe(true);
  });

  it('rejects THEORY_EXAM when studentIds missing', () => {
    const r = lessonCreationSchema.safeParse({
      lessonType: LESSON_TYPES.THEORY_EXAM,
      instructorId: '11111111-1111-1111-1111-111111111111',
      lessonDate: '2026-01-06',
      startTime: '10:00',
      endTime: '11:00',
    });
    expect(r.success).toBe(false);
  });

  it('rejects DRIVING when studentId missing', () => {
    const r = lessonCreationSchema.safeParse({
      lessonType: LESSON_TYPES.DRIVING,
      instructorId: '11111111-1111-1111-1111-111111111111',
      lessonDate: '2026-01-06',
      startTime: '10:00',
      endTime: '11:00',
    });
    expect(r.success).toBe(false);
  });
});
