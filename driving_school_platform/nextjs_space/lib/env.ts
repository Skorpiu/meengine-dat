import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).optional(),

  // Data Base (Postgres via Supabase)
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),

  // Auth
  NEXTAUTH_SECRET: z.string().min(1),
  NEXTAUTH_URL: z.string().min(1).optional(),

  // Example: client vars
  NEXT_PUBLIC_APP_URL: z.string().min(1).optional(),

  // Supabase
  SUPABASE_URL: z.string().min(1).optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
})

export const env = envSchema.parse(process.env)
export type Env = z.infer<typeof envSchema>