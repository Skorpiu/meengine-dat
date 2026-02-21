import { describe, it, expect } from 'vitest';
import { getRequestHost } from './tenant';

describe('getRequestHost', () => {
  it('works with Headers (NextRequest style)', () => {
    const req = { headers: new Headers({ host: 'localhost:3000' }) };
    expect(getRequestHost(req)).toBe('localhost');
  });

  it('works with plain object headers (NextAuth authorize style)', () => {
    const req = { headers: { host: 'www.meengine.io', 'x-forwarded-host': 'www.meengine.io' } };
    expect(getRequestHost(req)).toBe('www.meengine.io');
  });
});
