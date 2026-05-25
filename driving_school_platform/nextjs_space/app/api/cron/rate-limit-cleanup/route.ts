import { NextRequest, NextResponse } from "next/server";

import { cleanupRateLimitBuckets } from "@/lib/rate-limit/cleanup";

const RATE_LIMIT_BUCKET_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

function isCronAuthorized(request: NextRequest, cronSecret: string): boolean {
  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return false;
  }

  return authorization === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return NextResponse.json(
      { error: "Cron secret is not configured." },
      { status: 503 },
    );
  }

  if (!isCronAuthorized(request, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const olderThan = new Date(Date.now() - RATE_LIMIT_BUCKET_RETENTION_MS);

  try {
    const result = await cleanupRateLimitBuckets({ olderThan });

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
    });
  } catch {
    console.error("Rate limit bucket cleanup failed.");
    return NextResponse.json(
      { error: "Rate limit bucket cleanup failed." },
      { status: 500 },
    );
  }
}
