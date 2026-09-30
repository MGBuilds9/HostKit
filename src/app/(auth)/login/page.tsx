"use client";

import { Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmailSignInForm } from "@/components/auth/email-sign-in-form";
import { safeCallbackUrl } from "@/lib/safe-callback-url";

const EMAIL_SIGN_IN_ERRORS = new Set([
  "EmailNotAllowed",
  "EmailNotConfigured",
  "EmailRateLimited",
  "Verification",
]);

function LoginCard() {
  const search = useSearchParams();
  const callbackUrl = safeCallbackUrl(search.get("callbackUrl"));
  const consent = search.get("prompt") === "consent";
  const authError = search.get("error");
  const emailError = authError && EMAIL_SIGN_IN_ERRORS.has(authError) ? authError : null;

  return (
    <Card className="w-full max-w-sm rounded-3xl shadow-none sm:shadow-lg">
      <CardHeader className="text-center space-y-3 pt-10">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <svg width="24" height="24" viewBox="0 0 512 512" aria-hidden="true">
            <g fill="none" stroke="currentColor" strokeWidth="36" strokeLinecap="round" strokeLinejoin="round">
              <line x1="168" y1="180" x2="168" y2="400" />
              <line x1="344" y1="180" x2="344" y2="400" />
              <line x1="168" y1="290" x2="344" y2="290" />
              <polyline points="120,200 256,110 392,200" />
            </g>
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">HostKit</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Property management for short-term rentals
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pb-8 pt-2">
        <EmailSignInForm
          callbackUrl={callbackUrl}
          initialError={emailError}
          initialSent={search.get("sent") === "1" || search.get("provider") === "resend"}
        />
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>
        <Button
          className="w-full"
          onClick={() =>
            signIn(
              "google",
              { callbackUrl },
              consent
                ? { prompt: "consent", access_type: "offline" }
                : { access_type: "offline" }
            )
          }
        >
          Sign in with Google
        </Button>
        {authError && !emailError && (
          <p className="text-sm text-destructive">Sign-in didn&apos;t complete. Try again.</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="text-sm text-muted-foreground">Loading sign-in…</div>
      }
    >
      <LoginCard />
    </Suspense>
  );
}
