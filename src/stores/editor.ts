import { create } from "zustand";
import { temporal } from "zundo";

import { toFlowFile } from "@/lib/flow-file";
import { PROCESS_CATALOG, type LocateProfile, type TargetMatch } from "@/lib/targets";
import { createStepId, type TemplateDraft, type TemplateStep } from "@/lib/template";
import { readStoredTemplate, writeStoredTemplate, type StoredTemplate } from "@/lib/template-store";

interface EditorStore {
  steps: TemplateStep[];
  keymapProfileId: string;
  processId: string;
  match: TargetMatch;
  locate: LocateProfile;
  dirty: boolean;
  selectedStepId?: string;
  insertStep: (draft: TemplateDraft, index?: number) => void;
  removeStep: (id: string) => void;
  moveStep: (fromIndex: number, toIndex: number) => void;
  setStepDisabled: (id: string, disabled: boolean) => void;
  patchStep: (id: string, patch: Partial<TemplateStep>) => void;
  selectStep: (id?: string) => void;
  setKeymapProfileId: (id: string) => void;
  bindProcess: (processId: string) => void;
  setLocateChannel: (channel: LocateProfile["channel"]) => void;
  setVisionPack: (visionPack: string) => void;
  saveTemplate: () => void;
  markSaved: () => void;
}

const initial = readStoredTemplate();

function clampIndex(index: number, length: number): number {
  if (index < 0) return 0;
  if (index > length) return length;
  return index;
}

function snapshot(state: Pick<EditorStore, keyof StoredTemplate>): StoredTemplate {
  return {
    steps: state.steps,
    keymapProfileId: state.keymapProfileId,
    processId: state.processId,
    match: state.match,
    locate: state.locate,
    dirty: state.dirty,
  };
}

export const useEditorStore = create<EditorStore>()(
  temporal(
    (set, get) => ({
      steps: initial.steps,
      keymapProfileId: initial.keymapProfileId,
      processId: initial.processId,
      match: initial.match,
      locate: initial.locate,
      dirty: initial.dirty,
      selectedStepId: initial.steps[0]?.id,
      insertStep: (draft, index) => {
        const id = createStepId();
        set((s) => {
          const next = [...s.steps];
          const at = clampIndex(index ?? next.length, next.length);
          next.splice(at, 0, { ...draft, id, config: { ...draft.config } });
          return { steps: next, dirty: true, selectedStepId: id };
        });
        writeStoredTemplate(snapshot(get()));
      },
      removeStep: (id) => {
        set((s) => ({
          steps: s.steps.filter((step) => step.id !== id),
          dirty: true,
          selectedStepId: s.selectedStepId === id ? undefined : s.selectedStepId,
        }));
        writeStoredTemplate(snapshot(get()));
      },
      moveStep: (fromIndex, toIndex) => {
        set((s) => {
          if (fromIndex === toIndex) return s;
          if (fromIndex < 0 || fromIndex >= s.steps.length) return s;
          const next = [...s.steps];
          const [item] = next.splice(fromIndex, 1);
          if (!item) return s;
          const at = clampIndex(toIndex, next.length);
          next.splice(at, 0, item);
          return { steps: next, dirty: true };
        });
        writeStoredTemplate(snapshot(get()));
      },
      setStepDisabled: (id, disabled) => {
        set((s) => ({
          steps: s.steps.map((step) => (step.id === id ? { ...step, disabled } : step)),
          dirty: true,
        }));
        writeStoredTemplate(snapshot(get()));
      },
      patchStep: (id, patch) => {
        set((s) => ({
          steps: s.steps.map((step) => (step.id === id ? { ...step, ...patch } : step)),
          dirty: true,
        }));
        writeStoredTemplate(snapshot(get()));
      },
      selectStep: (id) => set({ selectedStepId: id }),
      setKeymapProfileId: (id) => {
        set({ keymapProfileId: id, dirty: true });
        writeStoredTemplate(snapshot(get()));
      },
      bindProcess: (processId) => {
        set((s) => {
          const found = PROCESS_CATALOG.find((item) => item.id === processId);
          if (!found) return s;
          return {
            processId: found.id,
            match: found.match,
            locate: found.recommended,
            dirty: true,
          };
        });
        writeStoredTemplate(snapshot(get()));
      },
      setLocateChannel: (channel) => {
        set((s) => ({
          locate: { ...s.locate, channel, source: "user" },
          dirty: true,
        }));
        writeStoredTemplate(snapshot(get()));
      },
      setVisionPack: (visionPack) => {
        set((s) => ({
          locate: { ...s.locate, visionPack, source: "user" },
          dirty: true,
        }));
        writeStoredTemplate(snapshot(get()));
      },
      saveTemplate: () => {
        set({ dirty: false });
        writeStoredTemplate(snapshot(get()));
      },
      markSaved: () => {
        set({ dirty: false });
        writeStoredTemplate(snapshot(get()));
      },
    }),
    {
      limit: 100,
      partialize: (state) => ({
        steps: state.steps,
        keymapProfileId: state.keymapProfileId,
        processId: state.processId,
        match: state.match,
        locate: state.locate,
        dirty: state.dirty,
      }),
    },
  ),
);

export function undoEdit() {
  useEditorStore.temporal.getState().undo();
  writeStoredTemplate(snapshot(useEditorStore.getState()));
}

export function redoEdit() {
  useEditorStore.temporal.getState().redo();
  writeStoredTemplate(snapshot(useEditorStore.getState()));
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

export function editorHasTarget(): boolean {
  const { processId, match } = useEditorStore.getState();
  return Boolean(processId && (match.exe || match.title || match.className));
}
