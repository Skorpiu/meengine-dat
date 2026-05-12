import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * GET /api/health
 * Lightweight liveness check for load balancers and deploy validation (no database).
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'driving-academy-tool',
    status: 'healthy',
  });
}
