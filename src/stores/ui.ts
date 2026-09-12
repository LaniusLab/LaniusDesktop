import { create } from "zustand";

import { applyAppearance, resolveTheme, type ResolvedTheme } from "@/lib/appearance";
import { bridge, isTauri } from "@/lib/bridge";
import { translate } from "@/lib/i18n";
import { mergePrefs, readStoredPrefs, writeStoredPrefs } from "@/lib/prefs";
import type { ShellPrefs } from "@/lib/gen/shell-prefs";

interface UiState {
  prefs: ShellPrefs;
  resolvedTheme: ResolvedTheme;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  replacePrefs: (prefs: ShellPrefs) => void;
  patchPrefs: (patch: Partial<ShellPrefs>) => void;
  toggleTheme: () => void;
}

function persistAndApply(prefs: ShellPrefs): ResolvedTheme {
  writeStoredPrefs(prefs);
  return applyAppearance(prefs);
}

function syncShellPrefs(prefs: ShellPrefs): void {
  if (!isTauri) return;
  void bridge.prefsSet(prefs);
}

const initialPrefs = readStoredPrefs();
const initialResolved =
  typeof document === "undefined" ? resolveTheme(initialPrefs.theme) : applyAppearance(initialPrefs);

export const useUiStore = create<UiState>()((set, get) => ({
  prefs: initialPrefs,
  resolvedTheme: initialResolved,
  searchOpen: false,
  setSearchOpen: (open) => set({ searchOpen: open }),
  replacePrefs: (next) => {
    const prefs = mergePrefs(next);
    const resolvedTheme = persistAndApply(prefs);
    set({ prefs, resolvedTheme });
  },
  patchPrefs: (patch) => {
    const prefs = mergePrefs({
      ...get().prefs,
      ...patch,
      shortcuts: {
        ...get().prefs.shortcuts,
        ...(patch.shortcuts ?? {}),
      },
    });
    const resolvedTheme = persistAndApply(prefs);
    set({ prefs, resolvedTheme });
    syncShellPrefs(prefs);
  },
  toggleTheme: () => {
    const current = get().resolvedTheme;
    get().patchPrefs({ theme: current === "dark" ? "light" : "dark" });
  },
}));

export function useT(): (key: string, vars?: Record<string, string | number>) => string {
  const locale = useUiStore((s) => s.prefs.locale);
  return (key, vars) => translate(locale, key, vars);
}

if (typeof window !== "undefined") {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    const { prefs } = useUiStore.getState();
    if (prefs.theme !== "system") return;
    useUiStore.setState({ resolvedTheme: applyAppearance(prefs) });
  });
}
