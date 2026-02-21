import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => {
  const findManyMock = vi.fn();

  const prismaMock = {
    organization: {
      findMany: findManyMock,
    },
  };

  return { prismaMock, findManyMock };
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

// Keep real exports (isLocalHost/isPlatformHost) but override resolver.
vi.mock('@/lib/tenant', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/tenant')>();
  return {
    ...mod,
    resolveTenantOrganizationId: vi.fn(),
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
  h.findManyMock.mockResolvedValue([]);
});

describe('Platform Organizations API (host gating)', () => {
  it('returns 401 when not PLATFORM_ADMIN', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1', role: 'SUPER_ADMIN' } });
    resolveTenantOrganizationIdMock.mockResolvedValue({ host: 'localhost', organizationId: null });

    const res = await GET(req('GET', 'http://localhost/api/platform/organizations') as any);
    expect(res.status).toBe(401);
  });

  it('returns 403 when host is tenant-mapped', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1', role: 'PLATFORM_ADMIN' } });
    resolveTenantOrganizationIdMock.mockResolvedValue({ host: 'www.meengine.io', organizationId: 'orgA' });

    const res = await GET(req('GET', 'http://localhost/api/platform/organizations') as any);
    expect(res.status).toBe(403);
    expect(h.findManyMock).not.toHaveBeenCalled();
  });

  it('returns 403 when host is not local nor platform host', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1', role: 'PLATFORM_ADMIN' } });
    resolveTenantOrganizationIdMock.mockResolvedValue({ host: 'evil.com', organizationId: null });

    const res = await GET(req('GET', 'http://localhost/api/platform/organizations') as any);
    expect(res.status).toBe(403);
    expect(h.findManyMock).not.toHaveBeenCalled();
  });

  it('returns 200 on localhost for PLATFORM_ADMIN', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1', role: 'PLATFORM_ADMIN' } });
    resolveTenantOrganizationIdMock.mockResolvedValue({ host: 'localhost', organizationId: null });

    const res = await GET(req('GET', 'http://localhost/api/platform/organizations') as any);
    expect(res.status).toBe(200);
    expect(h.findManyMock).toHaveBeenCalledTimes(1);
  });

  it('POST returns 403 when host is not local nor platform host (before parsing JSON)', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1', role: 'PLATFORM_ADMIN' } });
    resolveTenantOrganizationIdMock.mockResolvedValue({ host: 'evil.com', organizationId: null });

    const res = await POST(req('POST', 'http://localhost/api/platform/organizations', {}) as any);
    expect(res.status).toBe(403);
  });
});
