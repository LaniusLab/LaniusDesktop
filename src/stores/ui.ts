import { create } from "zustand";

import { applyAppearance, resolveTheme, type ResolvedTheme } from "@/lib/appearance";
import { bridge, isTauri } from "@/lib/bridge";
import { translate } from "@/lib/i18n";
import { mergePrefs, readStoredPrefs, writeStoredPrefs } from "@/lib/prefs";
import type { ShellPrefs } from "@/lib/gen/shell-prefs";

export const DEFAULT_LAYOUT = {
  sidebarWidth: 208,
  startTopHeight: 280,
  startLogWidth: 320,
  editorPaletteWidth: 192,
  editorInspectorWidth: 280,
  editorLogHeight: 140,
} as const;

interface UiState {
  prefs: ShellPrefs;
  resolvedTheme: ResolvedTheme;
  searchOpen: boolean;
  settingsOpen: boolean;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  startTopHeight: number;
  startLogWidth: number;
  editorPaletteWidth: number;
  editorInspectorWidth: number;
  editorLogHeight: number;
  setSearchOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setStartTopHeight: (height: number) => void;
  setStartLogWidth: (width: number) => void;
  setEditorPaletteWidth: (width: number) => void;
  setEditorInspectorWidth: (width: number) => void;
  setEditorLogHeight: (height: number) => void;
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
  settingsOpen: false,
  sidebarCollapsed: false,
  sidebarWidth: DEFAULT_LAYOUT.sidebarWidth,
  startTopHeight: DEFAULT_LAYOUT.startTopHeight,
  startLogWidth: DEFAULT_LAYOUT.startLogWidth,
  editorPaletteWidth: DEFAULT_LAYOUT.editorPaletteWidth,
  editorInspectorWidth: DEFAULT_LAYOUT.editorInspectorWidth,
  editorLogHeight: DEFAULT_LAYOUT.editorLogHeight,
  setSearchOpen: (open) => set({ searchOpen: open }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setStartTopHeight: (height) => set({ startTopHeight: height }),
  setStartLogWidth: (width) => set({ startLogWidth: width }),
  setEditorPaletteWidth: (width) => set({ editorPaletteWidth: width }),
  setEditorInspectorWidth: (width) => set({ editorInspectorWidth: width }),
  setEditorLogHeight: (height) => set({ editorLogHeight: height }),
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
