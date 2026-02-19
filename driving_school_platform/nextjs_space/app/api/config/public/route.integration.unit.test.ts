import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => {
  const systemSettingFindManyMock = vi.fn();

  const prismaMock = {
    systemSetting: {
      findMany: systemSettingFindManyMock,
    },
  };

  return { prismaMock, systemSettingFindManyMock };
});

vi.mock('@/lib/db', () => ({
  prisma: h.prismaMock,
  db: h.prismaMock,
}));

vi.mock('@/lib/tenant', () => ({
  resolveTenantOrganizationId: vi.fn(),
}));

import { GET } from './route';
import { resolveTenantOrganizationId } from '@/lib/tenant';

const resolveTenantOrganizationIdMock = resolveTenantOrganizationId as unknown as ReturnType<typeof vi.fn>;

function req(url: string): Request {
  return new Request(url, { method: 'GET' });
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('Public Config API (tenant scoping)', () => {
  it('returns 400 when host is non-local and no org is resolved', async () => {
    resolveTenantOrganizationIdMock.mockResolvedValue({ host: 'school-x.meengine.io', organizationId: null });

    const res = await GET(req('http://localhost/api/config/public') as any);
    expect(res.status).toBe(400);
    expect(h.systemSettingFindManyMock).not.toHaveBeenCalled();
  });

  it('returns 200 with empty settings on localhost when no org is resolved', async () => {
    resolveTenantOrganizationIdMock.mockResolvedValue({ host: 'localhost', organizationId: null });

    const res = await GET(req('http://localhost/api/config/public') as any);
    expect(res.status).toBe(200);

    const body: any = await res.json();
    expect(body.settings).toEqual({});
    expect(body.organizationId).toBe(null);
  });

  it('scopes systemSetting.findMany by organizationId', async () => {
    resolveTenantOrganizationIdMock.mockResolvedValue({ host: 'www.meengine.io', organizationId: 'orgA' });

    h.systemSettingFindManyMock.mockResolvedValue([
      { settingKey: 'PUBLIC_X', settingValue: '1', settingType: 'INTEGER' },
    ]);

    const res = await GET(req('http://localhost/api/config/public') as any);
    expect(res.status).toBe(200);

    const callArg = h.systemSettingFindManyMock.mock.calls[0]?.[0];
    expect(callArg.where.organizationId).toBe('orgA');
    expect(callArg.where.isPublic).toBe(true);
  });
});
