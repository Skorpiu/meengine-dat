import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./db";
import bcrypt from "bcryptjs";
import { getRequestHost, resolveOrganizationIdFromHost } from "./tenant";
import { getCredentialsLoginBlockReason } from "./auth/credentials-login-eligibility";
type GetRequestHostArg = Parameters<typeof getRequestHost>[0];

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email.toLowerCase(),
          },
          include: {
            student: true,
            instructor: true,
          },
        });

        if (!user || !user.passwordHash) {
          throw new Error("Invalid credentials");
        }

        const host = req
          ? getRequestHost(req as unknown as GetRequestHostArg)
          : null;
        const tenantOrgId = host
          ? await resolveOrganizationIdFromHost(host)
          : null;
        const userOrgId = user.organizationId ?? null;

        // If this Host maps to a tenant, user must belong to that tenant
        if (tenantOrgId && tenantOrgId !== userOrgId) {
          throw new Error("Invalid credentials");
        }

        if (!user.isEmailVerified) {
          throw new Error("Please verify your email first");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash,
        );

        if (!isPasswordValid) {
          throw new Error("Invalid credentials");
        }

        if (getCredentialsLoginBlockReason(user) === "not_approved") {
          throw new Error("Invalid credentials");
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isApproved: user.isApproved,
          organizationId: user.organizationId ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.firstName = user.firstName ?? null;
        token.lastName = user.lastName ?? null;
        token.isApproved = user.isApproved;
        token.organizationId = user.organizationId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub ?? session.user.id;
        session.user.role = token.role;
        session.user.firstName = token.firstName ?? null;
        session.user.lastName = token.lastName ?? null;
        session.user.isApproved = token.isApproved;
        session.user.organizationId = token.organizationId ?? null;
      }
      return session;
    },
  },
};
