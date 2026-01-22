import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => {
  const systemSettingFindManyMock = vi.fn();
  const systemSettingFindFirstMock = vi.fn();
  const systemSettingCreateMock = vi.fn();

  const prismaMock = {
    systemSetting: {
      findMany: systemSettingFindManyMock,
      findFirst: systemSettingFindFirstMock,
      create: systemSettingCreateMock,
    },
  };

  return {
    prismaMock,
    systemSettingFindManyMock,
    systemSettingFindFirstMock,
    systemSettingCreateMock,
  };
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

vi.mock('@/lib/config-utils', async () => {
  const actual = await vi.importActual<any>('@/lib/config-utils');
  return {
    ...actual,
    parseSettingValue: vi.fn((v: any) => v),
    logConfigurationChange: vi.fn(),
  };
});

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

describe('Admin Settings API (tenant scoping)', () => {
  it('GET returns 400 when session has no organizationId', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1', role: 'SUPER_ADMIN', organizationId: null } });
    resolveTenantOrganizationIdMock.mockResolvedValue({ host: 'www.meengine.io', organizationId: null });

    const res = await GET(req('GET', 'http://localhost/api/admin/settings') as any);
    expect(res.status).toBe(400);
    expect(h.systemSettingFindManyMock).not.toHaveBeenCalled();
  });

  it('GET returns 403 when tenant domain org != session org', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1', role: 'SUPER_ADMIN', organizationId: 'orgA' } });
    resolveTenantOrganizationIdMock.mockResolvedValue({ host: 'school-b.meengine.io', organizationId: 'orgB' });

    const res = await GET(req('GET', 'http://localhost/api/admin/settings') as any);
    expect(res.status).toBe(403);
    expect(h.systemSettingFindManyMock).not.toHaveBeenCalled();
  });

  it('GET scopes findMany by organizationId and filters', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1', role: 'SUPER_ADMIN', organizationId: 'orgA' } });
    resolveTenantOrganizationIdMock.mockResolvedValue({ host: 'www.meengine.io', organizationId: 'orgA' });

    h.systemSettingFindManyMock.mockResolvedValue([
      {
        id: 's1',
        organizationId: 'orgA',
        settingKey: 'foo_bar',
        settingValue: 'x',
        settingType: 'STRING',
        description: null,
        category: 'general',
        isPublic: true,
      },
    ]);

    const res = await GET(req('GET', 'http://localhost/api/admin/settings?category=general&isPublic=true') as any);
    expect(res.status).toBe(200);

    const callArg = h.systemSettingFindManyMock.mock.calls[0]?.[0];
    expect(callArg.where.organizationId).toBe('orgA');
    expect(callArg.where.category).toBe('general');
    expect(callArg.where.isPublic).toBe(true);
  });

  it('POST creates setting scoped by organizationId', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1', role: 'SUPER_ADMIN', organizationId: 'orgA' } });
    resolveTenantOrganizationIdMock.mockResolvedValue({ host: 'www.meengine.io', organizationId: 'orgA' });

    h.systemSettingFindFirstMock.mockResolvedValue(null);
    h.systemSettingCreateMock.mockResolvedValue({
      id: 's1',
      organizationId: 'orgA',
      settingKey: 'foo_bar',
      settingValue: 'x',
      settingType: 'STRING',
      category: null,
      description: null,
      isPublic: false,
      updatedBy: 'u1',
    });

    const payload = {
      settingKey: 'foo_bar',
      settingValue: 'x',
      settingType: 'STRING',
      isPublic: false,
    };

    const res = await POST(req('POST', 'http://localhost/api/admin/settings', payload) as any);
    expect(res.status).toBe(201);

    const createArg = h.systemSettingCreateMock.mock.calls[0]?.[0];
    expect(createArg.data.organizationId).toBe('orgA');
  });
});
