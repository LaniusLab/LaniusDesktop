import type { ShellPrefs } from "@/lib/gen/shell-prefs";

export const PREFS_STORAGE_KEY = "lanius.prefs";

export const DEFAULT_PREFS: ShellPrefs = {
  theme: "light",
  accent: "terracotta",
  font: "mixed",
  motion: "normal",
  locale: "zh-CN",
  closeBehavior: "quit",
  autostart: false,
  autoUpdate: false,
  shortcuts: {
    palette: "Mod+K",
    run: "Mod+Enter",
  },
};

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

/** 设置里可改的绑定覆盖命令默认值；其余仍用注册表上的 shortcut。 */
export function commandShortcut(
  id: string,
  prefs: ShellPrefs,
  fallback?: string,
): string | undefined {
  if (id === "app.search") return prefs.shortcuts.palette;
  if (id === "flow.run") return prefs.shortcuts.run;
  return fallback;
}
