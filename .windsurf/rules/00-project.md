---
trigger: always_on
---
# DAT - regras do projeto (Always On)

- Stack: Next.js (App Router) + TypeScript + Prisma + Supabase + NextAuth.
- Package manager: pnpm (nunca npm/yarn).
- Objetivo: manter sempre tudo green (lint + typecheck + tests + build).
- Mudanças:
  - Preferir alterações pequenas e seguras.
  - Explicar sempre o “porquê” e listar ficheiros mexidos.
- Segurança:
  - Nunca expor secrets.
  - Variáveis `NEXT_PUBLIC_*` são públicas (não meter segredos nelas).