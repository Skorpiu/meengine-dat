/**
 * Read-only production smoke API checks (no auth, no persisted writes).
 *
 * Usage:
 *   DAT_SMOKE_BASE_URL=https://www.meengine.io DAT_E2E_ALLOW_PRODUCTION=true DAT_SMOKE_ALLOWED_HOSTS=www.meengine.io pnpm e2e:smoke:api
 */

import { assertSmokeTargetAllowed } from "../e2e/helpers/env-guards";
import { runSmokeApiChecks } from "../e2e/helpers/smoke-api-checks";

async function main(): Promise<void> {
  const { baseUrl } = assertSmokeTargetAllowed();
  const results = await runSmokeApiChecks(baseUrl);

  let failed = false;
  for (const result of results) {
    const label = result.ok ? "PASS" : "FAIL";
    console.log(`${label}: ${result.name} — ${result.detail}`);
    if (!result.ok) failed = true;
  }

  if (failed) {
    console.error("smoke-production-api: one or more checks failed");
    process.exit(1);
  }

  console.log("smoke-production-api: all checks passed");
}

main().catch((err) => {
  console.error("smoke-production-api failed");
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
