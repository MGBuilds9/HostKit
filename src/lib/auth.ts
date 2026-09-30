import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { and, count, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens, invites } from "@/db/schema";
import {
  EMAIL_LINK_MAX_AGE_SECONDS,
  emailAddressMaySignIn,
  emailSignInGate,
  sendSignInEmail,
  shouldAutoPromoteToAdmin,
} from "@/lib/email-signin";

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
      // Request offline access (long-lived refresh_token) and the Calendar
      // read scope so the iCal sync engine can list events for linked
      // properties. Without these, the stored token can sign a user in but
      // cannot read Google Calendar and may not receive a refresh_token.
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar.readonly",
          // offline -> Google issues a refresh_token (persisted in accounts) on
          // first consent, which the sync engine later exchanges for fresh
          // access tokens. No prompt: "consent" — that would force re-consent on
          // every login.
          access_type: "offline",
        },
      },
    }),
    // Passwordless email. The signIn callback refuses addresses that are not
    // an active user or a pending invite, so this does not open registration.
    Resend({
      apiKey: process.env.RESEND_API_KEY ?? "",
      from:
        process.env.RESEND_FROM_ADDRESS ??
        "HostKit <notifications@updates.mkguirguis.com>",
      maxAge: EMAIL_LINK_MAX_AGE_SECONDS,
      async sendVerificationRequest({ identifier, url }) {
        await sendSignInEmail(identifier, url);
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      session.user.id = user.id;
      session.user.role = (user as unknown as { role: "admin" | "owner" | "manager" | "cleaner" }).role;
      return session;
    },
    async signIn({ user, account, email }) {
      const isEmailLink = account?.type === "email" || account?.provider === "resend";
      if (!isEmailLink) return true;
      const address = user.email?.toLowerCase().trim() ?? "";
      if (!address) return "/login?error=EmailNotAllowed";
      if (email?.verificationRequest) return emailSignInGate(address);
      return (await emailAddressMaySignIn(address)) ? true : "/login?error=EmailNotAllowed";
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id || !user.email) return;
      const userId = user.id;
      const email = user.email.toLowerCase();
      await db.transaction(async (tx) => {
        const [pendingInvite] = await tx
          .select({ id: invites.id })
          .from(invites)
          .where(
            and(
              sql`lower(${invites.email}) = ${email}`,
              isNull(invites.acceptedAt),
              isNull(invites.revokedAt),
              gt(invites.expiresAt, new Date())
            )
          )
          .limit(1);
        const [{ value: userCount }] = await tx.select({ value: count() }).from(users);
        if (shouldAutoPromoteToAdmin(userCount, !!pendingInvite)) {
          await tx.update(users)
            .set({ role: "admin" })
            .where(eq(users.id, userId));
        }
      });
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
    // Auth.js appends its own ?provider= query. A query already on this path
    // would produce /login?sent=1?provider=resend, so the form reads provider.
    verifyRequest: "/login",
  },
});
