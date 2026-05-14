/**
 * Operator script: enable OrganizationFeature rows for a demo org.
 * Does not print emails, passwords, tokens, or connection strings.
 *
 * Default: dry-run (no writes). Apply requires both:
 *   - CLI: --apply
 *   - env: DEMO_SHOWCASE_APPLY=true
 *
 * Feature source (exactly one):
 *   - DEMO_SHOWCASE_PROFILE=basic|premium|full-showcase  (see lib/demo/demo-tier-profiles.ts)
 *   - DEMO_SHOWCASE_FEATURE_KEYS=comma,separated,keys
 *   Do not set both; the script exits with an error if both are provided.
 *
 * Usage:
 *   DEMO_ORGANIZATION_ID=<cuid> DEMO_SHOWCASE_FEATURE_KEYS=key1,key2 pnpm demo:showcase:configure
 *   DEMO_ORGANIZATION_ID=<cuid> DEMO_SHOWCASE_PROFILE=premium pnpm demo:showcase:configure
 *   DEMO_ORGANIZATION_ID=<cuid> DEMO_SHOWCASE_PROFILE=full-showcase DEMO_SHOWCASE_APPLY=true pnpm demo:showcase:configure -- --apply
 *
 * Requires DATABASE_URL — load .env via @next/env (same as check-demo-readiness.ts).
 */

import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import {
  getDemoTierProfile,
  parseDemoTierProfileId,
  type DemoTierProfileId,
} from "../lib/demo/demo-tier-profiles";

loadEnvConfig(process.cwd());

const ENABLED_BY_MARKER = "configure-demo-showcase";

const VALID_PROFILE_IDS: DemoTierProfileId[] = [
  "basic",
  "premium",
  "full-showcase",
];

function parseFeatureKeys(raw: string | undefined): string[] {
  if (raw === undefined || raw.trim() === "") {
    return [];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const k = part.trim();
    if (k === "") continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

function wantsApply(): boolean {
  const envOk =
    process.env.DEMO_SHOWCASE_APPLY?.trim().toLowerCase() === "true";
  const argvOk = process.argv.includes("--apply");
  return envOk && argvOk;
}

type FeatureSource =
  | { kind: "profile"; profileId: DemoTierProfileId }
  | { kind: "manual" };

function resolveFeatureInput():
  | {
      featureKeys: string[];
      source: FeatureSource;
    }
  | { error: string } {
  const profileRaw = process.env.DEMO_SHOWCASE_PROFILE?.trim() ?? "";
  const keysRaw = process.env.DEMO_SHOWCASE_FEATURE_KEYS;
  const keysContent = keysRaw?.trim() ?? "";

  if (profileRaw !== "" && keysContent !== "") {
    return {
      error:
        "Use either DEMO_SHOWCASE_PROFILE or DEMO_SHOWCASE_FEATURE_KEYS, not both.",
    };
  }

  if (profileRaw !== "") {
    const profileId = parseDemoTierProfileId(profileRaw);
    if (profileId === null) {
      return {
        error: `Invalid DEMO_SHOWCASE_PROFILE "${profileRaw}". Valid values: ${VALID_PROFILE_IDS.join(", ")}.`,
      };
    }
    const keys = [...getDemoTierProfile(profileId).featureKeys];
    return { featureKeys: keys, source: { kind: "profile", profileId } };
  }

  if (keysContent !== "") {
    const keys = parseFeatureKeys(keysRaw);
    if (keys.length === 0) {
      return {
        error:
          "DEMO_SHOWCASE_FEATURE_KEYS is not usable after parsing (empty keys). Provide a comma-separated list of feature keys.",
      };
    }
    return { featureKeys: keys, source: { kind: "manual" } };
  }

  return {
    error:
      "Set DEMO_SHOWCASE_PROFILE (basic, premium, or full-showcase) or DEMO_SHOWCASE_FEATURE_KEYS (comma-separated list).",
  };
}

async function main(): Promise<number> {
  const prisma = new PrismaClient();
  try {
    const orgId = process.env.DEMO_ORGANIZATION_ID?.trim();
    if (!orgId) {
      console.error(
        "DEMO_ORGANIZATION_ID is not set. Set it to the demo organization id (CUID) before running.",
      );
      return 1;
    }

    const resolved = resolveFeatureInput();
    if ("error" in resolved) {
      console.error(resolved.error);
      return 1;
    }

    const { featureKeys, source } = resolved;

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, isDemo: true },
    });

    if (!org) {
      console.error(`No organization found with id "${orgId}".`);
      return 1;
    }

    if (!org.isDemo) {
      console.error(
        "Refusing to configure showcase features for a non-demo organization.",
      );
      return 1;
    }

    const apply = wantsApply();
    const mode = apply ? "APPLY" : "DRY-RUN";

    console.log("Configure demo showcase (organization features)");
    console.log(`Organization: ${org.name}`);
    console.log(`isDemo: ${org.isDemo}`);
    if (source.kind === "profile") {
      console.log(
        `Feature source: demo tier profile "${source.profileId}" (${getDemoTierProfile(source.profileId).label})`,
      );
    } else {
      console.log("Feature source: DEMO_SHOWCASE_FEATURE_KEYS (manual list)");
    }
    console.log(`Target feature keys (${featureKeys.length}):`);
    for (const k of featureKeys) {
      console.log(`  - ${k}`);
    }
    console.log(`Mode: ${mode}`);
    console.log("");

    const existing =
      featureKeys.length === 0
        ? []
        : await prisma.organizationFeature.findMany({
            where: { organizationId: orgId, featureKey: { in: featureKeys } },
            select: { featureKey: true, isEnabled: true },
          });
    const byKey = new Map(
      existing.map((r) => [r.featureKey, r.isEnabled] as const),
    );

    type PlannedAction = "create_enabled" | "enable" | "noop_already_enabled";
    const rows: { key: string; action: PlannedAction }[] = [];
    for (const key of featureKeys) {
      const cur = byKey.get(key);
      if (cur === undefined) {
        rows.push({ key, action: "create_enabled" });
      } else if (!cur) {
        rows.push({ key, action: "enable" });
      } else {
        rows.push({ key, action: "noop_already_enabled" });
      }
    }

    const toCreate = rows.filter((r) => r.action === "create_enabled").length;
    const toEnable = rows.filter((r) => r.action === "enable").length;
    const noop = rows.filter((r) => r.action === "noop_already_enabled").length;

    console.log("Planned changes (per feature key):");
    if (rows.length === 0) {
      console.log("  (none — no keys to enable for this source)");
    } else {
      for (const r of rows) {
        const label =
          r.action === "create_enabled"
            ? "upsert: create row with isEnabled=true"
            : r.action === "enable"
              ? "upsert: set isEnabled=true (was false)"
              : "no change (already enabled)";
        console.log(`  - ${r.key}: ${label}`);
      }
    }
    console.log("");
    console.log("Summary:");
    console.log(`  - rows to create as enabled: ${toCreate}`);
    console.log(`  - rows to flip to enabled: ${toEnable}`);
    console.log(`  - already enabled (no write): ${noop}`);

    if (!apply) {
      const envApply =
        process.env.DEMO_SHOWCASE_APPLY?.trim().toLowerCase() === "true";
      const cliApply = process.argv.includes("--apply");
      if (cliApply && !envApply) {
        console.log("");
        console.log(
          "Note: --apply was passed but DEMO_SHOWCASE_APPLY is not true; no writes performed.",
        );
      } else if (envApply && !cliApply) {
        console.log("");
        console.log(
          "Note: DEMO_SHOWCASE_APPLY=true but --apply was not passed (use `pnpm ... -- --apply`); no writes performed.",
        );
      } else if (!cliApply && !envApply) {
        console.log("");
        console.log(
          "Note: to apply, pass --apply and set DEMO_SHOWCASE_APPLY=true (both are required).",
        );
      }
      console.log("");
      console.log("Dry run only. No data was changed.");
      return 0;
    }

    const now = new Date();
    let appliedCreates = 0;
    let appliedUpdates = 0;
    let appliedNoops = 0;

    await prisma.$transaction(async (tx) => {
      for (const r of rows) {
        if (r.action === "noop_already_enabled") {
          appliedNoops += 1;
          continue;
        }

        const before = await tx.organizationFeature.findUnique({
          where: {
            organizationId_featureKey: {
              organizationId: orgId,
              featureKey: r.key,
            },
          },
          select: { id: true },
        });

        await tx.organizationFeature.upsert({
          where: {
            organizationId_featureKey: {
              organizationId: orgId,
              featureKey: r.key,
            },
          },
          create: {
            organizationId: orgId,
            featureKey: r.key,
            isEnabled: true,
            enabledAt: now,
            enabledBy: ENABLED_BY_MARKER,
          },
          update: {
            isEnabled: true,
            enabledAt: now,
            enabledBy: ENABLED_BY_MARKER,
            disabledAt: null,
          },
        });

        if (before === null) {
          appliedCreates += 1;
        } else {
          appliedUpdates += 1;
        }
      }
    });

    console.log("");
    console.log("Applied:");
    console.log(`  - created (enabled): ${appliedCreates}`);
    console.log(`  - updated to enabled: ${appliedUpdates}`);
    console.log(`  - skipped (already enabled): ${appliedNoops}`);
    return 0;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
