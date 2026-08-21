import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

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

        const { getDb } = await import("@/db");
        const db = getDb();
        const { appUser } = await import("@/db/schema");
        const { eq } = await import("drizzle-orm");
        const { verifyPassword } = await import("@/lib/auth-utils");

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
    Credentials({
      name: "student-login",
      credentials: {
        fullName: { label: "Full Name", type: "text" },
        enrollmentNo: { label: "Enrollment Number", type: "text" },
        email: { label: "Email Address", type: "email" },
      },
      async authorize(credentials) {
        if (!credentials?.fullName || !credentials?.enrollmentNo || !credentials?.email) {
          return null;
        }

        const { getDb } = await import("@/db");
        const db = getDb();
        const { appUser } = await import("@/db/schema");
        const { eq } = await import("drizzle-orm");

        const normalizedEnrollmentNo = (credentials.enrollmentNo as string).trim();
        const normalizedFullName = (credentials.fullName as string).trim().toLowerCase();
        const normalizedEmail = (credentials.email as string).trim().toLowerCase();

        const [user] = await db
          .select()
          .from(appUser)
          .where(eq(appUser.enrollmentNo, normalizedEnrollmentNo))
          .limit(1);

        if (!user) {
          return null;
        }

        if (!user.isActive) {
          return null;
        }

        const storedFullName = (user.fullName || "").trim().toLowerCase();
        if (storedFullName !== normalizedFullName) {
          return null;
        }

        const storedEmail = (user.email || "").toLowerCase();
        if (storedEmail !== normalizedEmail) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          isAdmin: user.isAdmin,
          enrollmentNo: user.enrollmentNo,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.isAdmin = user.isAdmin;
        token.enrollmentNo = user.enrollmentNo;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.isAdmin = token.isAdmin;
        session.user.enrollmentNo = token.enrollmentNo;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  trustHost: true,
  secret: process.env.AUTH_SECRET,
});