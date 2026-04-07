import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

type UserRole = "STUDENT" | "INSTRUCTOR" | "SUPER_ADMIN" | "PLATFORM_ADMIN";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      firstName: string | null;
      lastName: string | null;
      isApproved: boolean;
      organizationId: string | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: UserRole;
    firstName: string | null;
    lastName: string | null;
    isApproved: boolean;
    organizationId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    role: UserRole;
    firstName: string | null;
    lastName: string | null;
    isApproved: boolean;
    organizationId: string | null;
  }
}
