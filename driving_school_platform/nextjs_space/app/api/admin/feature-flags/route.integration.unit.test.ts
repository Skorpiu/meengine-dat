import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => {
  const findManyMock = vi.fn();
  const findFirstMock = vi.fn();
  const createMock = vi.fn();

  const prismaMock = {
    featureFlag: {
      findMany: findManyMock,
      findFirst: findFirstMock,
      create: createMock,
    },
  };

  return { prismaMock, findManyMock, findFirstMock, createMock };
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

vi.mock('@/lib/config-utils', () => ({
  logConfigurationChange: vi.fn(),
}));

// IMPORT AFTER MOCKS
import { GET, POST } from './route';
import { getServerSession } from 'next-auth';
import { resolveTenantOrganizationId } from '@/lib/tenant';

const getServerSessionMock = getServerSession as unknown as ReturnType<typeof vi.fn>;
const resolveTenantOrganizationIdMock = resolveTenantOrganizationId as unknown as ReturnType<typeof vi.fn>;

function req(method: string, url: string, payload?: any): Request {
  return new Request(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: payload ? JSON.stringify(payload) : undefined,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('Admin Feature Flags API (tenant scoping)', () => {
  it('GET returns 400 when session has no organizationId', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1', role: 'SUPER_ADMIN', organizationId: null } });
    resolveTenantOrganizationIdMock.mockResolvedValue({ host: 'www.meengine.io', organizationId: null });

    const res = await GET(req('GET', 'http://localhost/api/admin/feature-flags') as any);
    expect(res.status).toBe(400);
    expect(h.findManyMock).not.toHaveBeenCalled();
  });

  it('GET returns 403 when tenant domain org != session org', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1', role: 'SUPER_ADMIN', organizationId: 'orgA' } });
    resolveTenantOrganizationIdMock.mockResolvedValue({ host: 'school-b.meengine.io', organizationId: 'orgB' });

    const res = await GET(req('GET', 'http://localhost/api/admin/feature-flags') as any);
    expect(res.status).toBe(403);
    expect(h.findManyMock).not.toHaveBeenCalled();
  });

  it('GET scopes findMany by organizationId', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1', role: 'SUPER_ADMIN', organizationId: 'orgA' } });
    resolveTenantOrganizationIdMock.mockResolvedValue({ host: 'www.meengine.io', organizationId: 'orgA' });

    h.findManyMock.mockResolvedValue([]);

    const res = await GET(req('GET', 'http://localhost/api/admin/feature-flags?environment=production') as any);
    expect(res.status).toBe(200);

    const callArg = h.findManyMock.mock.calls[0]?.[0];
    expect(callArg.where.organizationId).toBe('orgA');
    expect(callArg.where.environment).toBe('production');
  });

  it('POST creates feature flag scoped by organizationId', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1', role: 'SUPER_ADMIN', organizationId: 'orgA' } });
    resolveTenantOrganizationIdMock.mockResolvedValue({ host: 'www.meengine.io', organizationId: 'orgA' });

    h.findFirstMock.mockResolvedValue(null);
    h.createMock.mockResolvedValue({
      id: 'ff1',
      organizationId: 'orgA',
      flagKey: 'lesson_management',
      flagName: 'Lesson Management',
      isEnabled: true,
      enabledForRoles: [],
      enabledForUsers: [],
      rolloutPercent: 0,
      environment: 'production',
      tags: [],
      createdBy: 'u1',
      updatedBy: 'u1',
      expiresAt: null,
    });

    const payload = {
      flagKey: 'lesson_management',
      flagName: 'Lesson Management',
      isEnabled: true,
    };

    const res = await POST(req('POST', 'http://localhost/api/admin/feature-flags', payload) as any);
    expect(res.status).toBe(201);

    const createArg = h.createMock.mock.calls[0]?.[0];
    expect(createArg.data.organizationId).toBe('orgA');
  });
});
