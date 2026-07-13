import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { LicenseService } from "@/lib/services/license-service";
import type { FeatureKey } from "@/lib/config/license-features";
import { HTTP_STATUS } from "@/lib/constants";

function parseHost(raw: string): string {
  let h = raw.trim().toLowerCase();
  h = h.replace(/^https?:\/\//, "");
  h = h.split("/")[0] ?? "";
  h = h.replace(/:\d+$/, "");
  return h;
}

export type OnboardOrganizationInput = {
  name: string;
  hosts: string[];
  primaryHost: string;
  schoolAdminEmail: string;
  schoolAdminPassword: string;
  schoolAdminFirstName: string;
  schoolAdminLastName: string;
  licenseFeatureKeys: FeatureKey[];
  licenseNotes?: string;
  licenseExpiresAt?: string;
};

export type OnboardOrganizationOk = {
  organizationId: string;
  primaryHost: string;
  hosts: string[];
  schoolAdmin: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  licenseKey: string | null;
};

export type OnboardOrganizationResult =
  | { ok: true; value: OnboardOrganizationOk }
  | { ok: false; status: number; body: unknown };

export async function onboardOrganization(
  input: OnboardOrganizationInput,
  opts: { createdByUserId: string },
): Promise<OnboardOrganizationResult> {
  const hosts = Array.from(new Set(input.hosts.map(parseHost)));
  const primaryHost = parseHost(input.primaryHost);

  if (!hosts.includes(primaryHost)) {
    return {
      ok: false,
      status: HTTP_STATUS.BAD_REQUEST,
      body: { error: "primaryHost must be included in hosts" },
    };
  }

  // Reject obvious bad hosts
  for (const h of hosts) {
    if (!h || h.includes(" ") || h.includes("/") || !h.includes(".")) {
      return {
        ok: false,
        status: HTTP_STATUS.BAD_REQUEST,
        body: { error: `Invalid host: ${h}` },
      };
    }
  }

  // Guard against domain collisions
  const existingDomains = await db.organizationDomain.findMany({
    where: { host: { in: hosts } },
    select: { host: true, organizationId: true },
  });

  if (existingDomains.length > 0) {
    return {
      ok: false,
      status: HTTP_STATUS.CONFLICT,
      body: {
        error: "One or more domains already exist",
        details: { domains: existingDomains.map((d) => d.host).join(", ") },
      },
    };
  }

  // Guard against email collisions
  const existingUser = await db.user.findUnique({
    where: { email: input.schoolAdminEmail.toLowerCase() },
    select: { id: true },
  });

  if (existingUser) {
    return {
      ok: false,
      status: HTTP_STATUS.CONFLICT,
      body: { error: "School admin email already exists" },
    };
  }

  const passwordHash = await bcrypt.hash(input.schoolAdminPassword, 12);

  const result = await db.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: input.name,
      },
    });

    await tx.organizationDomain.createMany({
      data: hosts.map((h) => ({
        organizationId: org.id,
        host: h,
        isPrimary: h === primaryHost,
      })),
    });

    const schoolAdmin = await tx.user.create({
      data: {
        email: input.schoolAdminEmail.toLowerCase(),
        passwordHash,
        role: "SUPER_ADMIN",
        firstName: input.schoolAdminFirstName,
        lastName: input.schoolAdminLastName,
        isApproved: true,
        isEmailVerified: true,
        emailVerified: new Date(),
        organizationId: org.id,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    const expiresAt = input.licenseExpiresAt
      ? new Date(input.licenseExpiresAt)
      : undefined;

    const license = await LicenseService.createLicenseKey(
      org.id,
      input.licenseFeatureKeys,
      expiresAt,
      input.licenseNotes,
      opts.createdByUserId,
    );

    return { org, schoolAdmin, licenseKey: license.key ?? null };
  });

  return {
    ok: true,
    value: {
      organizationId: result.org.id,
      primaryHost,
      hosts,
      schoolAdmin: result.schoolAdmin,
      licenseKey: result.licenseKey,
    },
  };
}
