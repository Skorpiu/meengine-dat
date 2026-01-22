import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => {
  const createMock = vi.fn();

  const prismaMock = {
    configurationHistory: {
      create: createMock,
    },
  };

  return { prismaMock, createMock };
});

vi.mock('@/lib/db', () => ({
  prisma: h.prismaMock,
  db: h.prismaMock,
}));

// IMPORT AFTER MOCKS
import { logConfigurationChange } from '@/lib/config-utils';

beforeEach(() => {
  vi.resetAllMocks();
});

describe('logConfigurationChange (unit)', () => {
  it('persists organizationId when provided', async () => {
    await logConfigurationChange('SystemSetting', 'entity1', 'UPDATED', {
      organizationId: 'orgA',
      entityKey: 'foo',
      oldValue: { foo: 1 },
      newValue: { foo: 2 },
      changedBy: 'u1',
      changedByRole: 'SUPER_ADMIN',
    });

    const arg = h.createMock.mock.calls[0]?.[0];
    expect(arg.data.organizationId).toBe('orgA');
    expect(arg.data.entityType).toBe('SystemSetting');
  });
});
