import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => {
  const findManyMock = vi.fn();
  const countMock = vi.fn();

  const prismaMock = {
    configurationHistory: {
      findMany: findManyMock,
      count: countMock,
    },
  };

  return { prismaMock, findManyMock, countMock };
});

vi.mock('@/lib/db', () => ({
  prisma: h.prismaMock,
  db: h.prismaMock,
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/tenant', () => ({
  resolveTenantOrganizationId: vi.fn(),
}));

import { GET } from './route';
import { getServerSession } from 'next-auth';
import { resolveTenantOrganizationId } from '@/lib/tenant';

const getServerSessionMock = getServerSession as unknown as ReturnType<typeof vi.fn>;
const resolveTenantOrganizationIdMock = resolveTenantOrganizationId as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetAllMocks();
  h.findManyMock.mockResolvedValue([]);
  h.countMock.mockResolvedValue(0);
});

describe('Admin Config History API (tenant scoping)', () => {
  it('returns 400 when session has no organizationId', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1', role: 'SUPER_ADMIN', organizationId: null } });
    resolveTenantOrganizationIdMock.mockResolvedValue({ host: 'www.meengine.io', organizationId: null });

    const res = await GET(new Request('http://localhost/api/admin/config-history') as any);
    expect(res.status).toBe(400);
    expect(h.findManyMock).not.toHaveBeenCalled();
  });

  it('returns 403 when tenant org != session org', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1', role: 'SUPER_ADMIN', organizationId: 'orgA' } });
    resolveTenantOrganizationIdMock.mockResolvedValue({ host: 'school-b.meengine.io', organizationId: 'orgB' });

    const res = await GET(new Request('http://localhost/api/admin/config-history') as any);
    expect(res.status).toBe(403);
    expect(h.findManyMock).not.toHaveBeenCalled();
  });

  it('scopes queries by organizationId', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1', role: 'SUPER_ADMIN', organizationId: 'orgA' } });
    resolveTenantOrganizationIdMock.mockResolvedValue({ host: 'www.meengine.io', organizationId: 'orgA' });

    const res = await GET(new Request('http://localhost/api/admin/config-history?limit=10&offset=0') as any);
    expect(res.status).toBe(200);

    const findManyArg = h.findManyMock.mock.calls[0]?.[0];
    const countArg = h.countMock.mock.calls[0]?.[0];

    expect(findManyArg.where.organizationId).toBe('orgA');
    expect(countArg.where.organizationId).toBe('orgA');
  });
});
