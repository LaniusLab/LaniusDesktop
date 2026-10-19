import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

import "@testing-library/jest-dom/vitest";

class ResizeObserverStub {
  observe(): void {
    return undefined;
  }
  unobserve(): void {
    return undefined;
  }
  disconnect(): void {
    return undefined;
  }
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

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
  const { useKeymapStore } = await import("@/stores/keymap");
  const { createDefaultKeymapState } = await import("@/lib/keymap");
  useKeymapStore.setState(createDefaultKeymapState());
  useUiStore.setState({
    prefs: { ...DEFAULT_PREFS, shortcuts: { ...DEFAULT_PREFS.shortcuts } },
    resolvedTheme: "light",
    searchOpen: false,
    settingsOpen: false,
    sidebarCollapsed: false,
    sidebarWidth: 208,
    startTopHeight: 280,
    startLogWidth: 320,
    editorPaletteWidth: 192,
    editorInspectorWidth: 280,
    editorLogHeight: 140,
  });
  const { useEditorStore } = await import("@/stores/editor");
  const { defaultStoredTemplate } = await import("@/lib/template-store");
  const { useExecutionStore } = await import("@/stores/execution");
  const editor = defaultStoredTemplate();
  useEditorStore.setState({
    ...editor,
    selectedStepId: editor.steps[0]?.id,
    filePath: undefined,
    flowId: "session-template",
    flowName: "当前模板",
  });
  useEditorStore.temporal.getState().clear();
  useExecutionStore.setState({
    engineStatus: "starting",
    engineUptimeMs: 0,
    phase: "idle",
    logLines: [],
    runs: [],
    stepStatuses: {},
    activeStepId: undefined,
    pendingRun: undefined,
  });
  applyAppearance(DEFAULT_PREFS);
});
