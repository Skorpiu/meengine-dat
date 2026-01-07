import { describe, it, expect, vi, beforeEach } from 'vitest';

// -----------------------------
// Mocks (hoisted)
// -----------------------------
const instructorFindUniqueMock = vi.fn();
const categoryFindFirstMock = vi.fn();
const studentFindUniqueMock = vi.fn();
const lessonCreateMock = vi.fn();

const prismaMock = {
  instructor: { findUnique: instructorFindUniqueMock },
  category: { findFirst: categoryFindFirstMock },
  student: { findUnique: studentFindUniqueMock },
  lesson: { create: lessonCreateMock },
};

vi.mock('@/lib/db', () => ({
  prisma: prismaMock,
  db: prismaMock,
}));

vi.mock('@/lib/middleware/feature-check', () => ({
  checkFeatureAccess: vi.fn(),
}));

vi.mock('@/lib/api-utils', async () => {
  const actual = await vi.importActual<any>('@/lib/api-utils');
  return {
    ...actual,
    verifyAuth: vi.fn(),
  };
});

// IMPORTANT: import AFTER mocks
import { POST } from './route';
import { verifyAuth } from '@/lib/api-utils';
import { checkFeatureAccess } from '@/lib/middleware/feature-check';

const verifyAuthMock = verifyAuth as unknown as ReturnType<typeof vi.fn>;
const checkFeatureAccessMock = checkFeatureAccess as unknown as ReturnType<typeof vi.fn>;

function reqJson(payload: any): Request {
  return new Request('http://localhost/api/admin/lessons', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// Simple UUIDs that pass the zod uuid checks
const UUID_A = '11111111-1111-1111-1111-111111111111';
const UUID_B = '22222222-2222-2222-2222-222222222222';
const UUID_C = '33333333-3333-3333-3333-333333333333';
const UUID_D = '44444444-4444-4444-4444-444444444444';

beforeEach(() => {
  vi.resetAllMocks();

  // default “happy path” prisma behavior
  instructorFindUniqueMock.mockResolvedValue({
    id: 'inst-db-1',
    qualifiedCategories: [{ id: 1 }],
  });

  categoryFindFirstMock.mockResolvedValue({ id: 1, name: 'B' });

  studentFindUniqueMock.mockImplementation(async ({ where }: any) => {
    // route uses where: { userId: sid }
    if (!where?.userId) return null;
    return { id: `student-db-${where.userId.slice(0, 8)}`, userId: where.userId };
  });

  lessonCreateMock.mockImplementation(async ({ data }: any) => {
    return { id: `lesson-${Math.random().toString(16).slice(2)}`, ...data };
  });
});

describe('POST /api/admin/lessons (handler integration)', () => {
  it('blocks vehicleId when vehicles feature is disabled (403) and does not touch DB', async () => {
    verifyAuthMock.mockResolvedValue({ id: UUID_A, role: 'SUPER_ADMIN' });
    checkFeatureAccessMock.mockResolvedValue({ allowed: false, error: 'Feature not enabled' });

    const payload = {
      lessonType: 'DRIVING',
      instructorId: UUID_A,
      studentId: UUID_B,
      lessonDate: '2026-01-06',
      startTime: '10:00',
      endTime: '11:00',
      vehicleId: 1,
    };

    const res = await POST(reqJson(payload) as any);

    expect(res.status).toBe(403);
    const body: any = await res.json();

    expect(body.requiresUpgrade).toBe(true);
    expect(body.error).toBe('Vehicles feature not enabled');

    // Gate happens before any prisma calls
    expect(instructorFindUniqueMock).not.toHaveBeenCalled();
    expect(lessonCreateMock).not.toHaveBeenCalled();
  });

  it('creates THEORY_EXAM for multiple students (201) and does not call feature check when vehicleId absent', async () => {
    verifyAuthMock.mockResolvedValue({ id: UUID_A, role: 'SUPER_ADMIN' });

    const payload = {
      lessonType: 'THEORY_EXAM',
      instructorId: UUID_A,
      studentIds: [UUID_B, UUID_C],
      lessonDate: '2026-01-06',
      startTime: '10:00',
      endTime: '11:00',
    };

    const res = await POST(reqJson(payload) as any);

    expect(res.status).toBe(201);
    const body: any = await res.json();

    expect(body.success).toBe(true);
    expect(body.data?.lessons?.length).toBe(2);

    // sanity: called once per student
    expect(studentFindUniqueMock).toHaveBeenCalledTimes(2);
    expect(lessonCreateMock).toHaveBeenCalledTimes(2);

    // no vehicleId => no feature check
    expect(checkFeatureAccessMock).not.toHaveBeenCalled();
  });

  it('returns 400 when DRIVING is missing studentId (validation)', async () => {
    verifyAuthMock.mockResolvedValue({ id: UUID_A, role: 'SUPER_ADMIN' });

    const payload = {
      lessonType: 'DRIVING',
      instructorId: UUID_A,
      // studentId missing
      lessonDate: '2026-01-06',
      startTime: '10:00',
      endTime: '11:00',
    };

    const res = await POST(reqJson(payload) as any);

    expect(res.status).toBe(400);
    const body: any = await res.json();

    // validateRequest returns errorResponse('Validation failed', 400, details)
    expect(body.error).toBe('Validation failed');
    expect(body.details).toBeTruthy();

    // should fail before touching prisma
    expect(instructorFindUniqueMock).not.toHaveBeenCalled();
    expect(lessonCreateMock).not.toHaveBeenCalled();
  });

  it('forces instructorId to the logged-in instructor when role=INSTRUCTOR', async () => {
    const instructorUserId = UUID_D;

    verifyAuthMock.mockResolvedValue({ id: instructorUserId, role: 'INSTRUCTOR' });

    const payload = {
      lessonType: 'THEORY',
      instructorId: UUID_A, // attacker tries to book under another instructor
      lessonDate: '2026-01-06',
      startTime: '10:00',
      endTime: '11:00',
    };

    await POST(reqJson(payload) as any);

    // route should lookup instructor using overridden instructorId = user.id
    expect(instructorFindUniqueMock).toHaveBeenCalledTimes(1);
    const callArg = instructorFindUniqueMock.mock.calls[0]?.[0];

    expect(callArg?.where?.userId).toBe(instructorUserId);
  });

  it('returns 400 when EXAM exceeds MAX_STUDENTS_PER_EXAM', async () => {
    verifyAuthMock.mockResolvedValue({ id: UUID_A, role: 'SUPER_ADMIN' });

    const payload = {
      lessonType: 'EXAM',
      instructorId: UUID_A,
      studentIds: [UUID_B, UUID_C, UUID_D], // MAX is 2
      lessonDate: '2026-01-06',
      startTime: '10:00',
      endTime: '11:00',
    };

    const res = await POST(reqJson(payload) as any);

    expect(res.status).toBe(400);
    const body: any = await res.json();

    expect(body.error).toMatch(/Maximum/i);

    // should stop before creating lessons
    expect(lessonCreateMock).not.toHaveBeenCalled();
  });
});
