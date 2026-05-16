/**
 * Vercel Cron: daily demo sandbox reset (lessons + vehicles only).
 * Protected by CRON_SECRET; organization id comes from DEMO_ORGANIZATION_ID only.
 */

import { NextRequest, NextResponse } from "next/server";

import {
  DemoSandboxResetError,
  resetDemoSandbox,
} from "@/lib/demo/demo-sandbox-reset";

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

  const organizationId = process.env.DEMO_ORGANIZATION_ID?.trim();
  if (!organizationId) {
    return NextResponse.json(
      { error: "Demo organization is not configured." },
      { status: 500 },
    );
  }

  try {
    const result = await resetDemoSandbox({
      organizationId,
      apply: true,
    });

    return NextResponse.json({
      success: true,
      deletedLessons: result.deletedLessons,
      deletedVehicles: result.deletedVehicles,
    });
  } catch (e: unknown) {
    if (e instanceof DemoSandboxResetError) {
      if (e.code === "organization_not_found") {
        return NextResponse.json(
          { error: "Demo organization is not configured." },
          { status: 500 },
        );
      }
      if (e.code === "not_demo_organization") {
        return NextResponse.json(
          {
            error: "Demo sandbox reset is not allowed for this organization.",
          },
          { status: 403 },
        );
      }
    }

    console.error("Demo sandbox cron reset failed.");
    return NextResponse.json(
      { error: "Demo sandbox reset failed." },
      { status: 500 },
    );
  }
}
