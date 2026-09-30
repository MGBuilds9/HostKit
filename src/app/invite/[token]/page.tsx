import { auth } from "@/lib/auth";
import { findInviteByToken, claimInvite } from "@/lib/invites";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { EmailSignInForm } from "@/components/auth/email-sign-in-form";

interface InvitePageProps {
  params: { token: string };
}

const ROLE_HOME: Record<string, string> = {
  owner: "/owner",
  manager: "/admin",
  cleaner: "/cleaner",
};

function ErrorCard({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600 text-sm">{body}</p>
        <Link
          href="/"
          className="mt-6 inline-block text-sm text-indigo-600 hover:underline"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

export default async function InvitePage({ params }: InvitePageProps) {
  const invite = await findInviteByToken(params.token);

  if (!invite) {
    return (
      <ErrorCard
        title="Invite not found"
        body="This invitation link is invalid. Ask your host to send a new one."
      />
    );
  }
  if (invite.revokedAt) {
    return (
      <ErrorCard
        title="Invite revoked"
        body="This invitation has been revoked. Contact your host for assistance."
      />
    );
  }
  if (invite.acceptedAt) {
    return (
      <ErrorCard
        title="Invite already used"
        body="This invitation has already been accepted. Sign in to continue."
      />
    );
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    return (
      <ErrorCard
        title="Invite expired"
        body="This invitation has expired. Ask your host to send a fresh one."
      />
    );
  }

  const session = await auth();

  if (!session?.user) {
    // Custom sign-in page ignores /api/auth/signin query params. Send the
    // invite path through /login so Google returns here before claim.
    // prompt=consent asks Google for a refresh token on this grant.
    const callbackUrl = encodeURIComponent(`/invite/${params.token}`);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-2">
            HostKit
          </p>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            You&rsquo;re invited
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            You&rsquo;ve been invited as a{" "}
            <strong className="capitalize">{invite.intendedRole}</strong>. Use
            the invited email, or a Google account with that same address.
          </p>
          <div className="text-left">
            <EmailSignInForm
              callbackUrl={`/invite/${params.token}`}
              defaultEmail={invite.email}
              lockEmail
            />
          </div>
          <a
            href={`/login?callbackUrl=${callbackUrl}&prompt=consent`}
            className="mt-3 inline-block w-full py-2.5 px-4 bg-indigo-600 text-white text-sm font-semibold rounded-md hover:bg-indigo-700 transition-colors"
          >
            Sign in with Google to accept
          </a>
        </div>
      </div>
    );
  }

  // Signed in — verify email match
  const sessionEmail = session.user.email?.toLowerCase() ?? "";
  const inviteEmail = invite.email.toLowerCase();

  if (sessionEmail !== inviteEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Wrong account
          </h1>
          <p className="text-sm text-gray-600 mb-4">
            This invite is addressed to <strong>{invite.email}</strong> but you
            are signed in as <strong>{session.user.email}</strong>. Sign out
            and sign in with the invited email.
          </p>
          <SignOutButton
            callbackUrl={`/invite/${params.token}`}
            className="inline-block w-full py-2.5 px-4 bg-gray-100 text-gray-800 text-sm font-semibold rounded-md hover:bg-gray-200 transition-colors"
          >
            Sign out and switch account
          </SignOutButton>
        </div>
      </div>
    );
  }

  // Email matches — attempt claim
  const result = await claimInvite(params.token, session.user.id);

  if (!result.ok) {
    const messages: Record<typeof result.reason, string> = {
      not_found: "This invitation link is invalid.",
      expired: "This invitation has expired. Ask your host to send a new one.",
      revoked: "This invitation has been revoked.",
      already_accepted: "This invitation has already been accepted.",
      email_mismatch: "Your signed-in email does not match this invitation.",
      owner_conflict:
        "This owner profile is already linked to another account. Contact your host.",
      user_inactive:
        "This account has been deactivated. Contact your host to reactivate it before accepting.",
      role_protected:
        "This account already has a role that can't be changed by an invite. Contact your host.",
    };
    return (
      <ErrorCard title="Could not accept invite" body={messages[result.reason]} />
    );
  }

  redirect(ROLE_HOME[result.role] ?? "/");
}
