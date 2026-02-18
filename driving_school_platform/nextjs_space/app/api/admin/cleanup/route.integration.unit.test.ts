import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/cleanup', () => ({
  cleanupOldLessons: vi.fn(),
}));

vi.mock('@/lib/tenant', () => ({
  resolveTenantOrganizationId: vi.fn(),
}));

vi.mock('@/lib/api-utils', async () => {
  const actual = await vi.importActual<any>('@/lib/api-utils');
  return {
    ...actual,
    verifyAuth: vi.fn(),
  };
});

import { POST } from './route';
import { verifyAuth } from '@/lib/api-utils';
import { cleanupOldLessons } from '@/lib/cleanup';
import { resolveTenantOrganizationId } from '@/lib/tenant';

const verifyAuthMock = verifyAuth as unknown as ReturnType<typeof vi.fn>;
const cleanupOldLessonsMock = cleanupOldLessons as unknown as ReturnType<typeof vi.fn>;
const resolveTenantOrganizationIdMock = resolveTenantOrganizationId as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetAllMocks();
});

describe('Admin Cleanup API (tenant scoping)', () => {
  it('returns 400 when user has no organizationId', async () => {
    verifyAuthMock.mockResolvedValue({ id: 'u1', role: 'SUPER_ADMIN', organizationId: null });

    const res = await POST(new Request('http://localhost/api/admin/cleanup', { method: 'POST' }) as any);
    expect(res.status).toBe(400);
    expect(cleanupOldLessonsMock).not.toHaveBeenCalled();
  });

  it('returns 403 when tenant org != session org', async () => {
    verifyAuthMock.mockResolvedValue({ id: 'u1', role: 'SUPER_ADMIN', organizationId: 'orgA' });
    resolveTenantOrganizationIdMock.mockResolvedValue({ host: 'school-b.meengine.io', organizationId: 'orgB' });

    const res = await POST(new Request('http://localhost/api/admin/cleanup', { method: 'POST' }) as any);
    expect(res.status).toBe(403);
    expect(cleanupOldLessonsMock).not.toHaveBeenCalled();
  });

  it('calls cleanup scoped by organizationId', async () => {
    verifyAuthMock.mockResolvedValue({ id: 'u1', role: 'SUPER_ADMIN', organizationId: 'orgA' });
    resolveTenantOrganizationIdMock.mockResolvedValue({ host: 'www.meengine.io', organizationId: 'orgA' });
    cleanupOldLessonsMock.mockResolvedValue({ count: 7 });

    const res = await POST(new Request('http://localhost/api/admin/cleanup', { method: 'POST' }) as any);
    expect(res.status).toBe(200);

    expect(cleanupOldLessonsMock).toHaveBeenCalledWith('orgA');

    const body: any = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.count).toBe(7);
  });
});
