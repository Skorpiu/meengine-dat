import { describe, it, expect, vi, beforeEach } from "vitest";

const hoisted = vi.hoisted(() => ({
  hashMock: vi.fn().mockResolvedValue("hashed-stub"),
}));

vi.mock("bcryptjs", () => ({
  default: { hash: hoisted.hashMock },
}));

import {
  upsertPlatformAdmin,
  UPSERT_PLATFORM_ADMIN_MISSING_CREDENTIALS,
} from "./platform-admins";

beforeEach(() => {
  vi.clearAllMocks();
  hoisted.hashMock.mockResolvedValue("hashed-stub");
});

function makePrisma(
  upsertImpl = vi.fn().mockResolvedValue({
    id: "user-1",
    email: "ops@example.invalid",
    role: "PLATFORM_ADMIN",
  }),
) {
  return { user: { upsert: upsertImpl } };
}

describe("upsertPlatformAdmin", () => {
  it("upserts PLATFORM_ADMIN with expected fields and null organizationId", async () => {
    const upsert = vi.fn().mockResolvedValue({
      id: "u1",
      email: "ops@example.invalid",
      role: "PLATFORM_ADMIN",
    });
    const prisma = makePrisma(upsert);

    const result = await upsertPlatformAdmin(prisma, {
      email: "Ops@Example.invalid",
      password: "secret-value",
      firstName: "Pat",
      lastName: "Lee",
    });

    expect(hoisted.hashMock).toHaveBeenCalledWith("secret-value", 12);
    expect(upsert).toHaveBeenCalledTimes(1);
    const arg = upsert.mock.calls[0][0];
    expect(arg.where).toEqual({ email: "ops@example.invalid" });
    expect(arg.create).toMatchObject({
      email: "ops@example.invalid",
      passwordHash: "hashed-stub",
      role: "PLATFORM_ADMIN",
      firstName: "Pat",
      lastName: "Lee",
      isApproved: true,
      isEmailVerified: true,
      organizationId: null,
    });
    expect(arg.update).toMatchObject({
      passwordHash: "hashed-stub",
      role: "PLATFORM_ADMIN",
      isApproved: true,
      isEmailVerified: true,
      organizationId: null,
    });
    expect(arg.create.emailVerified).toBeInstanceOf(Date);
    expect(arg.update.emailVerified).toBeInstanceOf(Date);
    expect(result).toEqual({
      id: "u1",
      email: "ops@example.invalid",
      role: "PLATFORM_ADMIN",
    });
  });

  it("defaults firstName and lastName when missing or blank", async () => {
    const upsert = vi.fn().mockResolvedValue({
      id: "u1",
      email: "ops@example.invalid",
      role: "PLATFORM_ADMIN",
    });
    const prisma = makePrisma(upsert);

    await upsertPlatformAdmin(prisma, {
      email: "ops@example.invalid",
      password: "secret-value",
    });
    expect(upsert.mock.calls[0][0].create.firstName).toBe("Platform");
    expect(upsert.mock.calls[0][0].create.lastName).toBe("Admin");

    upsert.mockClear();
    await upsertPlatformAdmin(prisma, {
      email: "ops@example.invalid",
      password: "secret-value",
      firstName: "   ",
      lastName: "",
    });
    expect(upsert.mock.calls[0][0].create.firstName).toBe("Platform");
    expect(upsert.mock.calls[0][0].create.lastName).toBe("Admin");
  });

  it("rejects missing or blank email", async () => {
    const prisma = makePrisma();
    await expect(
      upsertPlatformAdmin(prisma, { email: "", password: "x" }),
    ).rejects.toThrow(UPSERT_PLATFORM_ADMIN_MISSING_CREDENTIALS);
    await expect(
      upsertPlatformAdmin(prisma, { email: "   ", password: "x" }),
    ).rejects.toThrow(UPSERT_PLATFORM_ADMIN_MISSING_CREDENTIALS);
  });

  it("rejects missing or blank password", async () => {
    const prisma = makePrisma();
    await expect(
      upsertPlatformAdmin(prisma, { email: "a@b.co", password: "" }),
    ).rejects.toThrow(UPSERT_PLATFORM_ADMIN_MISSING_CREDENTIALS);
    await expect(
      upsertPlatformAdmin(prisma, { email: "a@b.co", password: "  \t  " }),
    ).rejects.toThrow(UPSERT_PLATFORM_ADMIN_MISSING_CREDENTIALS);
  });
});
