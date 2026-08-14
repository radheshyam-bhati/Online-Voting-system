import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/db";
import { appUser } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/lib/auth-utils";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db
          .select()
          .from(appUser)
          .where(eq(appUser.email, credentials.email as string))
          .limit(1);

        if (!user[0] || !user[0].passwordHash || !user[0].isActive) {
          return null;
        }

        const isValid = await verifyPassword(
          credentials.password as string,
          user[0].passwordHash
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user[0].id,
          email: user[0].email,
          name: user[0].fullName,
          isAdmin: user[0].isAdmin,
          enrollmentNo: user[0].enrollmentNo,
        };
      },
    }),
  ],
  session: {
    strategy: "database",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.isAdmin = user.isAdmin;
        session.user.enrollmentNo = user.enrollmentNo;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});