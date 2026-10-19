import type { ShellPrefs } from "@/lib/gen/shell-prefs";

/** localStorage key for browser-preview prefs; Tauri path uses prefs.rs on disk. */
export const PREFS_STORAGE_KEY = "lanius.prefs";

/** First-run defaults. Keep in sync with `src-tauri/src/prefs.rs` ShellPrefs::default. */
export const DEFAULT_PREFS: ShellPrefs = {
  theme: "light",
  accent: "terracotta",
  font: "mixed",
  motion: "normal",
  locale: "zh-CN",
  closeBehavior: "quit",
  autostart: false,
  autoUpdate: false,
  blockAllDestructive: false,
  shortcuts: {
    palette: "Mod+K",
    run: "Mod+Enter",
  },
};

/**
 * Merge unknown/partial JSON into a complete ShellPrefs.
 * Shortcuts are deep-merged so a partial `{ palette }` does not wipe `run`.
 */
export function mergePrefs(partial: unknown): ShellPrefs {
  if (!partial || typeof partial !== "object") return { ...DEFAULT_PREFS };
  const raw = partial as Partial<ShellPrefs>;
  return {
    ...DEFAULT_PREFS,
    ...raw,
    shortcuts: {
      ...DEFAULT_PREFS.shortcuts,
      ...(raw.shortcuts ?? {}),
    },
  };
}

/** Read browser-local prefs; corrupt JSON falls back to defaults (never throws). */
export function readStoredPrefs(): ShellPrefs {
  if (typeof localStorage === "undefined") return { ...DEFAULT_PREFS };
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return mergePrefs(JSON.parse(raw) as unknown);
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function writeStoredPrefs(prefs: ShellPrefs): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
}

/**
 * Settings can override only palette/run bindings; other commands keep registry defaults.
 * Maps command ids → prefs.shortcuts keys (gotcha: id is `app.search`, key is `palette`).
 */
export function commandShortcut(
  id: string,
  prefs: ShellPrefs,
  fallback?: string,
): string | undefined {
  if (id === "app.search") return prefs.shortcuts.palette;
  if (id === "flow.run") return prefs.shortcuts.run;
  return fallback;
}
