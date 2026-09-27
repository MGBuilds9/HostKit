"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { toPascalCase } from "@/lib/utils";
import Image from "next/image";

interface Step {
  step: number;
  title: string;
  description: string;
  icon?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  posterUrl?: string;
}

export function CheckinWalkthrough({ steps }: { steps: Step[] }) {
  const [open, setOpen] = useState<number | null>(steps[0]?.step ?? null);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("hostkit_completed_steps");
      if (saved) setCompletedSteps(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, []);

  function toggleComplete(step: number) {
    setCompletedSteps((prev) => {
      const updated = prev.includes(step)
        ? prev.filter((s) => s !== step)
        : [...prev, step];
      try {
        localStorage.setItem("hostkit_completed_steps", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-[family-name:var(--font-dm-sans)] text-lg font-semibold tracking-tight">
          Check-In Walkthrough
        </h2>
        {completedSteps.length > 0 && (
          <span className="text-xs font-semibold" style={{ color: "hsl(var(--guest-success))" }}>
            {completedSteps.length} of {steps.length} done
          </span>
        )}
      </div>

      <ol className="space-y-2">
        {steps.map((s) => {
          const IconComponent = s.icon
            ? icons[toPascalCase(s.icon)] ?? LucideIcons.MapPin
            : LucideIcons.MapPin;
          const isOpen = open === s.step;
          const isDone = completedSteps.includes(s.step);

          return (
            <li key={s.step}>
              <div
                className="rounded-2xl border overflow-hidden transition-colors"
                style={{
                  background: "hsl(var(--guest-card))",
                  borderColor: isOpen
                    ? "hsl(var(--guest-accent))"
                    : "hsl(var(--guest-card-border))",
                }}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : s.step)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                    style={{
                      background: isDone
                        ? "hsl(var(--guest-accent-soft))"
                        : "hsl(var(--guest-accent-soft))",
                      color: isDone ? "hsl(var(--guest-success))" : "hsl(var(--guest-accent))",
                    }}
                  >
                    {isDone ? <Check className="h-4 w-4" /> : s.step}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium">{s.title}</span>
                  </span>
                  <ChevronDown
                    className="h-4 w-4 shrink-0 transition-transform duration-200"
                    style={{
                      color: "hsl(var(--guest-text-muted))",
                      transform: isOpen ? "rotate(180deg)" : "none",
                    }}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <IconComponent
                            className="h-4 w-4"
                            style={{ color: "hsl(var(--guest-accent))" }}
                          />
                          <p
                            className="text-sm leading-relaxed"
                            style={{ color: "hsl(var(--guest-text-muted))" }}
                          >
                            {s.description}
                          </p>
                        </div>

                        {s.mediaUrl && s.mediaType === "image" && (
                          <Image
                            src={s.mediaUrl}
                            alt={s.title}
                            width={600}
                            height={400}
                            className="rounded-xl w-full max-h-64 object-cover"
                          />
                        )}
                        {s.mediaUrl && s.mediaType === "video" && (
                          <div className="relative overflow-hidden rounded-xl bg-black/5 dark:bg-black/20 w-full aspect-video">
                            <video
                              src={s.mediaUrl}
                              poster={s.posterUrl}
                              controls
                              playsInline
                              preload="metadata"
                              className="h-full w-full object-contain"
                            />
                          </div>
                        )}

                        <button
                          onClick={() => toggleComplete(s.step)}
                          className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:opacity-90"
                          style={{
                            background: isDone
                              ? "hsl(var(--guest-accent-soft))"
                              : "transparent",
                            color: isDone
                              ? "hsl(var(--guest-success))"
                              : "hsl(var(--guest-text-muted))",
                            borderColor: isDone
                              ? "hsl(var(--guest-success))"
                              : "hsl(var(--guest-card-border))",
                          }}
                        >
                          {isDone && <Check className="h-3.5 w-3.5" />}
                          {isDone ? "Completed" : "Mark as Done"}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
