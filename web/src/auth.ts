import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { authConfig } from "@/auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: String(credentials.email).toLowerCase() },
          include: { role: true, organization: true },
        });
        if (!user?.passwordHash || !user.isActive) return null;
        const ok = await compare(
          String(credentials.password),
          user.passwordHash
        );
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
          role: user.role.name,
          roleId: user.roleId,
          organizationId: user.organizationId ?? undefined,
          organizationName: user.organization?.name,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.roleId = (user as { roleId?: string }).roleId;
        token.organizationId = (user as { organizationId?: string })
          .organizationId;
        token.organizationName = (user as { organizationName?: string })
          .organizationName;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.roleId = token.roleId as string;
        session.user.organizationId = token.organizationId as string | undefined;
        session.user.organizationName = token.organizationName as
          | string
          | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
});

declare module "next-auth" {
  interface User {
    role?: string;
    roleId?: string;
    organizationId?: string;
    organizationName?: string;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: string;
      roleId: string;
      organizationId?: string;
      organizationName?: string;
    };
  }
}
