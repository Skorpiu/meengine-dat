import { loadEnvConfig } from "@next/env";
import {
  assertLocalDevelopmentDatabaseAllowed,
  readLocalDevelopmentDatabaseGuardInput,
} from "../lib/ops/local-development-database-guard";

async function main() {
  // carrega .env/.env.local/.env.test como o Next faz
  loadEnvConfig(process.cwd());

  // só importa depois de carregar envs
  await import("../lib/env");

  const isolation = assertLocalDevelopmentDatabaseAllowed(
    readLocalDevelopmentDatabaseGuardInput(process.env),
  );
  if (!isolation.ok) {
    throw new Error(isolation.message);
  }

  console.log("✅ env:check ok");
}

main().catch((err) => {
  console.error("❌ env:check failed");
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
