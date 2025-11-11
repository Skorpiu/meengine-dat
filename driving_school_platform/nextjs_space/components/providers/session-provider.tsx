
"use client"

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react"
import { ReactNode, useEffect, useState } from "react"

interface SessionProviderProps {
  children: ReactNode
}

export function SessionProvider({ children }: SessionProviderProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>
}
