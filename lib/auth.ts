import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      id: "staff",
      name: "Staff Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });
        if (!user || !user.activeStatus) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
    CredentialsProvider({
      id: "driver",
      name: "Driver Login",
      credentials: {
        code: { label: "Driver Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.code) return null;

        const driver = await prisma.driver.findUnique({
          where: { loginCode: credentials.code.trim().toUpperCase() },
        });
        if (!driver || !driver.activeStatus) return null;

        // Some drivers are also admins (e.g. a lead volunteer who also drives) - if this
        // driver's email matches an active admin account, the driver UI can offer a
        // one-click link to the login page to switch roles. This never grants admin
        // access directly - switching still requires the admin password.
        const linkedAdmin = driver.email
          ? await prisma.user.findFirst({
              where: { email: { equals: driver.email, mode: "insensitive" }, role: "ADMIN", activeStatus: true },
              select: { id: true },
            })
          : null;

        return {
          id: driver.id,
          name: driver.name,
          email: driver.email ?? "",
          role: "DRIVER",
          canSwitchToAdmin: !!linkedAdmin,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as "ADMIN" | "VOLUNTEER" | "DRIVER";
        token.canSwitchToAdmin = user.canSwitchToAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.canSwitchToAdmin = token.canSwitchToAdmin;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
