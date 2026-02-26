import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function getPlatformHosts(): Set<string> {
  const raw = process.env.PLATFORM_HOSTS ?? "platform.meengine.io";
  const hosts = raw
    .split(",")
    .map((h) => normalizeHost(h))
    .filter(Boolean);
  return new Set(hosts);
}

export function isLocalHost(host: string | null): boolean {
  if (!host) return false;
  const h = normalizeHost(host);
  return LOCAL_HOSTS.has(h) || h.endsWith(".localhost");
}

export function isPlatformHost(host: string | null): boolean {
  if (!host) return false;
  const h = normalizeHost(host);
  return getPlatformHosts().has(h);
}

export function normalizeHost(raw: string): string {
  return raw.toLowerCase().trim().replace(/:\d+$/, "");
}

type HeadersLike =
  | { get(name: string): string | null }
  | Record<string, string | string[] | undefined>;

function hasGet(
  headers: HeadersLike,
): headers is { get(name: string): string | null } {
  return typeof (headers as { get?: unknown }).get === "function";
}

function readHeader(headers: HeadersLike, name: string): string | null {
  // NextRequest / Request (Headers)
  if (hasGet(headers)) return headers.get(name);

  // NextAuth authorize() req.headers (plain object)
  const obj = headers as Record<string, string | string[] | undefined>;
  const key = name.toLowerCase();
  const v = obj[key] ?? obj[name];

  if (Array.isArray(v)) return v.join(",");
  return typeof v === "string" ? v : null;
}

export function getRequestHost(request: {
  headers: HeadersLike;
}): string | null {
  const xfHost = readHeader(request.headers, "x-forwarded-host");
  const host = xfHost || readHeader(request.headers, "host");
  if (!host) return null;

  // Pode vir "a.com, b.com" — queremos o primeiro
  const first = host.split(",")[0]?.trim();
  return first ? normalizeHost(first) : null;
}

export async function resolveOrganizationIdFromHost(
  host: string,
): Promise<string | null> {
  const h = normalizeHost(host);

  if (isLocalHost(h)) return null;

  const domain = await db.organizationDomain.findUnique({
    where: { host: h },
    select: { organizationId: true },
  });

  return domain?.organizationId ?? null;
}

export async function resolveTenantOrganizationId(
  request: NextRequest,
): Promise<{ host: string | null; organizationId: string | null }> {
  const host = getRequestHost(request);
  if (!host) return { host: null, organizationId: null };

  const organizationId = await resolveOrganizationIdFromHost(host);
  return { host, organizationId };
}
