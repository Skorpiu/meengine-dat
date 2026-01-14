import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export function normalizeHost(raw: string): string {
  return raw.toLowerCase().trim().replace(/:\d+$/, '');
}

export function getRequestHost(request: Pick<NextRequest, 'headers'>): string | null {
  const xfHost = request.headers.get('x-forwarded-host');
  const host = xfHost || request.headers.get('host');
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
