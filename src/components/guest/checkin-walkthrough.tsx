"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { toPascalCase } from "@/lib/utils";

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

  // Dynamically resolve icon by name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  const IconComponent = steps[current].icon
    ? icons[toPascalCase(steps[current].icon!)] ?? LucideIcons.MapPin
    : LucideIcons.MapPin;

  return (
    <section>
      <h2 className="font-[family-name:var(--font-dm-sans)] text-lg font-semibold mb-3">
        Check-In Walkthrough
      </h2>
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
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "hsl(var(--guest-accent-soft))" }}>
                <IconComponent className="h-5 w-5" style={{ color: "hsl(var(--guest-accent))" }} />
              </div>
              <span className="text-xs font-medium uppercase" style={{ color: "hsl(var(--guest-text-muted))" }}>
                Step {current + 1} of {steps.length}
              </span>
            </div>
            <h3 className="font-semibold text-lg">{steps[current].title}</h3>
            <p className="text-sm leading-relaxed" style={{ color: "hsl(var(--guest-text-muted))" }}>{steps[current].description}</p>
            {steps[current].mediaUrl && steps[current].mediaType === "image" && (
              <img
                src={steps[current].mediaUrl}
                alt={steps[current].title}
                className="rounded-xl w-full max-h-48 object-cover"
              />
            )}
            {steps[current].mediaUrl && steps[current].mediaType === "video" && (
              <video
                src={steps[current].mediaUrl}
                controls
                playsInline
                className="rounded-xl w-full max-h-48"
              />
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
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === current ? "w-6" : "w-1.5"}`}
                style={{ background: i === current ? "hsl(var(--guest-accent))" : "hsl(var(--guest-card-border))" }}
              />
            ))}
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
