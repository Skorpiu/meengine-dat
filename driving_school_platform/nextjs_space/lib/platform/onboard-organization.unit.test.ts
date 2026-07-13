import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const organizationDomainFindMany = vi.fn();
  const userFindUnique = vi.fn();
  const organizationCreate = vi.fn();
  const organizationDomainCreateMany = vi.fn();
  const userCreate = vi.fn();
  const transaction = vi.fn();

  const prismaMock = {
    organizationDomain: { findMany: organizationDomainFindMany },
    user: { findUnique: userFindUnique },
    $transaction: transaction,
  };

  return {
    prismaMock,
    organizationDomainFindMany,
    userFindUnique,
    organizationCreate,
    organizationDomainCreateMany,
    userCreate,
    transaction,
    createLicenseKey: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({
  db: h.prismaMock,
}));

vi.mock("@/lib/services/license-service", () => ({
  LicenseService: {
    createLicenseKey: h.createLicenseKey,
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
  },
}));

import type { FeatureKey } from "@/lib/config/license-features";
import { onboardOrganization } from "./onboard-organization";

const baseInput = {
  name: "Example School",
  hosts: ["school.example.com"],
  primaryHost: "school.example.com",
  schoolAdminEmail: "admin@school.example.com",
  schoolAdminPassword: "password123",
  schoolAdminFirstName: "Ada",
  schoolAdminLastName: "Admin",
  licenseFeatureKeys: ["LESSON_MANAGEMENT"] as FeatureKey[],
};

beforeEach(() => {
  vi.clearAllMocks();
  h.organizationDomainFindMany.mockResolvedValue([]);
  h.userFindUnique.mockResolvedValue(null);
  h.createLicenseKey.mockResolvedValue({ key: "license-key" });
  h.transaction.mockImplementation(async (callback) =>
    callback({
      organization: {
        create: h.organizationCreate.mockResolvedValue({
          id: "org-1",
          name: "Example School",
        }),
      },
      organizationDomain: {
        createMany: h.organizationDomainCreateMany.mockResolvedValue({
          count: 1,
        }),
      },
      user: {
        create: h.userCreate.mockResolvedValue({
          id: "user-1",
          email: "admin@school.example.com",
          firstName: "Ada",
          lastName: "Admin",
          role: "SUPER_ADMIN",
        }),
      },
    }),
  );
});

describe("onboardOrganization", () => {
  it("creates the tenant administrator with persisted SUPER_ADMIN role", async () => {
    const result = await onboardOrganization(baseInput, {
      createdByUserId: "platform-admin-1",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.schoolAdmin.role).toBe("SUPER_ADMIN");
    expect(h.userCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: "SUPER_ADMIN",
          email: "admin@school.example.com",
          firstName: "Ada",
          lastName: "Admin",
        }),
      }),
    );
  });
});
