import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => {
  const findUniqueMock = vi.fn();
  const transactionMock = vi.fn();

  const prismaMock = {
    user: { findUnique: findUniqueMock },
    $transaction: transactionMock,
  };

  return { prismaMock, findUniqueMock, transactionMock };
});

vi.mock('@/lib/db', () => ({
  prisma: h.prismaMock,
  db: h.prismaMock,
}));

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn() },
}));

vi.mock('@/lib/tenant', () => ({
  resolveTenantOrganizationId: vi.fn(),
}));

import bcrypt from 'bcryptjs';
import { resolveTenantOrganizationId } from '@/lib/tenant';
import { POST } from './route';

const hashMock = (bcrypt as any).hash as ReturnType<typeof vi.fn>;
const resolveTenantOrganizationIdMock = resolveTenantOrganizationId as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetAllMocks();
});

describe('POST /api/signup (tenant hardening)', () => {
  it('returns 403 when role is SUPER_ADMIN', async () => {
    resolveTenantOrganizationIdMock.mockResolvedValue({ host: 'www.meengine.io', organizationId: 'orgA' });

    const req = new Request('http://localhost/api/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        firstName: 'A',
        lastName: 'B',
        email: 'x@y.com',
        password: '123',
        role: 'SUPER_ADMIN',
      }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(403);
    expect(h.findUniqueMock).not.toHaveBeenCalled();
  });

  it('returns 400 when host is non-local and no org is resolved (even if body has organizationId)', async () => {
    resolveTenantOrganizationIdMock.mockResolvedValue({ host: 'school-x.meengine.io', organizationId: null });

    const req = new Request('http://localhost/api/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        firstName: 'A',
        lastName: 'B',
        email: 'x@y.com',
        password: '123',
        role: 'STUDENT',
        organizationId: 'orgA',
      }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
    expect(h.findUniqueMock).not.toHaveBeenCalled();
  });

  it('returns 403 when tenant org != body organizationId', async () => {
    resolveTenantOrganizationIdMock.mockResolvedValue({ host: 'www.meengine.io', organizationId: 'orgA' });

    const req = new Request('http://localhost/api/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        firstName: 'A',
        lastName: 'B',
        email: 'x@y.com',
        password: '123',
        role: 'STUDENT',
        organizationId: 'orgB',
      }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(403);
    expect(h.findUniqueMock).not.toHaveBeenCalled();
  });

  it('returns 201 on happy path (tenant org present)', async () => {
    resolveTenantOrganizationIdMock.mockResolvedValue({ host: 'www.meengine.io', organizationId: 'orgA' });
    h.findUniqueMock.mockResolvedValue(null);
    hashMock.mockResolvedValue('hash');

    h.transactionMock.mockImplementation(async (cb: any) => {
      const tx = {
        user: { create: vi.fn().mockResolvedValue({ id: 'u1' }) },
        student: { create: vi.fn().mockResolvedValue({ id: 's1' }) },
        instructor: { create: vi.fn() },
        transmissionType: { findFirst: vi.fn().mockResolvedValue(null) },
        category: { findFirst: vi.fn().mockResolvedValue(null) },
        lessonCounter: { create: vi.fn() },
      };
      return cb(tx);
    });

    const req = new Request('http://localhost/api/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        firstName: 'A',
        lastName: 'B',
        email: 'x@y.com',
        password: '123',
        role: 'STUDENT',
      }),
    });

    const res = await POST(req as any);
    expect(res.status).toBe(201);

    const body: any = await res.json();
    expect(body.userId).toBe('u1');
  });
});
