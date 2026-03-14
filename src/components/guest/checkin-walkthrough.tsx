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
}

export function CheckinWalkthrough({ steps }: { steps: Step[] }) {
  const [current, setCurrent] = useState(0);

  // Dynamically resolve icon by name
  const IconComponent = steps[current].icon
    ? (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[
        toPascalCase(steps[current].icon!)
      ] ?? LucideIcons.MapPin
    : LucideIcons.MapPin;

  return (
    <section className="px-5">
      <h2 className="font-[family-name:var(--font-dm-sans)] text-lg font-semibold mb-3">
        Check-In Walkthrough
      </h2>
      <div className="bg-[#F9FAFB] rounded-2xl p-5 relative overflow-hidden">
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
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF6B6B]/10">
                <IconComponent className="h-5 w-5 text-[#FF6B6B]" />
              </div>
              <span className="text-xs font-medium text-slate-400 uppercase">
                Step {current + 1} of {steps.length}
              </span>
            </div>
            <h3 className="font-semibold text-lg">{steps[current].title}</h3>
            <p className="text-slate-600 text-sm leading-relaxed">{steps[current].description}</p>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setCurrent(Math.max(0, current - 1))}
            disabled={current === 0}
            className="p-2 rounded-full hover:bg-slate-200 disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === current ? "w-6 bg-[#FF6B6B]" : "w-1.5 bg-slate-300"
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => setCurrent(Math.min(steps.length - 1, current + 1))}
            disabled={current === steps.length - 1}
            className="p-2 rounded-full hover:bg-slate-200 disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
