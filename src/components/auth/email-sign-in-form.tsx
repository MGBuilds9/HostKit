"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function messageFor(error: string | null | undefined): string | null {
  switch (error) {
    case "EmailNotAllowed":
    case "AccessDenied":
      return "That email doesn't have access yet. Ask your host to invite it.";
    case "EmailNotConfigured":
      return "Email sign-in isn't available right now. Use Google, or try again later.";
    case "EmailRateLimited":
      return "Too many sign-in emails for that address. Wait a few minutes and try again.";
    case "Verification":
      return "That sign-in link is invalid or has expired. Request a new one.";
    default:
      return error ? "The sign-in email could not be sent. Try again." : null;
  }
}

export function EmailSignInForm({
  callbackUrl,
  defaultEmail = "",
  lockEmail = false,
  initialError = null,
  initialSent = false,
}: {
  callbackUrl: string;
  defaultEmail?: string;
  lockEmail?: boolean;
  initialError?: string | null;
  initialSent?: boolean;
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(initialSent);
  const [message, setMessage] = useState<string | null>(messageFor(initialError));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setSent(false);
    setMessage(null);
    try {
      const result = await signIn("resend", {
        email: email.trim(),
        callbackUrl,
        redirect: false,
      });
      if (!result || result.error) {
        setMessage(messageFor(result?.error ?? "error"));
        return;
      }
      setSent(true);
    } catch {
      setMessage("The sign-in email could not be sent. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="email-sign-in">Email</Label>
        {lockEmail ? (
          <p id="email-sign-in" className="text-sm font-medium break-all">
            {defaultEmail}
          </p>
        ) : (
          <Input
            id="email-sign-in"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        )}
      </div>
      <Button type="submit" variant="outline" className="w-full" disabled={sending}>
        {sending ? "Sending…" : "Email me a sign-in link"}
      </Button>
      {sent && (
        <p className="text-sm text-muted-foreground">
          Check your inbox for a sign-in link. It expires in 30 minutes.
        </p>
      )}
      {message && <p className="text-sm text-destructive">{message}</p>}
    </form>
  );
}
