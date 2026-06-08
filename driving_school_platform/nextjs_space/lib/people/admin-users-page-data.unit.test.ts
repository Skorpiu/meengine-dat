import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const userFindManyMock = vi.fn();
  const categoryFindManyMock = vi.fn();
  const transmissionTypeFindManyMock = vi.fn();

  return {
    userFindManyMock,
    categoryFindManyMock,
    transmissionTypeFindManyMock,
    prismaMock: {
      user: { findMany: userFindManyMock },
      category: { findMany: categoryFindManyMock },
      transmissionType: { findMany: transmissionTypeFindManyMock },
    },
  };
});

vi.mock("@/lib/db", () => ({
  prisma: h.prismaMock,
}));

import {
  ADMIN_USERS_PAGE_ROLES,
  loadAdminUsersPageData,
  serializeAdminUsersPageUser,
} from "@/lib/people/admin-users-page-data";

beforeEach(() => {
  vi.resetAllMocks();
  h.userFindManyMock.mockResolvedValue([]);
  h.categoryFindManyMock.mockResolvedValue([{ id: 1, name: "B" }]);
  h.transmissionTypeFindManyMock.mockResolvedValue([{ id: 1, name: "Manual" }]);
});

describe("loadAdminUsersPageData", () => {
  it("scopes users by organizationId and STUDENT/INSTRUCTOR roles only", async () => {
    await loadAdminUsersPageData("org-a");

    expect(h.userFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org-a",
          role: { in: [...ADMIN_USERS_PAGE_ROLES] },
        },
      }),
    );
  });

  it("returns only users from the scoped query result", async () => {
    h.userFindManyMock.mockResolvedValue([
      {
        id: "user-org-a",
        organizationId: "org-a",
        role: "INSTRUCTOR",
        email: "a@school.test",
        firstName: "Ann",
        lastName: "Alpha",
        instructor: null,
        student: null,
      },
    ]);

    const result = await loadAdminUsersPageData("org-a");

    expect(result.users).toHaveLength(1);
    expect(result.users[0].id).toBe("user-org-a");
    expect(result.users[0].organizationId).toBe("org-a");
  });

  it("does not merge users from other organizations into the result", async () => {
    h.userFindManyMock.mockResolvedValue([
      {
        id: "user-org-a",
        organizationId: "org-a",
        role: "STUDENT",
        email: "student@org-a.test",
        firstName: "S",
        lastName: "A",
        instructor: null,
        student: null,
      },
    ]);

    const result = await loadAdminUsersPageData("org-a");

    expect(result.users.map((u) => u.organizationId)).toEqual(["org-a"]);
    expect(result.users.some((u) => u.organizationId === "org-b")).toBe(false);

    const where = h.userFindManyMock.mock.calls[0]?.[0]?.where;
    expect(where.organizationId).toBe("org-a");
    expect(where.organizationId).not.toBe("org-b");
  });

  it("loads global active category and transmission catalogs without organizationId", async () => {
    await loadAdminUsersPageData("org-a");

    expect(h.categoryFindManyMock).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    expect(h.transmissionTypeFindManyMock).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    expect(h.categoryFindManyMock.mock.calls[0]?.[0]?.where).not.toHaveProperty(
      "organizationId",
    );
  });

  it("serializes instructor decimal fields to numbers", () => {
    const serialized = serializeAdminUsersPageUser({
      id: "u1",
      organizationId: "org-a",
      role: "INSTRUCTOR",
      email: "i@test.com",
      firstName: "I",
      lastName: "N",
      student: null,
      instructor: {
        id: "inst-1",
        hourlyRate: { toString: () => "45.50" },
        averageRating: { toString: () => "4.5" },
        passRatePercentage: { toString: () => "88.25" },
      },
    } as never);

    expect(serialized.instructor?.hourlyRate).toBe(45.5);
    expect(serialized.instructor?.averageRating).toBe(4.5);
    expect(serialized.instructor?.passRatePercentage).toBe(88.25);
  });
});
