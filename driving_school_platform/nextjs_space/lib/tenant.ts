import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export function normalizeHost(raw: string): string {
  return raw.toLowerCase().trim().replace(/:\d+$/, '');
}

type HeadersLike = Headers | Record<string, string | string[] | undefined>;

function readHeader(headers: HeadersLike, name: string): string | null {
  const anyHeaders: any = headers as any;

  // NextRequest / Request (Headers)
  if (anyHeaders && typeof anyHeaders.get === 'function') {
    return anyHeaders.get(name);
  }

  // NextAuth authorize() req.headers (plain object)
  const key = name.toLowerCase();
  const v = anyHeaders?.[key] ?? anyHeaders?.[name];

  if (Array.isArray(v)) return v.join(',');
  return typeof v === 'string' ? v : null;
}

export function getRequestHost(request: { headers: HeadersLike }): string | null {
  const xfHost = readHeader(request.headers, 'x-forwarded-host');
  const host = xfHost || readHeader(request.headers, 'host');
  if (!host) return null;

  // Pode vir "a.com, b.com" — queremos o primeiro
  const first = host.split(',')[0]?.trim();
  return first ? normalizeHost(first) : null;
}

export async function resolveOrganizationIdFromHost(host: string): Promise<string | null> {
  const h = normalizeHost(host);

  if (LOCAL_HOSTS.has(h) || h.endsWith('.localhost')) return null;

  const domain = await db.organizationDomain.findUnique({
    where: { host: h },
    select: { organizationId: true },
  });

  return domain?.organizationId ?? null;
}

export async function resolveTenantOrganizationId(
  request: NextRequest
): Promise<{ host: string | null; organizationId: string | null }> {
  const host = getRequestHost(request);
  if (!host) return { host: null, organizationId: null };

  const organizationId = await resolveOrganizationIdFromHost(host);
  return { host, organizationId };
}
