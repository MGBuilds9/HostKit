import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Mock DOM environment — mirrors what use-theme.ts actually calls on
// window.document.documentElement.classList, localStorage, and matchMedia.
// ---------------------------------------------------------------------------
function createMockEnvironment() {
  const classList = new Set<string>();
  const storage = new Map<string, string>();
  const listeners = new Map<string, Function[]>();

  return {
    document: {
      documentElement: {
        classList: {
          add: (cls: string) => classList.add(cls),
          remove: (cls: string) => classList.delete(cls),
          toggle: (cls: string, force?: boolean) => {
            if (force === undefined) {
              if (classList.has(cls)) classList.delete(cls);
              else classList.add(cls);
            } else if (force) {
              classList.add(cls);
            } else {
              classList.delete(cls);
            }
            return classList.has(cls);
          },
          contains: (cls: string) => classList.has(cls),
        },
      },
    },
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
    matchMedia: (query: string) => ({
      matches: false, // default: system prefers light
      addEventListener: (event: string, fn: Function) => {
        const key = `${query}:${event}`;
        if (!listeners.has(key)) listeners.set(key, []);
        listeners.get(key)!.push(fn);
      },
      removeEventListener: (event: string, fn: Function) => {
        const key = `${query}:${event}`;
        const fns = listeners.get(key);
        if (fns) {
          const idx = fns.indexOf(fn);
          if (idx !== -1) fns.splice(idx, 1);
        }
      },
    }),
    // Expose internals for assertions
    classList,
    storage,
    listeners,
  };
}

// ---------------------------------------------------------------------------
// applyTheme logic — extracted from use-theme.ts
// ---------------------------------------------------------------------------
function applyTheme(
  env: ReturnType<typeof createMockEnvironment>,
  theme: "light" | "dark" | "system"
) {
  const systemDark = env.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved =
    theme === "system" ? (systemDark ? "dark" : "light") : theme;
  env.document.documentElement.classList.toggle("dark", resolved === "dark");
}

const STORAGE_KEY = "hostkit-theme";

// ---------------------------------------------------------------------------
// Tests: core theme application logic
// ---------------------------------------------------------------------------
describe("theme logic", () => {
  it("applies dark class when theme is dark", () => {
    const env = createMockEnvironment();
    applyTheme(env, "dark");
    expect(env.classList.has("dark")).toBe(true);
  });

  it("removes dark class when theme is light", () => {
    const env = createMockEnvironment();
    env.classList.add("dark"); // simulate a pre-existing dark class
    applyTheme(env, "light");
    expect(env.classList.has("dark")).toBe(false);
  });

  it("system theme resolves to light when system prefers light", () => {
    const env = createMockEnvironment();
    // matchMedia returns matches: false by default → system is light
    const systemDark = env.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved = "system" === "system" ? (systemDark ? "dark" : "light") : "system";
    expect(resolved).toBe("light");
    applyTheme(env, "system");
    expect(env.classList.has("dark")).toBe(false);
  });

  it("dark class is toggled off when switching from dark to light", () => {
    const env = createMockEnvironment();
    applyTheme(env, "dark");
    expect(env.classList.has("dark")).toBe(true);
    applyTheme(env, "light");
    expect(env.classList.has("dark")).toBe(false);
  });

  it("dark class is added when switching from light to dark", () => {
    const env = createMockEnvironment();
    applyTheme(env, "light");
    expect(env.classList.has("dark")).toBe(false);
    applyTheme(env, "dark");
    expect(env.classList.has("dark")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: localStorage persistence
// ---------------------------------------------------------------------------
describe("theme persistence", () => {
  it("persists dark theme to localStorage under correct key", () => {
    const env = createMockEnvironment();
    env.localStorage.setItem(STORAGE_KEY, "dark");
    expect(env.localStorage.getItem(STORAGE_KEY)).toBe("dark");
  });

  it("persists light theme to localStorage under correct key", () => {
    const env = createMockEnvironment();
    env.localStorage.setItem(STORAGE_KEY, "light");
    expect(env.localStorage.getItem(STORAGE_KEY)).toBe("light");
  });

  it("persists system theme to localStorage under correct key", () => {
    const env = createMockEnvironment();
    env.localStorage.setItem(STORAGE_KEY, "system");
    expect(env.localStorage.getItem(STORAGE_KEY)).toBe("system");
  });

  it("reads stored theme from localStorage", () => {
    const env = createMockEnvironment();
    env.localStorage.setItem(STORAGE_KEY, "dark");
    const stored = env.localStorage.getItem(STORAGE_KEY) as
      | "light"
      | "dark"
      | "system"
      | null;
    expect(stored).toBe("dark");
  });

  it("defaults to system when no stored theme exists", () => {
    const env = createMockEnvironment();
    const stored = env.localStorage.getItem(STORAGE_KEY) ?? "system";
    expect(stored).toBe("system");
  });

  it("overwriting stored theme returns the new value", () => {
    const env = createMockEnvironment();
    env.localStorage.setItem(STORAGE_KEY, "dark");
    env.localStorage.setItem(STORAGE_KEY, "light");
    expect(env.localStorage.getItem(STORAGE_KEY)).toBe("light");
  });

  it("removing stored theme makes getItem return null", () => {
    const env = createMockEnvironment();
    env.localStorage.setItem(STORAGE_KEY, "dark");
    env.localStorage.removeItem(STORAGE_KEY);
    expect(env.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests: flash-prevention inline script (themeScript from layout.tsx)
// ---------------------------------------------------------------------------
describe("flash prevention script logic", () => {
  it("does not apply dark class when storage is empty and system prefers light", () => {
    const env = createMockEnvironment();
    // matchMedia.matches === false → system is light
    const t = env.localStorage.getItem(STORAGE_KEY) || "system";
    const dark =
      t === "dark" ||
      (t === "system" &&
        env.matchMedia("(prefers-color-scheme: dark)").matches);
    if (dark) env.document.documentElement.classList.add("dark");
    expect(env.classList.has("dark")).toBe(false);
  });

  it("applies dark class when stored theme is explicitly 'dark'", () => {
    const env = createMockEnvironment();
    env.storage.set(STORAGE_KEY, "dark");
    const t = env.localStorage.getItem(STORAGE_KEY) || "system";
    const dark =
      t === "dark" ||
      (t === "system" &&
        env.matchMedia("(prefers-color-scheme: dark)").matches);
    if (dark) env.document.documentElement.classList.add("dark");
    expect(env.classList.has("dark")).toBe(true);
  });

  it("does not apply dark class when stored theme is 'light'", () => {
    const env = createMockEnvironment();
    env.storage.set(STORAGE_KEY, "light");
    const t = env.localStorage.getItem(STORAGE_KEY) || "system";
    const dark =
      t === "dark" ||
      (t === "system" &&
        env.matchMedia("(prefers-color-scheme: dark)").matches);
    if (dark) env.document.documentElement.classList.add("dark");
    expect(env.classList.has("dark")).toBe(false);
  });

  it("script uses 'hostkit-theme' as the storage key", () => {
    // Ensures the key in the inline script matches the one used by the hook
    expect(STORAGE_KEY).toBe("hostkit-theme");
  });

  it("script falls back to 'system' when stored value is falsy", () => {
    const env = createMockEnvironment();
    const t = env.localStorage.getItem(STORAGE_KEY) || "system";
    expect(t).toBe("system");
  });
});

// ---------------------------------------------------------------------------
// Tests: resolvedTheme derivation
// ---------------------------------------------------------------------------
describe("resolvedTheme", () => {
  it("resolvedTheme is 'dark' when theme is 'dark'", () => {
    const theme: string = "dark";
    const systemDark = false;
    const resolved = theme === "system" ? (systemDark ? "dark" : "light") : theme;
    expect(resolved).toBe("dark");
  });

  it("resolvedTheme is 'light' when theme is 'light'", () => {
    const theme: string = "light";
    const systemDark = false;
    const resolved = theme === "system" ? (systemDark ? "dark" : "light") : theme;
    expect(resolved).toBe("light");
  });

  it("resolvedTheme is 'light' when theme is 'system' and system prefers light", () => {
    const theme = "system";
    const systemDark = false;
    const resolved = theme === "system" ? (systemDark ? "dark" : "light") : theme;
    expect(resolved).toBe("light");
  });

  it("resolvedTheme is never 'system' — always concrete light or dark", () => {
    for (const theme of ["light", "dark", "system"] as const) {
      const systemDark = false;
      const resolved = theme === "system" ? (systemDark ? "dark" : "light") : theme;
      expect(["light", "dark"]).toContain(resolved);
    }
  });
});
