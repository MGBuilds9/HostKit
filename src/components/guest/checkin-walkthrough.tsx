"use client";

import { useState, useEffect, useRef, type CSSProperties } from "react";
import {
  Check,
  ChevronDown,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Maximize2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { toPascalCase } from "@/lib/utils";
import {
  getSafeLocalStorage,
  hydrateAndRepairCompletedSteps,
  transitionVideoLoadState,
  type VideoPlayerMachineEvent,
  type VideoPlayerMachineState,
} from "@/lib/guide-utils";
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

type SurfaceVars = CSSProperties & {
  "--guest-ctl-bg"?: string;
  "--guest-ctl-border"?: string;
  "--guest-ctl-fg"?: string;
};

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

function StepVideoPlayer({
  step,
  onLandscapeChange,
}: {
  step: Step;
  onLandscapeChange?: (isLandscape: boolean) => void;
}) {
  const initialRate = resolveInitialPlaybackRate(step);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onLandscapeChangeRef = useRef(onLandscapeChange);
  onLandscapeChangeRef.current = onLandscapeChange;
  const speedRef = useRef<number>(initialRate);
  const scrubbingRef = useRef(false);
  const resumeAfterScrubRef = useRef(false);
  const pendingSeekRef = useRef<number | null>(null);
  const playRequestIdRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<number>(initialRate);
  const [isLandscape, setIsLandscape] = useState(false);
  const [machine, setMachine] = useState<VideoPlayerMachineState>({
    status: "idle",
    pendingPlay: false,
    activeRequestId: 0,
  });

  function dispatchVideo(event: VideoPlayerMachineEvent) {
    setMachine((prev) => transitionVideoLoadState(prev, event));
  }

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
    if (el.readyState >= 1 && !el.error) {
      if (Number.isFinite(el.duration) && el.duration > 0) {
        setDuration(el.duration);
      }
      if (el.videoWidth > 0 && el.videoHeight > 0) {
        const nextLandscape = el.videoWidth > el.videoHeight;
        setIsLandscape(nextLandscape);
        onLandscapeChangeRef.current?.(nextLandscape);
      }
    }
    dispatchVideo({
      type: "mount",
      readyState: el.readyState,
      hasMediaError: Boolean(el.error),
    });
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
      const nextLandscape = el.videoWidth > el.videoHeight;
      setIsLandscape(nextLandscape);
      onLandscapeChangeRef.current?.(nextLandscape);
    }
    el.defaultPlaybackRate = speedRef.current;
    el.playbackRate = speedRef.current;
    dispatchVideo({ type: "metadata", readyState: el.readyState });
  }

  function startPlayback(el: HTMLVideoElement, isRetry = false) {
    const requestId = ++playRequestIdRef.current;
    dispatchVideo(
      isRetry
        ? { type: "retry_requested", requestId }
        : { type: "play_requested", readyState: el.readyState, requestId },
    );
    el.defaultPlaybackRate = speedRef.current;
    el.playbackRate = speedRef.current;
    void el.play().catch((err: unknown) => {
      const name = err instanceof Error ? err.name : "";
      if (name !== "AbortError" || el.paused) {
        setIsPlaying(false);
      }
      dispatchVideo({
        type: "play_rejected",
        requestId,
        aborted: name === "AbortError",
        isElementPaused: el.paused,
        readyState: el.readyState,
        hasMediaError: Boolean(el.error),
        notSupported: name === "NotSupportedError",
      });
    });
  }

  function togglePlay() {
    const el = videoRef.current;
    if (!el) return;
    if (machine.status === "error") {
      retryVideo();
      return;
    }
    if (el.paused || el.ended) {
      startPlayback(el, false);
    } else {
      playRequestIdRef.current += 1;
      setIsPlaying(false);
      el.pause();
      dispatchVideo({
        type: "pause",
        isElementPaused: true,
        readyState: el.readyState,
      });
    }
  }

  function retryVideo() {
    const el = videoRef.current;
    if (!el) return;
    setIsPlaying(false);
    el.load();
    startPlayback(el, true);
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
      startPlayback(el, false);
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

  const videoState = machine.status;
  const transportSurface: SurfaceVars = {
    "--guest-ctl-bg": "var(--guest-section-bg)",
    "--guest-ctl-border": "var(--guest-control-border)",
    "--guest-ctl-fg": "var(--guest-text)",
  };

  return (
    <div className="min-w-0 space-y-2.5">
      <div
        className={`guest-video-stage relative mx-auto overflow-hidden rounded-xl ${
          isLandscape ? "w-full aspect-video" : "w-full max-w-[296px] md:max-w-none aspect-[9/16]"
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
          onLoadStart={() => dispatchVideo({ type: "loadstart" })}
          onLoadedMetadata={handleLoadedMetadata}
          onLoadedData={handleLoadedMetadata}
          onDurationChange={handleLoadedMetadata}
          onCanPlay={() => dispatchVideo({ type: "canplay" })}
          onWaiting={() => dispatchVideo({ type: "waiting", isPlaying })}
          onPlaying={() => {
            dispatchVideo({ type: "playing" });
            setIsPlaying(true);
          }}
          onError={() => {
            setIsPlaying(false);
            dispatchVideo({ type: "error" });
          }}
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
          onPause={() => {
            const el = videoRef.current;
            const paused = el ? el.paused : true;
            if (paused) {
              setIsPlaying(false);
            }
            dispatchVideo({
              type: "pause",
              isElementPaused: paused,
              readyState: el ? el.readyState : 0,
            });
          }}
          onEnded={() => {
            const el = videoRef.current;
            setIsPlaying(false);
            dispatchVideo({
              type: "pause",
              isElementPaused: true,
              readyState: el ? el.readyState : 0,
            });
          }}
          className="h-full w-full cursor-pointer object-contain"
        />

        {videoState === "loading" && (
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-none absolute left-2.5 top-2.5 z-10 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
            style={{
              background: "var(--guest-card)",
              color: "var(--guest-text)",
            }}
          >
            <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
            <span>Loading…</span>
          </div>
        )}

        {!isPlaying && videoState !== "error" && (
          <button
            type="button"
            onClick={togglePlay}
            aria-label={`Play ${step.title} video`}
            className="guest-video-scrim absolute inset-0 flex items-center justify-center rounded-xl transition-[background-color] duration-150"
          >
            <span
              className="flex h-12 w-12 items-center justify-center rounded-full shadow-lg"
              style={{
                background: "var(--guest-accent-fill)",
                color: "var(--guest-on-accent)",
              }}
            >
              <Play className="h-5 w-5 translate-x-0.5 fill-current" strokeWidth={1.75} />
            </span>
          </button>
        )}
      </div>

      {videoState === "error" && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs"
          style={{
            background: "var(--guest-danger-soft)",
            borderColor: "var(--guest-danger)",
            color: "var(--guest-danger-ink)",
          }}
        >
          <span className="inline-flex items-center gap-1.5 font-medium">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            <span>Video couldn&apos;t load.</span>
          </span>
          <button
            type="button"
            onClick={retryVideo}
            className="guest-control-surface inline-flex min-h-[44px] items-center whitespace-nowrap rounded-lg border px-3 text-xs font-semibold transition-[background-color,border-color,transform] duration-150 active:scale-[0.985]"
            style={
              {
                "--guest-ctl-bg": "var(--guest-card)",
                "--guest-ctl-border": "var(--guest-danger)",
                "--guest-ctl-fg": "var(--guest-danger-ink)",
              } as SurfaceVars
            }
          >
            Retry video
          </button>
        </div>
      )}

      {/* Scrubbing timeline & 44px touch-safe playback controls */}
      <div className="space-y-2 pt-0.5">
        <div className="flex items-center gap-2">
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
            className="guest-range min-w-0 flex-1"
            style={{ accentColor: "var(--guest-accent)" }}
          />
          <span
            className="shrink-0 font-mono text-[11px] font-medium tabular-nums"
            style={{ color: "var(--guest-text-muted)" }}
          >
            {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
          </span>
        </div>

        {/* Transport row: fits cleanly down to 320px phone & 264px desktop column */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause video" : "Play video"}
              className="guest-control-surface inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border transition-[background-color,border-color,transform] duration-150 active:scale-[0.985]"
              style={transportSurface}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" strokeWidth={1.75} />
              ) : (
                <Play className="h-4 w-4" strokeWidth={1.75} />
              )}
            </button>
            <button
              type="button"
              disabled={duration <= 0}
              onClick={() => nudgeTime(-5)}
              aria-label="Rewind 5s"
              title="Back 5s"
              className="guest-control-surface inline-flex min-h-[44px] items-center gap-1 whitespace-nowrap rounded-lg border px-2.5 text-xs font-medium tabular-nums transition-[background-color,border-color,transform,opacity] duration-150 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45"
              style={transportSurface}
            >
              <RotateCcw className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              <span>5s</span>
            </button>
            <button
              type="button"
              disabled={duration <= 0}
              onClick={() => nudgeTime(5)}
              aria-label="Forward 5s"
              title="Forward 5s"
              className="guest-control-surface inline-flex min-h-[44px] items-center gap-1 whitespace-nowrap rounded-lg border px-2.5 text-xs font-medium tabular-nums transition-[background-color,border-color,transform,opacity] duration-150 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-45"
              style={transportSurface}
            >
              <span>5s</span>
              <RotateCw className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            </button>
          </div>

          <button
            type="button"
            onClick={enterFullscreen}
            aria-label="Fullscreen video"
            title="Fullscreen"
            className="guest-control-surface inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border transition-[background-color,border-color,transform] duration-150 active:scale-[0.985]"
            style={transportSurface}
          >
            <Maximize2 className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Speed selector: full-width 44px segmented bar */}
        <div
          className="grid rounded-lg border p-0.5"
          style={{
            borderColor: "var(--guest-control-border)",
            background: "var(--guest-section-bg)",
            gridTemplateColumns: `repeat(${speedChoices.length}, minmax(0, 1fr))`,
          }}
          role="group"
          aria-label="Playback speed"
        >
          {speedChoices.map((rateOption) => {
            const active = speed === rateOption;
            return (
              <button
                key={rateOption}
                type="button"
                onClick={() => applySpeed(rateOption)}
                aria-pressed={active}
                className={`${
                  active ? "hover:opacity-90" : "guest-control-surface"
                } inline-flex min-h-[44px] items-center justify-center whitespace-nowrap rounded-md px-2 text-xs font-semibold tabular-nums transition-[background-color,color,transform,opacity] duration-150 active:scale-[0.985]`}
                style={
                  active
                    ? {
                        background: "var(--guest-accent-fill)",
                        color: "var(--guest-on-accent)",
                      }
                    : ({
                        "--guest-ctl-bg": "transparent",
                        "--guest-ctl-fg": "var(--guest-text)",
                      } as SurfaceVars)
                }
              >
                {rateOption}×
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function CheckinWalkthrough({
  steps,
  heading = "Check-In Walkthrough",
  subtitle,
  storageKey = "hostkit_completed_steps",
  completable = true,
  defaultOpenFirst = true,
}: {
  steps: Step[];
  heading?: string;
  subtitle?: string;
  storageKey?: string;
  completable?: boolean;
  defaultOpenFirst?: boolean;
}) {
  const [open, setOpen] = useState<number | null>(
    defaultOpenFirst ? (steps[0]?.step ?? null) : null,
  );
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [landscapeSteps, setLandscapeSteps] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!completable) return;
    const validIds = new Set(steps.map((s) => s.step));
    const repaired = hydrateAndRepairCompletedSteps(
      getSafeLocalStorage(),
      storageKey,
      validIds,
    );
    setCompletedSteps(repaired);
  }, [completable, storageKey, steps]);

  function toggleComplete(step: number) {
    setCompletedSteps((prev) => {
      const updated = prev.includes(step)
        ? prev.filter((s) => s !== step)
        : [...prev, step];
      try {
        getSafeLocalStorage()?.setItem(storageKey, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>>;
  const validStepIds = new Set(steps.map((s) => s.step));
  const validDoneCount = completedSteps.filter((id) => validStepIds.has(id)).length;
  const progressPercent = steps.length > 0 ? Math.round((validDoneCount / steps.length) * 100) : 0;

  return (
    <div>
      <div className="mb-3.5 flex flex-col">
        <h2
          className="font-[family-name:var(--font-dm-sans)] text-lg font-semibold tracking-tight not-italic"
          style={{ overflowWrap: "anywhere", minWidth: 0 }}
        >
          {heading}
        </h2>
        {subtitle && (
          <p className="mt-1 max-w-[58ch] text-sm leading-relaxed" style={{ color: "var(--guest-text-muted)" }}>
            {subtitle}
          </p>
        )}
        {completable && (
          <div className="mt-3 space-y-1.5">
            <div
              aria-hidden="true"
              className="h-1 w-full overflow-hidden rounded-full"
              style={{ background: "var(--guest-card-border)" }}
            >
              <div
                className="h-full w-full origin-left rounded-full transition-transform duration-200"
                style={{
                  transform: `scaleX(${progressPercent / 100})`,
                  background: "var(--guest-success)",
                }}
              />
            </div>
            <p
              className="font-mono text-xs font-medium tabular-nums"
              style={{
                color: validDoneCount > 0 ? "var(--guest-success)" : "var(--guest-text-muted)",
              }}
            >
              {validDoneCount} of {steps.length} steps completed
            </p>
          </div>
        )}
      </div>

      <ol
        className="divide-y overflow-hidden rounded-2xl border"
        style={{
          background: "var(--guest-card)",
          borderColor: "var(--guest-card-border)",
        }}
      >
        {steps.map((s) => {
          const IconComponent = s.icon
            ? icons[toPascalCase(s.icon)] ?? LucideIcons.MapPin
            : LucideIcons.MapPin;
          const isOpen = open === s.step;
          const isDone = completable && completedSteps.includes(s.step);
          const hasMedia = Boolean(s.mediaUrl && (s.mediaType === "image" || s.mediaType === "video"));
          const isLandscapeMedia = Boolean(landscapeSteps[s.step]);
          const initialRate = resolveInitialPlaybackRate(s);
          const sideBySideDesktop = hasMedia && !isLandscapeMedia;

          const doneBtnVars: SurfaceVars = isDone
            ? {
                "--guest-ctl-bg": "var(--guest-success-soft)",
                "--guest-ctl-border": "var(--guest-success)",
                "--guest-ctl-fg": "var(--guest-success-ink)",
              }
            : {
                "--guest-ctl-bg": "var(--guest-section-bg)",
                "--guest-ctl-border": "var(--guest-control-border)",
                "--guest-ctl-fg": "var(--guest-text)",
              };

          return (
            <li
              key={s.step}
              className="transition-[background-color] duration-150"
              style={{
                borderTopColor: "var(--guest-card-border)",
              }}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : s.step)}
                aria-expanded={isOpen}
                className="guest-hover-row flex min-h-[52px] w-full items-center gap-2.5 px-3.5 py-3 text-left transition-[background-color] duration-150 sm:gap-3 sm:px-4"
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-semibold tabular-nums"
                  style={{
                    background: isDone
                      ? "var(--guest-success-soft)"
                      : isOpen
                        ? "var(--guest-accent-soft)"
                        : "var(--guest-section-bg)",
                    borderColor: isDone
                      ? "var(--guest-success)"
                      : isOpen
                        ? "var(--guest-accent)"
                        : "var(--guest-card-border)",
                    color: isDone
                      ? "var(--guest-success-ink)"
                      : isOpen
                        ? "var(--guest-accent-ink)"
                        : "var(--guest-text-muted)",
                  }}
                >
                  {isDone ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={2.25} />
                  ) : (
                    String(s.step).padStart(2, "0")
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    className="block text-sm font-semibold leading-snug"
                    style={{
                      color: isDone ? "var(--guest-text-muted)" : "var(--guest-text)",
                    }}
                  >
                    {s.title}
                  </span>
                </span>

                {!isOpen && s.mediaType === "video" && (
                  <span
                    className="hidden shrink-0 whitespace-nowrap rounded-md border px-2 py-0.5 font-mono text-[11px] font-medium tabular-nums sm:inline-flex"
                    style={{
                      background: "var(--guest-section-bg)",
                      borderColor: "var(--guest-card-border)",
                      color: "var(--guest-text-muted)",
                    }}
                  >
                    {initialRate < 1 ? `${initialRate}× video` : "Video"}
                  </span>
                )}
                {!isOpen && s.mediaType === "image" && (
                  <span
                    className="hidden shrink-0 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium sm:inline-flex"
                    style={{
                      background: "var(--guest-section-bg)",
                      borderColor: "var(--guest-card-border)",
                      color: "var(--guest-text-muted)",
                    }}
                  >
                    Photo
                  </span>
                )}

                <ChevronDown
                  className="h-4 w-4 shrink-0 transition-transform duration-150"
                  strokeWidth={1.75}
                  style={{
                    color: "var(--guest-text-muted)",
                    transform: isOpen ? "rotate(180deg)" : "none",
                  }}
                />
              </button>

              {isOpen && (
                <div
                  className={`border-t px-3.5 pb-4 pt-3.5 sm:px-4 ${
                    sideBySideDesktop
                      ? "space-y-4 md:grid md:grid-cols-[minmax(0,1fr)_272px] md:items-start md:gap-5 md:space-y-0"
                      : "space-y-4"
                  }`}
                  style={{ borderColor: "var(--guest-card-border)" }}
                >
                  <div className="min-w-0 space-y-3.5">
                    <div className="flex items-start gap-2.5">
                      <span
                        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center"
                        style={{ color: "var(--guest-accent)" }}
                      >
                        <IconComponent className="h-4 w-4" strokeWidth={1.75} />
                      </span>
                      <p
                        className="max-w-[56ch] text-sm leading-relaxed"
                        style={{ color: "var(--guest-text-muted)" }}
                      >
                        {s.description}
                      </p>
                    </div>

                    {s.mediaType === "video" && initialRate < 1 && (
                      <p
                        className="border-l-2 py-0.5 pl-3 text-xs leading-relaxed"
                        style={{
                          borderColor: "var(--guest-accent)",
                          color: "var(--guest-text-muted)",
                        }}
                      >
                        Set to{" "}
                        <strong
                          className="font-semibold"
                          style={{ color: "var(--guest-text)" }}
                        >
                          {initialRate}× slow motion
                        </strong>{" "}
                        by default so every turn is easy to follow. Drag the timeline to scrub at your own pace.
                      </p>
                    )}

                    {completable && (
                      <div>
                        <button
                          type="button"
                          onClick={() => toggleComplete(s.step)}
                          className="guest-control-surface inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-xl border px-3.5 text-xs font-semibold leading-none transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.985]"
                          style={doneBtnVars}
                        >
                          <Check
                            className="h-3.5 w-3.5 shrink-0"
                            strokeWidth={isDone ? 2.25 : 1.75}
                          />
                          <span>{isDone ? "Completed" : "Mark as Done"}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {s.mediaUrl && s.mediaType === "image" && (
                    <div
                      className={`overflow-hidden rounded-xl p-2 ${
                        sideBySideDesktop ? "md:border-l md:pl-5 md:rounded-none md:p-0" : ""
                      }`}
                      style={{
                        background: sideBySideDesktop ? undefined : "var(--guest-section-bg)",
                        borderColor: "var(--guest-card-border)",
                      }}
                    >
                      <Image
                        src={s.mediaUrl}
                        alt={s.title}
                        width={600}
                        height={800}
                        unoptimized={s.mediaUrl.startsWith("/guide-media/")}
                        className="mx-auto max-h-80 w-full rounded-lg object-contain"
                      />
                    </div>
                  )}

                  {s.mediaUrl && s.mediaType === "video" && (
                    <div
                      className={
                        sideBySideDesktop ? "md:border-l md:pl-5" : undefined
                      }
                      style={{ borderColor: "var(--guest-card-border)" }}
                    >
                      <StepVideoPlayer
                        key={s.mediaUrl}
                        step={s}
                        onLandscapeChange={(next) =>
                          setLandscapeSteps((prev) =>
                            prev[s.step] === next ? prev : { ...prev, [s.step]: next },
                          )
                        }
                      />
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
