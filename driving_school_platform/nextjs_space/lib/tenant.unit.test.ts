import { describe, it, expect } from 'vitest';
import { getRequestHost, isLocalHost, isPlatformHost } from './tenant';

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

describe('host helpers', () => {
  it('detects local hosts', () => {
    expect(isLocalHost('localhost')).toBe(true);
    expect(isLocalHost('localhost:3000')).toBe(true);
    expect(isLocalHost('127.0.0.1')).toBe(true);
    expect(isLocalHost('school-a.localhost')).toBe(true);
  });

  it('detects platform hosts via PLATFORM_HOSTS', () => {
    const prev = process.env.PLATFORM_HOSTS;
    process.env.PLATFORM_HOSTS = 'platform.meengine.io,platform2.meengine.io';

    expect(isPlatformHost('platform.meengine.io')).toBe(true);
    expect(isPlatformHost('platform2.meengine.io')).toBe(true);
    expect(isPlatformHost('www.meengine.io')).toBe(false);

    process.env.PLATFORM_HOSTS = prev;
  });
});
