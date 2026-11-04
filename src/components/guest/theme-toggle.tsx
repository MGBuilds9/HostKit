"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { getSafeLocalStorage } from "@/lib/guide-utils";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const root = document.documentElement;
    root.setAttribute("data-theme-switching", "");
    const nextDark = !root.classList.contains("dark");
    root.classList.toggle("dark", nextDark);
    try {
      getSafeLocalStorage()?.setItem("hostkit-theme", nextDark ? "dark" : "light");
    } catch {
      // ignore storage errors in private browsing
    }
    setIsDark(nextDark);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.removeAttribute("data-theme-switching");
      });
    });
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={
        mounted
          ? isDark
            ? "Switch to light mode"
            : "Switch to dark mode"
          : "Toggle color theme"
      }
      title={
        mounted
          ? isDark
            ? "Switch to light mode"
            : "Switch to dark mode"
          : "Toggle color theme"
      }
      className="guest-hover-row inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full transition-[background-color,color,transform] duration-150 active:scale-[0.97]"
      style={{ color: "var(--guest-text-muted)" }}
    >
      {mounted && isDark ? (
        <Sun className="h-4 w-4" strokeWidth={1.75} />
      ) : (
        <Moon className="h-4 w-4" strokeWidth={1.75} />
      )}
    </button>
  );
}
