"use client";

import { useState, useRef, useEffect, type CSSProperties } from "react";
import { Copy, Check, AlertCircle, X } from "lucide-react";
import {
  executeCopyWithFallback,
  resolveCopyButtonAriaLabel,
} from "@/lib/guide-utils";

interface CopyButtonProps {
  value: string;
  label?: string;
  copiedLabel?: string;
  ariaLabel?: string;
  variant?: "inline" | "secondary";
  className?: string;
}

type SurfaceVars = CSSProperties & {
  "--guest-ctl-bg"?: string;
  "--guest-ctl-border"?: string;
  "--guest-ctl-fg"?: string;
};

function legacyTextareaCopy(text: string): boolean {
  const prevActive =
    typeof document !== "undefined" && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.setAttribute("aria-hidden", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "0";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  let ok = false;
  try {
    textarea.focus({ preventScroll: true });
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  } finally {
    document.body.removeChild(textarea);
    prevActive?.focus?.({ preventScroll: true });
  }
  return ok;
}

export function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  ariaLabel,
  variant = "inline",
  className = "",
}: CopyButtonProps) {
  const [status, setStatus] = useState<"idle" | "pending" | "copied" | "error">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerBtnRef = useRef<HTMLButtonElement | null>(null);
  const manualInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (status === "error" && manualInputRef.current) {
      manualInputRef.current.focus({ preventScroll: true });
      manualInputRef.current.select();
    }
  }, [status]);

  async function handleCopy() {
    if (status === "pending") return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setStatus("pending");

    const writeText =
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
        ? (t: string) => navigator.clipboard.writeText(t)
        : null;

    const result = await executeCopyWithFallback({
      value,
      writeText,
      legacyCopy: legacyTextareaCopy,
    });

    if (result.ok) {
      setStatus("copied");
      if (result.autoResetMs !== null) {
        timerRef.current = setTimeout(() => {
          setStatus("idle");
        }, result.autoResetMs);
      }
    } else {
      // Keep manual recovery mounted indefinitely until copied or explicitly dismissed.
      setStatus("error");
    }
  }

  const isSecondary = variant === "secondary";
  const surfaceStyle: SurfaceVars = {
    "--guest-ctl-bg":
      status === "copied"
        ? "var(--guest-success-soft)"
        : status === "error"
          ? "var(--guest-danger-soft)"
          : isSecondary
            ? "var(--guest-card)"
            : "var(--guest-section-bg)",
    "--guest-ctl-border":
      status === "copied"
        ? "var(--guest-success)"
        : status === "error"
          ? "var(--guest-danger)"
          : "var(--guest-control-border)",
    "--guest-ctl-fg":
      status === "copied"
        ? "var(--guest-success-ink)"
        : status === "error"
          ? "var(--guest-danger-ink)"
          : "var(--guest-text)",
  };

  return (
    <span className="inline-flex max-w-full flex-wrap items-center gap-1.5">
      <button
        ref={triggerBtnRef}
        type="button"
        onClick={handleCopy}
        disabled={status === "pending"}
        aria-label={resolveCopyButtonAriaLabel({
          status,
          label,
          copiedLabel,
          ariaLabel,
        })}
        className={`guest-control-surface inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap border font-medium leading-none transition-[background-color,border-color,color,transform,opacity] duration-150 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-55 ${
          isSecondary
            ? "rounded-xl px-3.5 sm:px-4 text-xs sm:text-sm"
            : "rounded-lg px-3 text-xs"
        } ${className}`}
        style={surfaceStyle}
      >
        {status === "copied" ? (
          <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
        ) : status === "error" ? (
          <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
        ) : (
          <Copy className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
        )}
        <span aria-live="polite">
          {status === "copied"
            ? copiedLabel
            : status === "pending"
              ? "Copying…"
              : status === "error"
                ? "Retry copy"
                : label}
        </span>
      </button>

      {status === "error" && (
        <span className="inline-flex max-w-full items-center gap-1">
          <input
            ref={manualInputRef}
            type="text"
            readOnly
            value={value}
            size={Math.min(Math.max(value.length, 8), 24)}
            aria-label={`Manual copy value for ${ariaLabel ?? label}`}
            onFocus={(e) => e.currentTarget.select()}
            onClick={(e) => e.currentTarget.select()}
            className="min-h-[44px] min-w-0 max-w-[200px] rounded-lg border px-2.5 font-mono text-xs font-semibold"
            style={{
              background: "var(--guest-card)",
              borderColor: "var(--guest-control-border)",
              color: "var(--guest-text)",
            }}
          />
          <button
            type="button"
            onClick={() => {
              setStatus("idle");
              requestAnimationFrame(() => {
                triggerBtnRef.current?.focus({ preventScroll: true });
              });
            }}
            aria-label="Dismiss manual copy"
            className="guest-control-surface inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg border transition-[background-color,border-color,transform] duration-150 active:scale-[0.985]"
            style={
              {
                "--guest-ctl-bg": "var(--guest-section-bg)",
                "--guest-ctl-border": "var(--guest-control-border)",
                "--guest-ctl-fg": "var(--guest-text)",
              } as SurfaceVars
            }
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </span>
      )}
    </span>
  );
}
