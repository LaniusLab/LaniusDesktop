import type { ShellPrefs } from "@/lib/gen/shell-prefs";

export type ResolvedTheme = "light" | "dark";

/**
 * Resolve a prefs theme into a concrete light/dark value.
 * `system` follows `prefers-color-scheme`; CSS tokens then key off `data-theme`.
 */
export function resolveTheme(theme: ShellPrefs["theme"]): ResolvedTheme {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

/**
 * Push prefs into `<html>` datasets consumed by Tailwind theme tokens.
 * Contract: light = no `data-theme` attribute (default sheet); dark = `data-theme="dark"`.
 * Locale maps to `lang` so OS/IME heuristics stay aligned with UI copy.
 */
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
