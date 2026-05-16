import { describe, it, expect, vi, beforeEach } from "vitest";

import { DemoSandboxResetError, resetDemoSandbox } from "./demo-sandbox-reset";

function createPrismaMock() {
  const lessonDeleteMany = vi.fn().mockResolvedValue({ count: 2 });
  const vehicleDeleteMany = vi.fn().mockResolvedValue({ count: 1 });

  const tx = {
    lesson: { deleteMany: lessonDeleteMany },
    vehicle: { deleteMany: vehicleDeleteMany },
  };

  const transaction = vi.fn(
    async (fn: (client: typeof tx) => Promise<void>) => {
      await fn(tx);
    },
  );

  return {
    organization: { findUnique: vi.fn() },
    lesson: { count: vi.fn() },
    vehicle: { count: vi.fn() },
    $transaction: transaction,
    lessonDeleteMany,
    vehicleDeleteMany,
  };
}

describe("resetDemoSandbox", () => {
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(() => {
    prisma = createPrismaMock();
  });

  it("throws when organization is missing", async () => {
    prisma.organization.findUnique.mockResolvedValue(null);

    await expect(
      resetDemoSandbox({
        organizationId: "org-missing",
        apply: false,
        prisma: prisma as never,
      }),
    ).rejects.toBeInstanceOf(DemoSandboxResetError);
  });

  it("throws when organization is not demo", async () => {
    prisma.organization.findUnique.mockResolvedValue({
      id: "org-1",
      name: "Prod School",
      isDemo: false,
    });

    await expect(
      resetDemoSandbox({
        organizationId: "org-1",
        apply: false,
        prisma: prisma as never,
      }),
    ).rejects.toBeInstanceOf(DemoSandboxResetError);
  });

  it("returns planned counts without deleting on dry-run", async () => {
    prisma.organization.findUnique.mockResolvedValue({
      id: "org-demo",
      name: "Demo",
      isDemo: true,
    });
    prisma.lesson.count.mockResolvedValue(4);
    prisma.vehicle.count.mockResolvedValue(2);

    const result = await resetDemoSandbox({
      organizationId: "org-demo",
      apply: false,
      prisma: prisma as never,
    });

    expect(result).toEqual({
      organizationId: "org-demo",
      organizationName: "Demo",
      plannedLessons: 4,
      plannedVehicles: 2,
      deletedLessons: 0,
      deletedVehicles: 0,
      applied: false,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("deletes lessons and vehicles in a transaction on apply", async () => {
    prisma.organization.findUnique.mockResolvedValue({
      id: "org-demo",
      name: "Demo",
      isDemo: true,
    });
    prisma.lesson.count.mockResolvedValue(4);
    prisma.vehicle.count.mockResolvedValue(2);

    const result = await resetDemoSandbox({
      organizationId: "org-demo",
      apply: true,
      prisma: prisma as never,
    });

    expect(result.applied).toBe(true);
    expect(result.deletedLessons).toBe(2);
    expect(result.deletedVehicles).toBe(1);
    expect(prisma.lessonDeleteMany).toHaveBeenCalledWith({
      where: { organizationId: "org-demo" },
    });
    expect(prisma.vehicleDeleteMany).toHaveBeenCalledWith({
      where: { organizationId: "org-demo" },
    });
  });
});
