import { expect, type Page } from "@playwright/test";

import type { UserRole } from "@/lib/types";

type LocalE2eSessionUser = {
  email?: string | null;
  role?: UserRole | null;
  organizationId?: string | null;
};

type LocalE2eSessionPayload = {
  user?: LocalE2eSessionUser | null;
};

export function isEstablishedLocalE2eSessionUser(
  user: LocalE2eSessionUser | null | undefined,
  expectedRole: UserRole,
): user is LocalE2eSessionUser & {
  email: string;
  role: UserRole;
  organizationId: string;
} {
  return Boolean(
    user?.email && user.role === expectedRole && user.organizationId,
  );
}

export async function readBrowserSession(
  page: Page,
): Promise<LocalE2eSessionPayload | null> {
  return page.evaluate(async () => {
    const response = await fetch("/api/auth/session");
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as LocalE2eSessionPayload;
  });
}

export async function waitForAuthenticatedSession(
  page: Page,
  expectedRole: UserRole,
): Promise<LocalE2eSessionUser> {
  let sessionUser: LocalE2eSessionUser | null = null;

  await expect
    .poll(
      async () => {
        const session = await readBrowserSession(page);
        const user = session?.user;
        if (!isEstablishedLocalE2eSessionUser(user, expectedRole)) {
          return null;
        }
        sessionUser = user;
        return user.role;
      },
      { timeout: 30_000 },
    )
    .toBe(expectedRole);

  if (!sessionUser) {
    throw new Error(
      `Expected authenticated ${expectedRole} session before continuing browser-E2E assertions.`,
    );
  }

  return sessionUser;
}

export async function loginWithLocalE2eCredentials(
  page: Page,
  email: string,
  password: string,
  expectedRole: UserRole,
): Promise<LocalE2eSessionUser> {
  await page.goto("/auth/login");
  await page.getByLabel(/^email$/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);

  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes("/api/auth/callback/credentials") &&
        response.request().method() === "POST",
      { timeout: 30_000 },
    ),
    page.getByRole("button", { name: /^sign in$/i }).click(),
  ]);

  const sessionUser = await waitForAuthenticatedSession(page, expectedRole);

  const expectedPathByRole: Partial<Record<UserRole, string>> = {
    SUPER_ADMIN: "/admin",
    INSTRUCTOR: "/instructor",
    STUDENT: "/student",
    PLATFORM_ADMIN: "/platform",
  };
  const expectedPath = expectedPathByRole[expectedRole];
  if (expectedPath) {
    await page.goto(expectedPath);
    await expect(page).toHaveURL(
      new RegExp(`${expectedPath.replace("/", "\\/")}(?:\\/|$|\\?)`, "i"),
      { timeout: 30_000 },
    );
  } else {
    await expect(page).not.toHaveURL(/\/auth\/login(?:\?|$)/i, {
      timeout: 30_000,
    });
  }

  return sessionUser;
}
