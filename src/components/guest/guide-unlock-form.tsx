"use client";

import { useFormState, useFormStatus } from "react-dom";
import { KeyRound, ArrowRight } from "lucide-react";
import { unlockGuideAction } from "@/app/g/[slug]/actions";

const inputStyle: React.CSSProperties = {
  background: "var(--guest-section-bg)",
  border: "1px solid var(--guest-card-border)",
  color: "inherit",
};

type State = { error: string | null };

function UnlockButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="group inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold text-white transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60"
      style={{ background: "var(--guest-accent)" }}
    >
      {pending ? (
        "Unlocking…"
      ) : (
        <>
          Unlock guide
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
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
    <div className="flex min-h-[70vh] items-center justify-center px-5 py-16">
      <div
        className="w-full max-w-sm rounded-3xl p-8 shadow-lg dark:shadow-none"
        style={{
          background: "var(--guest-card)",
          border: "1px solid var(--guest-card-border)",
        }}
      >
        <div
          className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{
            background:
              "linear-gradient(135deg, var(--guest-accent-soft), transparent)",
          }}
        >
          <KeyRound
            className="h-7 w-7"
            style={{ color: "var(--guest-accent)" }}
          />
        </div>
        <h1 className="text-center font-[family-name:var(--font-dm-sans)] text-2xl font-bold tracking-tight">
          {propertyName}
        </h1>
        <p
          className="mx-auto mt-2 max-w-[16rem] text-center text-sm leading-relaxed"
          style={{ color: "var(--guest-text-muted)" }}
        >
          Enter the access code from your check-in message to view the guide.
        </p>

        <form action={formAction} className="mt-6 space-y-3">
          <input
            type="text"
            name="code"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            autoFocus
            required
            placeholder="Access code"
            aria-label="Access code"
            aria-invalid={!!state.error}
            aria-describedby={state.error ? "unlock-error" : undefined}
            className="w-full rounded-xl px-4 py-3.5 text-center text-lg tracking-[0.2em] outline-none transition-shadow placeholder:tracking-normal placeholder:text-sm"
            style={inputStyle}
          />
          {state.error && (
            <p
              id="unlock-error"
              className="text-center text-sm font-medium"
              role="alert"
              style={{ color: "var(--guest-danger)" }}
            >
              {state.error}
            </p>
          )}
          <UnlockButton />
        </form>
      </div>
    </div>
  );
}
