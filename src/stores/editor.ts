import { create } from "zustand";
import { temporal } from "zundo";

import { fromFlowFile, toFlowFile } from "@/lib/flow-file";
import type { FlowFile } from "@/lib/gen/flow";
import { PROCESS_CATALOG, type LocateProfile, type TargetMatch } from "@/lib/targets";
import {
  findStepById,
  insertIntoSteps,
  mapSteps,
  materializeDraft,
  removeStepById,
  type TemplateDraft,
  type TemplateStep,
} from "@/lib/template";
import { readStoredTemplate, writeStoredTemplate, type StoredTemplate } from "@/lib/template-store";

export type InsertBranch = "root" | "then" | "else" | "body";

interface EditorStore {
  steps: TemplateStep[];
  keymapProfileId: string;
  processId: string;
  match: TargetMatch;
  locate: LocateProfile;
  dirty: boolean;
  /** 当前关联的本机 *.flow.json 路径；未打开文件时为空 */
  filePath?: string;
  flowId: string;
  flowName: string;
  selectedStepId?: string;
  insertStep: (
    draft: TemplateDraft,
    options?: { index?: number; parentId?: string; branch?: InsertBranch },
  ) => void;
  removeStep: (id: string) => void;
  moveStep: (fromIndex: number, toIndex: number) => void;
  setStepDisabled: (id: string, disabled: boolean) => void;
  patchStep: (id: string, patch: Partial<TemplateStep>) => void;
  selectStep: (id?: string) => void;
  setKeymapProfileId: (id: string) => void;
  bindProcess: (processId: string) => void;
  setLocateChannel: (channel: LocateProfile["channel"]) => void;
  setVisionPack: (visionPack: string) => void;
  loadTemplate: (partial: Partial<StoredTemplate> & { steps: TemplateStep[] }) => void;
  /** 从磁盘/RPC 流程载入编辑器，并记下路径 */
  loadFlowFile: (flow: FlowFile, path: string) => void;
  setFilePath: (path: string | undefined) => void;
  saveTemplate: () => void;
  markSaved: () => void;
}

function processIdForMatch(match: TargetMatch, fallback: string): string {
  const found = PROCESS_CATALOG.find(
    (item) =>
      item.match.exe === match.exe &&
      (item.match.title === match.title || !match.title) &&
      (item.match.className === match.className || !match.className),
  );
  if (found) return found.id;
  const byExe = PROCESS_CATALOG.find((item) => item.match.exe === match.exe);
  return byExe?.id ?? fallback;
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
      filePath: undefined,
      flowId: "session-template",
      flowName: "当前模板",
      selectedStepId: initial.steps[0]?.id,
      insertStep: (draft, options) => {
        const step = materializeDraft(draft);
        const parentId = options?.parentId;
        const branch = options?.branch ?? "root";
        set((s) => {
          if (parentId && branch !== "root") {
            return {
              steps: insertIntoSteps(s.steps, step, parentId, branch),
              dirty: true,
              selectedStepId: step.id,
            };
          }
          const next = [...s.steps];
          const at = clampIndex(options?.index ?? next.length, next.length);
          next.splice(at, 0, step);
          return { steps: next, dirty: true, selectedStepId: step.id };
        });
        writeStoredTemplate(snapshot(get()));
      },
      removeStep: (id) => {
        set((s) => ({
          steps: removeStepById(s.steps, id),
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
          steps: mapSteps(s.steps, id, (step) => ({ ...step, disabled })),
          dirty: true,
        }));
        writeStoredTemplate(snapshot(get()));
      },
      patchStep: (id, patch) => {
        set((s) => ({
          steps: mapSteps(s.steps, id, (step) => ({ ...step, ...patch })),
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
      loadTemplate: (partial) => {
        set((s) => ({
          steps: partial.steps,
          keymapProfileId: partial.keymapProfileId ?? s.keymapProfileId,
          processId: partial.processId ?? s.processId,
          match: partial.match ?? s.match,
          locate: partial.locate ?? s.locate,
          dirty: false,
          selectedStepId: partial.steps[0]?.id,
        }));
        writeStoredTemplate(snapshot(get()));
      },
      loadFlowFile: (flow, path) => {
        const draft = fromFlowFile(flow);
        set((s) => ({
          steps: draft.steps,
          keymapProfileId: draft.keymapProfileId,
          match: draft.match,
          locate: draft.locate,
          processId: processIdForMatch(draft.match, s.processId),
          flowId: draft.id,
          flowName: draft.name,
          filePath: path,
          dirty: false,
          selectedStepId: draft.steps[0]?.id,
        }));
        writeStoredTemplate(snapshot(get()));
      },
      setFilePath: (path) => set({ filePath: path }),
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
    id: state.flowId,
    name: state.flowName,
    keymapProfileId: state.keymapProfileId,
    match: state.match,
    locate: state.locate,
    steps: state.steps,
  });
}

export function editorFilePath(): string | undefined {
  return useEditorStore.getState().filePath;
}

export function editorHasTarget(): boolean {
  const { processId, match } = useEditorStore.getState();
  return Boolean(processId && (match.exe || match.title || match.className));
}

export function editorSelectedStep(): TemplateStep | undefined {
  const { steps, selectedStepId } = useEditorStore.getState();
  if (!selectedStepId) return undefined;
  return findStepById(steps, selectedStepId);
}
