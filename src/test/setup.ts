import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

import "@testing-library/jest-dom/vitest";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

afterEach(async () => {
  cleanup();
  localStorage.clear();
  const { applyAppearance } = await import("@/lib/appearance");
  const { DEFAULT_PREFS } = await import("@/lib/prefs");
  const { useUiStore } = await import("@/stores/ui");
  useUiStore.setState({
    prefs: { ...DEFAULT_PREFS, shortcuts: { ...DEFAULT_PREFS.shortcuts } },
    resolvedTheme: "light",
    searchOpen: false,
  });
  applyAppearance(DEFAULT_PREFS);
});
