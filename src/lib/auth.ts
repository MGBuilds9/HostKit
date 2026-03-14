import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";
import { eq, count } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      session.user.id = user.id;
      session.user.role = (user as { role: "admin" | "owner" | "manager" }).role;
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id) return;
      const [{ value: userCount }] = await db.select({ value: count() }).from(users);
      if (userCount === 1) {
        await db.update(users)
          .set({ role: "admin" })
          .where(eq(users.id, user.id));
      }
    },
  },
  pages: {
    signIn: "/login",
  },
});
