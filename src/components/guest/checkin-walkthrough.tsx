"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronDown,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Maximize2,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { toPascalCase } from "@/lib/utils";
import Image from "next/image";

export interface Step {
  step: number;
  title: string;
  description: string;
  icon?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "";
  posterUrl?: string;
  playbackRate?: number;
}

const SPEED_OPTIONS = [0.25, 0.5, 1] as const;

export function resolveInitialPlaybackRate(step: Pick<Step, "playbackRate" | "mediaUrl">): number {
  if (typeof step.playbackRate === "number" && step.playbackRate > 0) {
    return step.playbackRate;
  }
  if (step.mediaUrl?.includes("garage-to-elevator")) {
    return 0.25;
  }
  return 1;
}

export function formatVideoTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

type FullscreenCapableVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
};

function StepVideoPlayer({ step }: { step: Step }) {
  const initialRate = resolveInitialPlaybackRate(step);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const speedRef = useRef<number>(initialRate);
  const scrubbingRef = useRef(false);
  const resumeAfterScrubRef = useRef(false);
  const pendingSeekRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<number>(initialRate);
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    speedRef.current = speed;
    const el = videoRef.current;
    if (!el) return;
    el.defaultPlaybackRate = speed;
    el.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.defaultPlaybackRate = speedRef.current;
    el.playbackRate = speedRef.current;
    if (el.readyState >= 1) {
      if (Number.isFinite(el.duration) && el.duration > 0) {
        setDuration(el.duration);
      }
      if (el.videoWidth > 0 && el.videoHeight > 0) {
        setIsLandscape(el.videoWidth > el.videoHeight);
      }
    }
  }, []);

  function applySpeed(nextSpeed: number) {
    speedRef.current = nextSpeed;
    setSpeed(nextSpeed);
    const el = videoRef.current;
    if (el) {
      el.defaultPlaybackRate = nextSpeed;
      el.playbackRate = nextSpeed;
    }
  }

  function handleLoadedMetadata() {
    const el = videoRef.current;
    if (!el) return;
    if (Number.isFinite(el.duration) && el.duration > 0) {
      setDuration(el.duration);
    }
    if (el.videoWidth > 0 && el.videoHeight > 0) {
      setIsLandscape(el.videoWidth > el.videoHeight);
    }
    el.defaultPlaybackRate = speedRef.current;
    el.playbackRate = speedRef.current;
  }

  function togglePlay() {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused || el.ended) {
      el.defaultPlaybackRate = speedRef.current;
      el.playbackRate = speedRef.current;
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
  }

  function nudgeTime(deltaSeconds: number) {
    const el = videoRef.current;
    if (!el) return;
    const maxTime = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : duration;
    if (maxTime <= 0) return;
    const next = Math.min(Math.max(0, el.currentTime + deltaSeconds), maxTime);
    el.currentTime = next;
    setCurrentTime(next);
  }

  function handleScrubStart() {
    // Guard against touchscreen browsers firing pointerdown followed by touchstart
    // in the same gesture, which would otherwise overwrite resumeAfterScrubRef.
    if (scrubbingRef.current) return;
    scrubbingRef.current = true;
    setIsScrubbing(true);
    const el = videoRef.current;
    if (el && !el.paused) {
      resumeAfterScrubRef.current = true;
      el.pause();
    } else {
      resumeAfterScrubRef.current = false;
    }
  }

  function handleScrubChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = Number(e.target.value);
    if (!Number.isFinite(next)) return;
    setCurrentTime(next);
    const el = videoRef.current;
    if (!el) return;
    if (!el.seeking) {
      pendingSeekRef.current = null;
      el.currentTime = next;
    } else {
      pendingSeekRef.current = next;
    }
  }

  function handleScrubEnd() {
    if (!scrubbingRef.current) return;
    scrubbingRef.current = false;
    setIsScrubbing(false);
    const el = videoRef.current;
    if (el && pendingSeekRef.current !== null) {
      const pending = pendingSeekRef.current;
      pendingSeekRef.current = null;
      el.currentTime = pending;
    }
    if (el && resumeAfterScrubRef.current) {
      resumeAfterScrubRef.current = false;
      el.defaultPlaybackRate = speedRef.current;
      el.playbackRate = speedRef.current;
      void el.play().catch(() => {});
    }
  }

  async function enterFullscreen() {
    const el = videoRef.current as FullscreenCapableVideo | null;
    if (!el) return;
    try {
      if (typeof el.requestFullscreen === "function") {
        await el.requestFullscreen();
      } else if (typeof el.webkitEnterFullscreen === "function") {
        // iOS Safari throws InvalidStateError if webkitEnterFullscreen() runs at readyState === 0
        if (el.readyState < 1) {
          await el.play().catch(() => {});
        }
        el.webkitEnterFullscreen();
      }
    } catch {
      // Ignore browser fullscreen policy rejections
    }
  }

  const speedChoices = SPEED_OPTIONS.includes(initialRate as (typeof SPEED_OPTIONS)[number])
    ? [...SPEED_OPTIONS]
    : [...SPEED_OPTIONS, initialRate].sort((a, b) => a - b);

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        background: "var(--guest-section-bg)",
        borderColor: "var(--guest-card-border)",
      }}
    >
      <div
        className={`relative mx-auto bg-black/90 ${
          isLandscape ? "w-full aspect-video" : "w-full max-w-[320px] aspect-[9/16]"
        }`}
      >
        <video
          ref={videoRef}
          src={step.mediaUrl}
          poster={step.posterUrl}
          muted
          playsInline
          preload="metadata"
          onClick={togglePlay}
          onLoadedMetadata={handleLoadedMetadata}
          onLoadedData={handleLoadedMetadata}
          onDurationChange={handleLoadedMetadata}
          onSeeked={() => {
            const el = videoRef.current;
            if (el && pendingSeekRef.current !== null && !el.seeking) {
              const target = pendingSeekRef.current;
              pendingSeekRef.current = null;
              el.currentTime = target;
            }
          }}
          onRateChange={() => {
            const el = videoRef.current as FullscreenCapableVideo | null;
            if (!el || !Number.isFinite(el.playbackRate) || el.playbackRate <= 0) return;
            const inNativeFullscreen = Boolean(
              el.webkitDisplayingFullscreen ||
                (typeof document !== "undefined" && document.fullscreenElement === el),
            );
            if (inNativeFullscreen) {
              if (el.playbackRate !== speedRef.current) {
                speedRef.current = el.playbackRate;
                setSpeed(el.playbackRate);
              }
            } else if (Math.abs(el.playbackRate - speedRef.current) > 0.001) {
              el.defaultPlaybackRate = speedRef.current;
              el.playbackRate = speedRef.current;
            }
          }}
          onTimeUpdate={() => {
            if (!scrubbingRef.current && !isScrubbing && videoRef.current) {
              setCurrentTime(videoRef.current.currentTime);
            }
          }}
          onPlay={() => {
            if (videoRef.current && videoRef.current.playbackRate !== speedRef.current) {
              videoRef.current.defaultPlaybackRate = speedRef.current;
              videoRef.current.playbackRate = speedRef.current;
            }
            setIsPlaying(true);
          }}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          className="h-full w-full cursor-pointer object-contain"
        />

        {!isPlaying && (
          <button
            type="button"
            onClick={togglePlay}
            aria-label={`Play ${step.title} video`}
            className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity hover:bg-black/30"
          >
            <span
              className="flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg"
              style={{ background: "var(--guest-accent)" }}
            >
              <Play className="h-5 w-5 translate-x-0.5 fill-current" />
            </span>
          </button>
        )}
      </div>

      {/* Scrubbing timeline & playback controls */}
      <div
        className="space-y-2.5 border-t px-3.5 py-3"
        style={{
          background: "var(--guest-card)",
          borderColor: "var(--guest-card-border)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <input
            type="range"
            min={0}
            max={duration > 0 ? duration : 1}
            step={0.05}
            value={Math.min(currentTime, duration > 0 ? duration : 1)}
            disabled={duration <= 0}
            aria-label={`Scrub ${step.title} video timeline`}
            onPointerDown={handleScrubStart}
            onPointerUp={handleScrubEnd}
            onPointerCancel={handleScrubEnd}
            onLostPointerCapture={handleScrubEnd}
            onTouchStart={handleScrubStart}
            onTouchEnd={handleScrubEnd}
            onTouchCancel={handleScrubEnd}
            onChange={handleScrubChange}
            className="h-2 flex-1 cursor-pointer appearance-none rounded-lg disabled:cursor-not-allowed disabled:opacity-50"
            style={{ accentColor: "var(--guest-accent)" }}
          />
          <span
            className="shrink-0 text-xs font-medium tabular-nums"
            style={{ color: "var(--guest-text-muted)" }}
          >
            {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause video" : "Play video"}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:opacity-80"
              style={{ borderColor: "var(--guest-card-border)" }}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              type="button"
              disabled={duration <= 0}
              onClick={() => nudgeTime(-5)}
              aria-label="Rewind 5 seconds"
              title="Back 5s"
              className="inline-flex h-8 items-center gap-1 rounded-lg border px-2 text-xs font-medium transition-colors hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                borderColor: "var(--guest-card-border)",
                color: "var(--guest-text-muted)",
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              5s
            </button>
            <button
              type="button"
              disabled={duration <= 0}
              onClick={() => nudgeTime(5)}
              aria-label="Forward 5 seconds"
              title="Forward 5s"
              className="inline-flex h-8 items-center gap-1 rounded-lg border px-2 text-xs font-medium transition-colors hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                borderColor: "var(--guest-card-border)",
                color: "var(--guest-text-muted)",
              }}
            >
              5s
              <RotateCw className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <div
              className="inline-flex items-center rounded-lg border p-0.5"
              role="group"
              aria-label="Playback speed"
              style={{ borderColor: "var(--guest-card-border)" }}
            >
              {speedChoices.map((rateOption) => {
                const active = speed === rateOption;
                return (
                  <button
                    key={rateOption}
                    type="button"
                    onClick={() => applySpeed(rateOption)}
                    aria-pressed={active}
                    className="rounded-md px-2 py-1 text-xs font-semibold tabular-nums transition-colors"
                    style={{
                      background: active ? "var(--guest-accent)" : "transparent",
                      color: active ? "#ffffff" : "var(--guest-text-muted)",
                    }}
                  >
                    {rateOption}×
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={enterFullscreen}
              aria-label="Fullscreen video"
              title="Fullscreen"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:opacity-80"
              style={{
                borderColor: "var(--guest-card-border)",
                color: "var(--guest-text-muted)",
              }}
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CheckinWalkthrough({
  steps,
  heading = "Check-In Walkthrough",
  storageKey = "hostkit_completed_steps",
  completable = true,
  defaultOpenFirst = true,
}: {
  steps: Step[];
  heading?: string;
  storageKey?: string;
  completable?: boolean;
  defaultOpenFirst?: boolean;
}) {
  const [open, setOpen] = useState<number | null>(
    defaultOpenFirst ? (steps[0]?.step ?? null) : null,
  );
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  useEffect(() => {
    if (!completable) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setCompletedSteps(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, [completable, storageKey]);

  function toggleComplete(step: number) {
    setCompletedSteps((prev) => {
      const updated = prev.includes(step)
        ? prev.filter((s) => s !== step)
        : [...prev, step];
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  const validStepIds = new Set(steps.map((s) => s.step));
  const validDoneCount = completedSteps.filter((id) => validStepIds.has(id)).length;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-[family-name:var(--font-dm-sans)] text-lg font-semibold tracking-tight">
          {heading}
        </h2>
        {completable && validDoneCount > 0 && (
          <span className="text-xs font-semibold" style={{ color: "var(--guest-success)" }}>
            {validDoneCount} of {steps.length} done
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
                  background: "var(--guest-card)",
                  borderColor: isOpen
                    ? "var(--guest-accent)"
                    : "var(--guest-card-border)",
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
                        ? "var(--guest-accent-soft)"
                        : "var(--guest-accent-soft)",
                      color: isDone ? "var(--guest-success)" : "var(--guest-accent)",
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
                      color: "var(--guest-text-muted)",
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
                            style={{ color: "var(--guest-accent)" }}
                          />
                          <p
                            className="text-sm leading-relaxed"
                            style={{ color: "var(--guest-text-muted)" }}
                          >
                            {s.description}
                          </p>
                        </div>

                        {s.mediaUrl && s.mediaType === "image" && (
                          <div
                            className="overflow-hidden rounded-xl border"
                            style={{
                              background: "var(--guest-section-bg)",
                              borderColor: "var(--guest-card-border)",
                            }}
                          >
                            <Image
                              src={s.mediaUrl}
                              alt={s.title}
                              width={600}
                              height={800}
                              unoptimized={s.mediaUrl.startsWith("/guide-media/")}
                              className="w-full max-h-80 object-contain"
                            />
                          </div>
                        )}
                        {s.mediaUrl && s.mediaType === "video" && (
                          <StepVideoPlayer key={s.mediaUrl} step={s} />
                        )}

                        {completable && (
                          <button
                            onClick={() => toggleComplete(s.step)}
                            className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:opacity-90"
                            style={{
                              background: isDone
                                ? "var(--guest-accent-soft)"
                                : "transparent",
                              color: isDone
                                ? "var(--guest-success)"
                                : "var(--guest-text-muted)",
                              borderColor: isDone
                                ? "var(--guest-success)"
                                : "var(--guest-card-border)",
                            }}
                          >
                            {isDone && <Check className="h-3.5 w-3.5" />}
                            {isDone ? "Completed" : "Mark as Done"}
                          </button>
                        )}
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
