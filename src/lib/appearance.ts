import type { ShellPrefs } from "@/lib/gen/shell-prefs";

export type ResolvedTheme = "light" | "dark";

export function resolveTheme(theme: ShellPrefs["theme"]): ResolvedTheme {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

export function applyAppearance(prefs: ShellPrefs): ResolvedTheme {
  const root = document.documentElement;
  const resolved = resolveTheme(prefs.theme);
  if (resolved === "dark") {
    root.dataset.theme = "dark";
  } else {
    delete root.dataset.theme;
  }
  root.dataset.accent = prefs.accent;
  root.dataset.font = prefs.font;
  root.dataset.motion = prefs.motion;
  root.lang = prefs.locale === "en" ? "en" : "zh-CN";
  return resolved;
}
