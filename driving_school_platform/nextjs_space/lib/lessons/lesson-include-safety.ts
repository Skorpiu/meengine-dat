import { expect } from "vitest";
import { LESSON_NESTED_USER_SELECT } from "@/lib/users/user-public-select";

type NestedUserInclude = {
  include?: {
    user?: boolean | { select?: Record<string, unknown> };
  };
};

/**
 * Assert lesson Prisma include uses safe nested user select (no `user: true`).
 */
export function expectLessonIncludeSanitizesNestedUsers(
  include: unknown,
): void {
  const root = include as Record<string, NestedUserInclude>;
  for (const relation of ["student", "instructor"] as const) {
    const rel = root[relation];
    expect(rel?.include?.user).toBeDefined();
    expect(rel?.include?.user).not.toBe(true);
    const userArg = rel?.include?.user;
    expect(userArg).toEqual({ select: LESSON_NESTED_USER_SELECT });
  }
  expect(JSON.stringify(include)).not.toContain("passwordHash");
}

type NestedUserSelect = {
  select?: {
    user?: boolean | { select?: Record<string, unknown> };
  };
};

/**
 * Assert lesson Prisma `select` uses safe nested user select (no `user: true`).
 */
export function expectLessonSelectSanitizesNestedUsers(select: unknown): void {
  const root = select as Record<string, NestedUserSelect>;
  for (const relation of ["student", "instructor"] as const) {
    const rel = root[relation]?.select;
    expect(rel?.user).toBeDefined();
    expect(rel?.user).not.toBe(true);
    expect(rel?.user).toEqual({ select: LESSON_NESTED_USER_SELECT });
  }
  expect(JSON.stringify(select)).not.toContain("passwordHash");
}

/** Assert serialized lesson JSON has no nested passwordHash. */
export function expectLessonJsonHasNoNestedPasswordHash(
  payload: unknown,
): void {
  expect(JSON.stringify(payload)).not.toContain("passwordHash");
}
