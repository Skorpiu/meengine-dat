/**
 * Operator script: ensure a demo organization exists with a mapped tenant host.
 * Does not create users, billing rows, or feature flags — use other tooling for those.
 * Does not print emails, passwords, tokens, or connection strings.
 *
 * Default: dry-run. Apply requires both:
 *   - CLI: --apply
 *   - env: DEMO_BOOTSTRAP_APPLY=true
 *
 * Required env:
 *   - DEMO_ORGANIZATION_NAME (exact organization name; unique in schema)
 *   - DEMO_ORGANIZATION_DOMAIN (hostname for OrganizationDomain.host, e.g. demo.meengine.io)
 *
 * Usage:
 *   DEMO_ORGANIZATION_NAME="..." DEMO_ORGANIZATION_DOMAIN=demo.example pnpm demo:org:bootstrap
 *   DEMO_ORGANIZATION_NAME="..." DEMO_ORGANIZATION_DOMAIN=demo.example DEMO_BOOTSTRAP_APPLY=true pnpm demo:org:bootstrap -- --apply
 *
 * Requires DATABASE_URL — load .env via @next/env.
 */

import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";

loadEnvConfig(process.cwd());

function normalizeHost(raw: string): string {
  return raw.toLowerCase().trim().replace(/:\d+$/, "");
}

function wantsApply(): boolean {
  const envOk =
    process.env.DEMO_BOOTSTRAP_APPLY?.trim().toLowerCase() === "true";
  const argvOk = process.argv.includes("--apply");
  return envOk && argvOk;
}

async function main(): Promise<number> {
  const name = process.env.DEMO_ORGANIZATION_NAME?.trim();
  if (!name) {
    console.error(
      "DEMO_ORGANIZATION_NAME is not set. Set it to the exact demo organization name before running.",
    );
    return 1;
  }

  const domainRaw = process.env.DEMO_ORGANIZATION_DOMAIN?.trim();
  if (!domainRaw) {
    console.error(
      "DEMO_ORGANIZATION_DOMAIN is not set. Set it to the tenant hostname (e.g. demo.meengine.io) before running.",
    );
    return 1;
  }

  const host = normalizeHost(domainRaw);
  if (host === "") {
    console.error(
      "DEMO_ORGANIZATION_DOMAIN is empty after normalization. Provide a valid hostname.",
    );
    return 1;
  }

  const prisma = new PrismaClient();
  try {
    const apply = wantsApply();
    const mode = apply ? "APPLY" : "DRY-RUN";

    console.log("Bootstrap demo organization");
    console.log(`Organization name: ${name}`);
    console.log(`Domain host:       ${host}`);
    console.log(`Mode:              ${mode}`);
    console.log("");

    const orgByName = await prisma.organization.findUnique({
      where: { name },
      select: { id: true, name: true, isDemo: true },
    });

    const domainRow = await prisma.organizationDomain.findUnique({
      where: { host },
      select: { id: true, organizationId: true, host: true },
    });

    if (domainRow && orgByName && domainRow.organizationId !== orgByName.id) {
      console.error(
        `Refusing to proceed: host "${host}" is already mapped to organization ${domainRow.organizationId}, which is not the organization named in DEMO_ORGANIZATION_NAME. Resolve the conflict in the database or pick another host.`,
      );
      return 1;
    }

    if (domainRow && !orgByName) {
      const other = await prisma.organization.findUnique({
        where: { id: domainRow.organizationId },
        select: { id: true, name: true },
      });
      console.error(
        `Refusing to proceed: host "${host}" is already mapped to organization ${domainRow.organizationId}` +
          (other ? ` ("${other.name}")` : "") +
          `. DEMO_ORGANIZATION_NAME does not match an existing organization; create or rename via a controlled process before reusing this host.`,
      );
      return 1;
    }

    const needCreateOrg = !orgByName;
    const needSetDemo = orgByName !== null && !orgByName.isDemo;
    const needDomain = domainRow === null;

    console.log("Planned changes:");
    if (needCreateOrg) {
      console.log(
        `  - create organization with name "${name}" and isDemo=true`,
      );
    } else {
      console.log(`  - use existing organization ${orgByName!.id}`);
      if (needSetDemo) {
        console.log("  - set isDemo=true (currently false)");
      } else {
        console.log("  - isDemo already true (no change)");
      }
    }
    if (needDomain) {
      console.log(`  - create OrganizationDomain for host "${host}"`);
    } else {
      console.log(
        `  - domain "${host}" already linked to this organization (no create)`,
      );
    }
    console.log("");

    if (!apply) {
      const envApply =
        process.env.DEMO_BOOTSTRAP_APPLY?.trim().toLowerCase() === "true";
      const cliApply = process.argv.includes("--apply");
      if (cliApply && !envApply) {
        console.log(
          "Note: --apply was passed but DEMO_BOOTSTRAP_APPLY is not true; no writes performed.",
        );
      } else if (envApply && !cliApply) {
        console.log(
          "Note: DEMO_BOOTSTRAP_APPLY=true but --apply was not passed (use `pnpm demo:org:bootstrap -- --apply`); no writes performed.",
        );
      } else if (!cliApply && !envApply) {
        console.log(
          "Note: to apply, pass --apply and set DEMO_BOOTSTRAP_APPLY=true (both are required).",
        );
      }
      console.log("");
      if (orgByName) {
        console.log(`Demo organization id (current): ${orgByName.id}`);
      } else {
        console.log(
          "Demo organization id: (assigned on apply — run with apply flags after reviewing the plan)",
        );
      }
      console.log("");
      console.log("Dry run only. No data was changed.");
      return 0;
    }

    const outcome = { orgId: "" as string };

    await prisma.$transaction(async (tx) => {
      if (needCreateOrg) {
        const created = await tx.organization.create({
          data: {
            name,
            isDemo: true,
          },
          select: { id: true },
        });
        outcome.orgId = created.id;

        if (needDomain) {
          await tx.organizationDomain.create({
            data: {
              organizationId: outcome.orgId,
              host,
              isPrimary: true,
            },
          });
        }
        return;
      }

      outcome.orgId = orgByName!.id;

      if (needSetDemo) {
        await tx.organization.update({
          where: { id: outcome.orgId },
          data: { isDemo: true },
        });
      }

      if (needDomain) {
        const existingCount = await tx.organizationDomain.count({
          where: { organizationId: outcome.orgId },
        });
        await tx.organizationDomain.create({
          data: {
            organizationId: outcome.orgId,
            host,
            isPrimary: existingCount === 0,
          },
        });
      }
    });

    console.log("Applied successfully.");
    console.log("");
    console.log(`Demo organization id: ${outcome.orgId}`);
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
