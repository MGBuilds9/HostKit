"use client";

import type { CSSProperties } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { KeyRound, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { unlockGuideAction } from "@/app/g/[slug]/actions";

type State = { error: string | null };

type SurfaceVars = CSSProperties & {
  "--guest-ctl-bg"?: string;
  "--guest-ctl-bg-hover"?: string;
  "--guest-ctl-fg"?: string;
};

function UnlockButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="guest-control-surface group inline-flex h-12 min-h-[44px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-semibold leading-none transition-[background-color,color,transform,opacity] duration-150 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55"
      style={
        {
          "--guest-ctl-bg": "var(--guest-cta-bg)",
          "--guest-ctl-bg-hover": "var(--guest-cta-hover)",
          "--guest-ctl-fg": "var(--guest-cta-ink)",
        } as SurfaceVars
      }
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
          <span>Unlocking guide…</span>
        </>
      ) : (
        <>
          <span>Unlock guide</span>
          <ArrowRight
            className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
            strokeWidth={1.75}
          />
        </>
      )}
    </button>
  );
}

export function GuideUnlockForm({
  propertyName,
  slug,
}: {
  propertyName: string;
  slug: string;
}) {
  // Bind the slug; the action receives (state, formData) for useFormState.
  const action = unlockGuideAction.bind(null, slug);
  const [state, formAction] = useFormState<State, FormData>(action, {
    error: null,
  });

  return (
    <main className="flex min-h-[calc(100vh-76px)] items-center justify-center px-5 py-10 sm:py-16">
      <div
        className="w-full max-w-md rounded-2xl border p-6 sm:p-8"
        style={{
          background: "var(--guest-card)",
          borderColor: "var(--guest-card-border)",
          boxShadow: "var(--shadow-2)",
        }}
      >
        <div
          className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl border"
          style={{
            background: "var(--guest-section-bg)",
            borderColor: "var(--guest-card-border)",
          }}
        >
          <KeyRound
            className="h-5 w-5"
            strokeWidth={1.75}
            style={{ color: "var(--guest-accent)" }}
          />
        </div>

        <h1
          className="font-[family-name:var(--font-dm-sans)] text-2xl sm:text-[1.75rem] font-bold tracking-tight not-italic"
          style={{ overflowWrap: "anywhere", minWidth: 0 }}
        >
          {propertyName}
        </h1>
        <p
          className="mt-2 max-w-[44ch] text-sm leading-relaxed"
          style={{ color: "var(--guest-text-muted)" }}
        >
          Enter the access code from your host&apos;s check-in message to view arrival steps, parking, and Wi-Fi details.
        </p>

        <form action={formAction} className="mt-6 space-y-4" noValidate>
          <div className="space-y-1.5">
            <label
              htmlFor="guest-access-code"
              className="block text-xs font-medium"
              style={{ color: "var(--guest-text)" }}
            >
              Access code
            </label>
            <input
              id="guest-access-code"
              type="text"
              name="code"
              inputMode="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              autoFocus
              required
              placeholder="e.g. KITH-2485"
              aria-invalid={!!state.error}
              aria-describedby={state.error ? "unlock-error" : "unlock-hint"}
              className="h-12 w-full rounded-xl border px-4 font-mono text-base tracking-[0.14em] transition-[border-color,background-color] duration-150 placeholder:font-sans placeholder:text-sm placeholder:tracking-normal"
              style={{
                background: "var(--guest-section-bg)",
                borderColor: state.error
                  ? "var(--guest-danger)"
                  : "var(--guest-control-border)",
                color: "var(--guest-text)",
              }}
            />
          </div>

          {state.error ? (
            <div
              id="unlock-error"
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-xs leading-relaxed"
              style={{
                background: "var(--guest-danger-soft)",
                borderColor: "var(--guest-danger)",
                color: "var(--guest-danger-ink)",
              }}
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0"
                strokeWidth={1.75}
              />
              <span>{state.error}</span>
            </div>
          ) : (
            <p
              id="unlock-hint"
              className="min-h-[1.5rem] text-xs leading-relaxed"
              style={{ color: "var(--guest-text-muted)" }}
            >
              Not case-sensitive. Check your booking message if you don&apos;t have it handy.
            </p>
          )}

          <UnlockButton />
        </form>
      </div>
    </main>
  );
}
