"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
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
}

export function CheckinWalkthrough({ steps }: { steps: Step[] }) {
  const [current, setCurrent] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("hostkit_completed_steps");
      if (saved) setCompletedSteps(JSON.parse(saved));
    } catch {
      // LocalStorage access may fail in private browsing
    }
  }, []);

  const stepNumber = steps[current]?.step ?? current + 1;
  const isDone = completedSteps.includes(stepNumber);

  function toggleComplete() {
    const updated = isDone
      ? completedSteps.filter((s) => s !== stepNumber)
      : [...completedSteps, stepNumber];
    setCompletedSteps(updated);
    try {
      localStorage.setItem("hostkit_completed_steps", JSON.stringify(updated));
    } catch {
      // Ignore
    }
  }

  // Dynamically resolve icon by name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  const IconComponent = steps[current].icon
    ? icons[toPascalCase(steps[current].icon!)] ?? LucideIcons.MapPin
    : LucideIcons.MapPin;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-[family-name:var(--font-dm-sans)] text-lg font-semibold">
          Check-In Walkthrough
        </h2>
        {completedSteps.length > 0 && (
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {completedSteps.length} of {steps.length} done
          </span>
        )}
      </div>
      <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: "hsl(var(--guest-section-bg))" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "hsl(var(--guest-accent-soft))" }}>
                  <IconComponent className="h-5 w-5" style={{ color: "hsl(var(--guest-accent))" }} />
                </div>
                <span className="text-xs font-medium uppercase" style={{ color: "hsl(var(--guest-text-muted))" }}>
                  Step {current + 1} of {steps.length}
                </span>
              </div>

              <button
                onClick={toggleComplete}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors hover:opacity-90"
                style={{
                  background: isDone ? "rgba(16, 185, 129, 0.15)" : "transparent",
                  color: isDone ? "#10b981" : "hsl(var(--guest-text-muted))",
                  borderColor: isDone ? "#10b981" : "hsl(var(--guest-card-border))",
                }}
              >
                {isDone && <Check className="h-3.5 w-3.5" />}
                {isDone ? "Completed" : "Mark as Done"}
              </button>
            </div>

            <h3 className="font-semibold text-lg">{steps[current].title}</h3>
            <p className="text-sm leading-relaxed" style={{ color: "hsl(var(--guest-text-muted))" }}>{steps[current].description}</p>
            {steps[current].mediaUrl && steps[current].mediaType === "image" && (
              <Image
                src={steps[current].mediaUrl}
                alt={steps[current].title}
                width={600}
                height={400}
                className="rounded-xl w-full max-h-48 object-cover"
              />
            )}
            {steps[current].mediaUrl && steps[current].mediaType === "video" && (
              <div className="relative rounded-xl overflow-hidden bg-black/5 dark:bg-black/20 w-full aspect-video">
                <video
                  key={steps[current].mediaUrl}
                  src={steps[current].mediaUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setCurrent(Math.max(0, current - 1))}
            disabled={current === 0}
            aria-label="Previous step"
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex gap-1.5">
            {steps.map((stepItem, i) => {
              const num = stepItem.step ?? i + 1;
              const stepCompleted = completedSteps.includes(num);
              return (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === current ? "w-6" : "w-1.5"}`}
                  style={{
                    background: stepCompleted
                      ? "#10b981"
                      : i === current
                      ? "hsl(var(--guest-accent))"
                      : "hsl(var(--guest-card-border))",
                  }}
                />
              );
            })}
          </div>

          <button
            onClick={() => setCurrent(Math.min(steps.length - 1, current + 1))}
            disabled={current === steps.length - 1}
            aria-label={`Next step (${current + 2} of ${steps.length})`}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
