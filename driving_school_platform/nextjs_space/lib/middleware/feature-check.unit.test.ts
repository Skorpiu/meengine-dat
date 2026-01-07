import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/services/license-service', () => ({
  LicenseService: {
    isFeatureEnabled: vi.fn(),
  },
}));

import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { LicenseService } from '@/lib/services/license-service';
import { checkFeatureAccess } from './feature-check';

const getServerSessionMock = getServerSession as any;
const findUniqueMock = (db as any).user.findUnique as any;
const isFeatureEnabledMock = (LicenseService as any).isFeatureEnabled as any;

describe('checkFeatureAccess', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns Unauthorized when no session', async () => {
    getServerSessionMock.mockResolvedValue(null);

    const r = await checkFeatureAccess('VEHICLE_MANAGEMENT');
    expect(r.allowed).toBe(false);
    expect(r.error).toBe('Unauthorized');
  });

  it('returns User not found when db user does not exist', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } });
    findUniqueMock.mockResolvedValue(null);

    const r = await checkFeatureAccess('VEHICLE_MANAGEMENT');
    expect(r.allowed).toBe(false);
    expect(r.error).toBe('User not found');
  });

  it('returns No organization found when user has no organizationId', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } });
    findUniqueMock.mockResolvedValue({ organizationId: null, role: 'INSTRUCTOR' });

    const r = await checkFeatureAccess('VEHICLE_MANAGEMENT');
    expect(r.allowed).toBe(false);
    expect(r.error).toBe('No organization found');
  });

  it('returns Feature not enabled when license denies it', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } });
    findUniqueMock.mockResolvedValue({ organizationId: 'org1', role: 'INSTRUCTOR' });
    isFeatureEnabledMock.mockResolvedValue(false);

    const r = await checkFeatureAccess('VEHICLE_MANAGEMENT');
    expect(r.allowed).toBe(false);
    expect(r.error).toBe('Feature not enabled');
  });

  it('returns allowed when feature is enabled', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'u1' } });
    findUniqueMock.mockResolvedValue({ organizationId: 'org1', role: 'INSTRUCTOR' });
    isFeatureEnabledMock.mockResolvedValue(true);

    const r = await checkFeatureAccess('VEHICLE_MANAGEMENT');
    expect(r.allowed).toBe(true);
    expect(r.organizationId).toBe('org1');
  });
});
