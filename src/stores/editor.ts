import { create } from "zustand";
import { temporal } from "zundo";

import { toFlowFile } from "@/lib/flow-file";
import { PROCESS_CATALOG, type LocateProfile, type TargetMatch } from "@/lib/targets";
import { createDemoSteps, createStepId, type TemplateDraft, type TemplateStep } from "@/lib/template";

interface EditorStore {
  steps: TemplateStep[];
  keymapProfileId: string;
  processId: string;
  match: TargetMatch;
  locate: LocateProfile;
  dirty: boolean;
  insertStep: (draft: TemplateDraft, index?: number) => void;
  removeStep: (id: string) => void;
  moveStep: (fromIndex: number, toIndex: number) => void;
  setStepDisabled: (id: string, disabled: boolean) => void;
  setKeymapProfileId: (id: string) => void;
  bindProcess: (processId: string) => void;
  setLocateChannel: (channel: LocateProfile["channel"]) => void;
  setVisionPack: (visionPack: string) => void;
  markSaved: () => void;
}

const firstProcess = PROCESS_CATALOG[0];

function clampIndex(index: number, length: number): number {
  if (index < 0) return 0;
  if (index > length) return length;
  return index;
}

export const useEditorStore = create<EditorStore>()(
  temporal(
    (set) => ({
      steps: createDemoSteps(),
      keymapProfileId: "default",
      processId: firstProcess?.id ?? "",
      match: firstProcess?.match ?? { exe: "", title: "", className: "" },
      locate: firstProcess?.recommended ?? {
        channel: "a11y",
        source: "probe",
        capture: "client",
        visionPack: "template",
      },
      dirty: false,
      insertStep: (draft, index) =>
        set((s) => {
          const next = [...s.steps];
          const at = clampIndex(index ?? next.length, next.length);
          next.splice(at, 0, { ...draft, id: createStepId(), config: { ...draft.config } });
          return { steps: next, dirty: true };
        }),
      removeStep: (id) =>
        set((s) => ({
          steps: s.steps.filter((step) => step.id !== id),
          dirty: true,
        })),
      moveStep: (fromIndex, toIndex) =>
        set((s) => {
          if (fromIndex === toIndex) return s;
          if (fromIndex < 0 || fromIndex >= s.steps.length) return s;
          const next = [...s.steps];
          const [item] = next.splice(fromIndex, 1);
          if (!item) return s;
          const at = clampIndex(toIndex, next.length);
          next.splice(at, 0, item);
          return { steps: next, dirty: true };
        }),
      setStepDisabled: (id, disabled) =>
        set((s) => ({
          steps: s.steps.map((step) => (step.id === id ? { ...step, disabled } : step)),
          dirty: true,
        })),
      setKeymapProfileId: (id) => set({ keymapProfileId: id, dirty: true }),
      bindProcess: (processId) =>
        set((s) => {
          const found = PROCESS_CATALOG.find((item) => item.id === processId);
          if (!found) return s;
          return {
            processId: found.id,
            match: found.match,
            locate: found.recommended,
            dirty: true,
          };
        }),
      setLocateChannel: (channel) =>
        set((s) => ({
          locate: { ...s.locate, channel, source: "user" },
          dirty: true,
        })),
      setVisionPack: (visionPack) =>
        set((s) => ({
          locate: { ...s.locate, visionPack, source: "user" },
          dirty: true,
        })),
      markSaved: () => set({ dirty: false }),
    }),
    { limit: 100 },
  ),
);

export function undoEdit() {
  useEditorStore.temporal.getState().undo();
}

export function redoEdit() {
  useEditorStore.temporal.getState().redo();
}

export function editorToFlowFile() {
  const state = useEditorStore.getState();
  return toFlowFile({
    keymapProfileId: state.keymapProfileId,
    match: state.match,
    locate: state.locate,
    steps: state.steps,
  });
}
