"use client";

import { useFormState, useFormStatus } from "react-dom";
import { KeyRound } from "lucide-react";
import { unlockGuideAction } from "@/app/g/[slug]/actions";

const inputStyle: React.CSSProperties = {
  background: "hsl(var(--guest-section-bg))",
  border: "1px solid hsl(var(--guest-card-border))",
  color: "inherit",
};

type State = { error: string | null };

function UnlockButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl px-4 py-3 font-semibold text-white transition-opacity disabled:opacity-60"
      style={{ background: "hsl(var(--guest-accent))" }}
    >
      {pending ? "Unlocking…" : "Unlock guide"}
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
        className="w-full max-w-sm rounded-2xl p-6"
        style={{
          background: "hsl(var(--guest-section-bg))",
          border: "1px solid hsl(var(--guest-card-border))",
        }}
      >
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: "hsl(var(--guest-accent-soft))" }}
        >
          <KeyRound
            className="h-6 w-6"
            style={{ color: "hsl(var(--guest-accent))" }}
          />
        </div>
        <h1 className="text-center font-[family-name:var(--font-dm-sans)] text-xl font-semibold">
          {propertyName}
        </h1>
        <p
          className="mt-1 text-center text-sm"
          style={{ color: "hsl(var(--guest-text-muted))" }}
        >
          Enter the access code from your check-in message to view the guide.
        </p>

        <form action={formAction} className="mt-5 space-y-3">
          <input
            type="text"
            name="code"
            inputMode="text"
            autoComplete="off"
            autoFocus
            required
            placeholder="Access code"
            aria-label="Access code"
            className="w-full rounded-xl px-4 py-3 text-center text-lg tracking-widest outline-none focus:ring-2"
            style={inputStyle}
          />
          {state.error && (
            <p className="text-center text-sm font-medium text-red-500">
              {state.error}
            </p>
          )}
          <UnlockButton />
        </form>
      </div>
    </div>
  );
}
