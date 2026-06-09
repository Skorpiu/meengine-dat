import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const getServerSessionMock = vi.fn();
  const guardTenantAuthenticatedRouteMock = vi.fn();
  const organizationFindUniqueMock = vi.fn();
  const userFindUniqueMock = vi.fn();
  const userFindFirstMock = vi.fn();
  const userCreateMock = vi.fn();
  const userUpdateManyMock = vi.fn();
  const userDeleteManyMock = vi.fn();
  const studentCreateMock = vi.fn();
  const studentUpdateManyMock = vi.fn();
  const studentFindFirstMock = vi.fn();
  const instructorCreateMock = vi.fn();
  const instructorUpdateManyMock = vi.fn();
  const categoryFindFirstMock = vi.fn();
  const transmissionFindFirstMock = vi.fn();

  const prismaMock = {
    user: {
      findUnique: userFindUniqueMock,
      findFirst: userFindFirstMock,
      create: userCreateMock,
      updateMany: userUpdateManyMock,
      deleteMany: userDeleteManyMock,
    },
    organization: { findUnique: organizationFindUniqueMock },
    student: {
      create: studentCreateMock,
      updateMany: studentUpdateManyMock,
      findFirst: studentFindFirstMock,
    },
    instructor: {
      create: instructorCreateMock,
      updateMany: instructorUpdateManyMock,
    },
    category: { findFirst: categoryFindFirstMock },
    transmissionType: { findFirst: transmissionFindFirstMock },
  };

  return {
    getServerSessionMock,
    guardTenantAuthenticatedRouteMock,
    organizationFindUniqueMock,
    userFindUniqueMock,
    userFindFirstMock,
    userCreateMock,
    userUpdateManyMock,
    userDeleteManyMock,
    studentCreateMock,
    studentUpdateManyMock,
    studentFindFirstMock,
    prismaMock,
  };
});

vi.mock("next-auth", () => ({
  getServerSession: h.getServerSessionMock,
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/tenant", () => ({
  guardTenantAuthenticatedRoute: h.guardTenantAuthenticatedRouteMock,
}));

vi.mock("@/lib/db", () => ({
  prisma: h.prismaMock,
}));

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed") },
}));

import { POST as createUser } from "./create/route";
import { PUT as updateUser } from "./update/route";
import { DELETE as deleteUser } from "./delete/route";

const demoSession = {
  user: {
    id: "admin1",
    role: "SUPER_ADMIN",
    organizationId: "org-demo",
  },
};

const prodSession = {
  user: {
    id: "admin1",
    role: "SUPER_ADMIN",
    organizationId: "org1",
  },
};

beforeEach(() => {
  vi.resetAllMocks();
  h.guardTenantAuthenticatedRouteMock.mockResolvedValue({ allowed: true });
  h.organizationFindUniqueMock.mockResolvedValue({ isDemo: false });
  h.getServerSessionMock.mockResolvedValue(prodSession);
  h.userFindFirstMock.mockResolvedValue({ id: "target1", role: "STUDENT" });
  h.userUpdateManyMock.mockResolvedValue({ count: 1 });
  h.userDeleteManyMock.mockResolvedValue({ count: 1 });
});

describe("User management mutations (tenant + demo guards)", () => {
  it("POST create blocks demo org with demo_restricted_action", async () => {
    h.getServerSessionMock.mockResolvedValue(demoSession);
    h.organizationFindUniqueMock.mockResolvedValue({ isDemo: true });

    const res = await createUser(
      new Request("http://localhost/api/users/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName: "A",
          lastName: "B",
          email: "a@example.com",
          role: "STUDENT",
        }),
      }) as any,
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({
      error: "This action is restricted in the public demo environment.",
      code: "demo_restricted_action",
    });
    expect(h.userCreateMock).not.toHaveBeenCalled();
  });

  it("POST create rejects PLATFORM_ADMIN role", async () => {
    const res = await createUser(
      new Request("http://localhost/api/users/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName: "A",
          lastName: "B",
          email: "a@example.com",
          role: "PLATFORM_ADMIN",
        }),
      }) as any,
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Invalid role" });
    expect(h.userCreateMock).not.toHaveBeenCalled();
  });

  it("POST create scopes user to session organization on happy path", async () => {
    h.userFindUniqueMock.mockResolvedValue(null);
    h.userCreateMock.mockResolvedValue({
      id: "u-new",
      email: "new@example.com",
      firstName: "N",
      lastName: "E",
      role: "STUDENT",
    });

    const res = await createUser(
      new Request("http://localhost/api/users/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName: "N",
          lastName: "E",
          email: "new@example.com",
          role: "STUDENT",
        }),
      }) as any,
    );

    expect(res.status).toBe(200);
    expect(h.userCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org1",
          role: "STUDENT",
        }),
      }),
    );
    const body = await res.json();
    expect(body.user).toBeDefined();
    expect(body.user).not.toHaveProperty("passwordHash");
    expect(JSON.stringify(body)).not.toContain("passwordHash");
  });

  it("PUT update blocks demo org", async () => {
    h.getServerSessionMock.mockResolvedValue(demoSession);
    h.organizationFindUniqueMock.mockResolvedValue({ isDemo: true });

    const res = await updateUser(
      new Request("http://localhost/api/users/update", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: "target1",
          firstName: "X",
        }),
      }) as any,
    );

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("demo_restricted_action");
    expect(h.userUpdateManyMock).not.toHaveBeenCalled();
  });

  it("PUT update rejects PLATFORM_ADMIN in body role", async () => {
    const res = await updateUser(
      new Request("http://localhost/api/users/update", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: "target1",
          role: "PLATFORM_ADMIN",
        }),
      }) as any,
    );

    expect(res.status).toBe(400);
    expect(h.userUpdateManyMock).not.toHaveBeenCalled();
  });

  it("PUT update scopes updateMany by organizationId", async () => {
    const res = await updateUser(
      new Request("http://localhost/api/users/update", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: "target1",
          firstName: "Updated",
        }),
      }) as any,
    );

    expect(res.status).toBe(200);
    expect(h.userFindFirstMock).toHaveBeenCalledWith({
      where: { id: "target1", organizationId: "org1" },
      select: { id: true },
    });
    expect(h.userUpdateManyMock).toHaveBeenCalledWith({
      where: { id: "target1", organizationId: "org1" },
      data: expect.objectContaining({ firstName: "Updated" }),
    });
  });

  it("PUT update ignores email in body (use dedicated change-email flow)", async () => {
    const res = await updateUser(
      new Request("http://localhost/api/users/update", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: "target1",
          firstName: "Updated",
          email: "new@school.test",
        }),
      }) as any,
    );

    expect(res.status).toBe(200);
    expect(h.userUpdateManyMock).toHaveBeenCalledWith({
      where: { id: "target1", organizationId: "org1" },
      data: expect.not.objectContaining({ email: "new@school.test" }),
    });
  });

  it("DELETE blocks demo org", async () => {
    h.getServerSessionMock.mockResolvedValue(demoSession);
    h.organizationFindUniqueMock.mockResolvedValue({ isDemo: true });

    const res = await deleteUser(
      new Request("http://localhost/api/users/delete?userId=target1") as any,
    );

    expect(res.status).toBe(403);
    expect(h.userDeleteManyMock).not.toHaveBeenCalled();
  });

  it("DELETE scopes deleteMany by organizationId for non-STUDENT/INSTRUCTOR roles", async () => {
    h.userFindFirstMock.mockResolvedValue({
      id: "target2",
      role: "SUPER_ADMIN",
    });

    const res = await deleteUser(
      new Request("http://localhost/api/users/delete?userId=target2") as any,
    );

    expect(res.status).toBe(200);
    expect(h.userDeleteManyMock).toHaveBeenCalledWith({
      where: { id: "target2", organizationId: "org1" },
    });
  });

  it("DELETE returns 409 use_student_delete_policy for STUDENT role", async () => {
    h.userFindFirstMock.mockResolvedValue({
      id: "target-student",
      role: "STUDENT",
    });

    const res = await deleteUser(
      new Request(
        "http://localhost/api/users/delete?userId=target-student",
      ) as any,
    );

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("use_student_delete_policy");
    expect(body.error).toBe("use_student_delete_policy");
    expect(body.message).toContain("Students → Profiles");
    expect(body.message).toContain("Remove/Reactivate app access");
    expect(h.userDeleteManyMock).not.toHaveBeenCalled();
    expect(h.studentUpdateManyMock).not.toHaveBeenCalled();
    expect(h.studentFindFirstMock).not.toHaveBeenCalled();
  });

  it("DELETE returns 409 use_instructor_delete_policy for INSTRUCTOR role", async () => {
    h.userFindFirstMock.mockResolvedValue({
      id: "target-instructor",
      role: "INSTRUCTOR",
    });

    const res = await deleteUser(
      new Request(
        "http://localhost/api/users/delete?userId=target-instructor",
      ) as any,
    );

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe("use_instructor_delete_policy");
    expect(body.message).toContain("Instructors → Profiles");
    expect(h.userDeleteManyMock).not.toHaveBeenCalled();
  });

  it("DELETE prevents self-delete", async () => {
    h.userFindFirstMock.mockResolvedValue({ id: "admin1", role: "STUDENT" });
    const res = await deleteUser(
      new Request("http://localhost/api/users/delete?userId=admin1") as any,
    );

    expect(res.status).toBe(400);
    expect(h.userDeleteManyMock).not.toHaveBeenCalled();
  });
});
