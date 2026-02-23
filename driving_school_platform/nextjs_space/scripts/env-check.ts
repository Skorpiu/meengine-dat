import { loadEnvConfig } from '@next/env'

async function main() {
  // carrega .env/.env.local/.env.test como o Next faz
  loadEnvConfig(process.cwd())

  // só importa depois de carregar envs
  await import('../lib/env')

  console.log('✅ env:check ok')
}

main().catch((err) => {
  console.error('❌ env:check failed')
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})