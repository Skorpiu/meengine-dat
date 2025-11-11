
import { UserRole } from "@prisma/client"
import { DefaultSession, DefaultUser } from "next-auth"
import { DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: UserRole
      firstName: string
      lastName: string
      isApproved: boolean
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    role: UserRole
    firstName: string
    lastName: string
    isApproved: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role: UserRole
    firstName: string
    lastName: string
    isApproved: boolean
  }
}
