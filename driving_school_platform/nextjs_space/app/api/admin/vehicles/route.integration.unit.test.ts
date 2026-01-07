import { describe, it, expect, vi, beforeEach } from 'vitest';

// -----------------------------
// Hoisted mocks (Vitest-safe)
// -----------------------------
const h = vi.hoisted(() => {
  const getServerSessionMock = vi.fn();
  const checkFeatureAccessMock = vi.fn();

  const vehicleFindManyMock = vi.fn();
  const lessonFindManyMock = vi.fn();
  const examFindManyMock = vi.fn();

  const dbMock = {
    vehicle: { findMany: vehicleFindManyMock },
    lesson: { findMany: lessonFindManyMock },
    exam: { findMany: examFindManyMock },
  };

  return {
    getServerSessionMock,
    checkFeatureAccessMock,
    dbMock,
    vehicleFindManyMock,
    lessonFindManyMock,
    examFindManyMock,
  };
});

vi.mock('next-auth', () => ({
  getServerSession: h.getServerSessionMock,
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/middleware/feature-check', () => ({
  checkFeatureAccess: h.checkFeatureAccessMock,
}));

vi.mock('@/lib/db', () => ({
  db: h.dbMock,
  prisma: h.dbMock,
}));

// IMPORTANT: import AFTER mocks
import { GET } from './route';

function req(url = 'http://localhost/api/admin/vehicles'): Request {
  return new Request(url, { method: 'GET' });
}

beforeEach(() => {
  vi.resetAllMocks();

  // default mocks
  h.lessonFindManyMock.mockResolvedValue([]);
  h.examFindManyMock.mockResolvedValue([]);
  h.vehicleFindManyMock.mockResolvedValue([]);

  h.checkFeatureAccessMock.mockResolvedValue({ allowed: true });
});

describe('GET /api/admin/vehicles (handler integration)', () => {
  it('returns 401 when not authenticated', async () => {
    h.getServerSessionMock.mockResolvedValue(null);

    const res = await GET(req() as any);
    expect(res.status).toBe(401);

    const body: any = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 when role is not SUPER_ADMIN/INSTRUCTOR', async () => {
    h.getServerSessionMock.mockResolvedValue({ user: { id: 'u1', role: 'STUDENT' } });

    const res = await GET(req() as any);
    expect(res.status).toBe(403);

    const body: any = await res.json();
    expect(body.error).toBe('Access denied');
  });

  it('returns 403 when VEHICLE_MANAGEMENT feature is disabled and does not hit DB', async () => {
    h.getServerSessionMock.mockResolvedValue({ user: { id: 'u1', role: 'INSTRUCTOR' } });
    h.checkFeatureAccessMock.mockResolvedValue({ allowed: false, error: 'Feature not enabled' });

    const res = await GET(req() as any);
    expect(res.status).toBe(403);

    const body: any = await res.json();
    expect(body.requiresUpgrade).toBe(true);
    expect(body.error).toBe('Vehicles feature not enabled');

    expect(h.vehicleFindManyMock).not.toHaveBeenCalled();
    expect(h.lessonFindManyMock).not.toHaveBeenCalled();
    expect(h.examFindManyMock).not.toHaveBeenCalled();
  });

  it('returns 200 and computes AVAILABLE when feature enabled and vehicle is active', async () => {
    h.getServerSessionMock.mockResolvedValue({ user: { id: 'u1', role: 'SUPER_ADMIN' } });

    h.vehicleFindManyMock.mockResolvedValue([
      {
        id: 1,
        status: 'UNKNOWN',
        underMaintenance: false,
        isActive: true,
        category: {},
        transmissionType: {},
      },
    ]);

    const res = await GET(req() as any);
    expect(res.status).toBe(200);

    const body: any = await res.json();
    expect(Array.isArray(body.vehicles)).toBe(true);
    expect(body.vehicles.length).toBe(1);
    expect(body.vehicles[0].status).toBe('AVAILABLE');
  });

  it('returns 200 and forces MAINTENANCE when underMaintenance=true', async () => {
    h.getServerSessionMock.mockResolvedValue({ user: { id: 'u1', role: 'SUPER_ADMIN' } });

    h.vehicleFindManyMock.mockResolvedValue([
      {
        id: 2,
        status: 'AVAILABLE',
        underMaintenance: true,
        isActive: true,
        category: {},
        transmissionType: {},
      },
    ]);

    const res = await GET(req() as any);
    expect(res.status).toBe(200);

    const body: any = await res.json();
    expect(body.vehicles[0].status).toBe('MAINTENANCE');
  });
});
