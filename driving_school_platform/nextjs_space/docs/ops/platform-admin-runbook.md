# PLATFORM_ADMIN account (operators)

Safe operational steps for **creating or updating** a `PLATFORM_ADMIN` user in the database using **`scripts/create-platform-admin.ts`**. This is **documentation only**; there is no platform admin management UI or API in the baseline product.

Do **not** put real passwords, production emails, database URLs, or keys in tickets, chat, git, or screenshots. **Never** publish PLATFORM_ADMIN credentials as demo or example values.

---

## When to use this script

- **Bootstrap** the first platform operator account for an environment (after `DATABASE_URL` points at the correct database and migrations are applied).
- **Rotate credentials** when a password may have been exposed, or when staffing changes require a new operator identity (create a new user or update the existing row via the same upsert).
- **Repair role state** if a row must be forced back to `PLATFORM_ADMIN` with `organizationId` cleared (the script’s update path sets role, approval flags, and `organizationId: null`).

The script performs a Prisma **`upsert`** on **`User`** by **email**: it **creates** a new row or **updates** an existing one. This is a **persistent database user**, not a temporary or session-only account.

---

## Hostname and tenant boundaries

- **Sign in** for platform work should use the **platform hostname** in production split-host setups (for example open `https://platform.example.com/auth/login` and then `/platform` on that same origin). Replace `platform.example.com` with your real platform host; do not use customer tenant hosts as the primary operator entry point. See **[production-host-split.md](./production-host-split.md)**.
- **Do not** map the platform hostname to a school tenant via **`OrganizationDomain`**. PLATFORM_ADMIN users are **not** tenant users and are stored with **`organizationId: null`** by this script.

---

## Password and secrecy

- Use a **strong, unique** password from your password manager or vault process.
- **Rotate** the password (re-run the script with a new secret) if there is any suspicion of exposure.
- Prefer **not** typing the password inline in the shell (it can end up in shell history). The flow below uses **`read -rsp`** in **bash** so the password is not echoed; use an equivalent pattern in other shells if needed (for example a one-off secret injection from your vault, or Git Bash on Windows for this exact snippet).

---

## Preconditions

1. Working directory: **`driving_school_platform/nextjs_space`** (so `dotenv` can load `.env` / `.env.local` and `pnpm` resolves scripts).
2. **`DATABASE_URL`** in that environment points at the database you intend to modify (typically production or staging only when you mean to).
3. Dependencies installed (`pnpm install` in that package) and Prisma client available (`pnpm exec prisma generate` if your machine has never generated).

---

## Safe command flow (bash)

From the **repository root**, enter the app package, set **non-secret** placeholders and names, capture the password **without echo**, run the script, then **clear** the variables.

```bash
cd driving_school_platform/nextjs_space

export PLATFORM_ADMIN_EMAIL="platform-admin@example.invalid"
export PLATFORM_ADMIN_FIRST_NAME="Example"
export PLATFORM_ADMIN_LAST_NAME="Operator"

read -rsp "PLATFORM_ADMIN_PASSWORD (not echoed): " PLATFORM_ADMIN_PASSWORD
echo

pnpm exec tsx scripts/create-platform-admin.ts

unset PLATFORM_ADMIN_EMAIL PLATFORM_ADMIN_PASSWORD PLATFORM_ADMIN_FIRST_NAME PLATFORM_ADMIN_LAST_NAME
```

- Replace `platform-admin@example.invalid` with the real operator email for that environment (still a secret-adjacent identifier—share through your normal channel, not in public docs).
- **`PLATFORM_ADMIN_FIRST_NAME`** and **`PLATFORM_ADMIN_LAST_NAME`** are optional; if omitted, the script defaults to `Platform` / `Admin`.
- After **`unset`**, the password should no longer be in the shell’s exported environment for that session. If you typed the password on the command line elsewhere by mistake, **rotate** it and consider clearing or rotating shell history per your OS policy.

---

## Related

- [production-host-split.md](./production-host-split.md) — tenant vs platform hosts, `PLATFORM_HOSTS`, OrganizationDomain rules.
- [environment-variables.md](./environment-variables.md) — optional script env vars (`PLATFORM_ADMIN_*`).
- [smoke-test-checklist.md](./smoke-test-checklist.md) — where to run platform UI smoke after deploy.
