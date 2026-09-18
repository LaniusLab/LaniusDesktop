/** 作业模板的步骤草稿与调色板。流程文件只存这些字段（docs/FLOW-FORMAT.md）。 */

export type StepKind = "binding" | "mouse" | "preset";

export interface TemplateStep {
  id: string;
  kind: StepKind;
  type: string;
  label: string;
  mappingId?: string;
  profileId?: string;
  keys?: string;
  config: Record<string, unknown>;
  disabled?: boolean;
}

export type TemplateDraft = Omit<TemplateStep, "id">;

export interface MousePreset {
  type: "mouse.click" | "mouse.dblclick" | "mouse.move";
  labelKey: string;
}

export interface OpPreset {
  type: string;
  labelKey: string;
  config?: Record<string, unknown>;
  available: boolean;
}

export const MOUSE_PRESETS: readonly MousePreset[] = [
  { type: "mouse.click", labelKey: "edit.mouse.click" },
  { type: "mouse.dblclick", labelKey: "edit.mouse.dblclick" },
  { type: "mouse.move", labelKey: "edit.mouse.move" },
];

export const OP_PRESETS: readonly OpPreset[] = [
  { type: "core.wait", labelKey: "edit.preset.wait", config: { ms: 200 }, available: true },
  {
    type: "core.log",
    labelKey: "edit.preset.log",
    config: { message: "步骤完成", level: "info" },
    available: true,
  },
  { type: "vision.wait", labelKey: "edit.preset.waitImage", available: false },
];

export const STEP_DND_MIME = "text/plain";
export const STEP_DND_PREFIX = "lanius-step:";

export function createStepId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `s-${crypto.randomUUID()}`;
  }
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function encodeStepDrag(payload: StepDragPayload): string {
  return `${STEP_DND_PREFIX}${JSON.stringify(payload)}`;
}

export function decodeStepDrag(raw: string): StepDragPayload | null {
  if (!raw.startsWith(STEP_DND_PREFIX)) return null;
  try {
    const parsed: unknown = JSON.parse(raw.slice(STEP_DND_PREFIX.length));
    if (!parsed || typeof parsed !== "object") return null;
    const data = parsed as Partial<StepDragPayload>;
    if (data.source === "reorder" && typeof data.id === "string") {
      return { source: "reorder", id: data.id };
    }
    if (data.source === "palette" && data.draft && typeof data.draft === "object") {
      const draft = data.draft;
      if (draft.kind !== "binding" && draft.kind !== "mouse" && draft.kind !== "preset") {
        return null;
      }
      if (typeof draft.type !== "string" || typeof draft.label !== "string") return null;
      return {
        source: "palette",
        draft: {
          kind: draft.kind,
          type: draft.type,
          label: draft.label,
          mappingId: draft.mappingId,
          profileId: draft.profileId,
          keys: draft.keys,
          config: draft.config ?? {},
        },
      };
    }
    return null;
  } catch {
    return null;
  }
}

export type StepDragPayload =
  | { source: "palette"; draft: TemplateDraft }
  | { source: "reorder"; id: string };

export function createDemoSteps(): TemplateStep[] {
  return [
    {
      id: "wait_ready",
      kind: "preset",
      type: "core.wait",
      label: "稍等片刻",
      config: { ms: 200 },
    },
    {
      id: "press_enter",
      kind: "binding",
      type: "keyboard.press",
      profileId: "default",
      mappingId: "d-enter",
      keys: "Enter",
      label: "回车",
      config: {},
    },
    {
      id: "click_once",
      kind: "mouse",
      type: "mouse.click",
      label: "单击",
      config: { button: "left", x: 0, y: 0 },
    },
    {
      id: "log_done",
      kind: "preset",
      type: "core.log",
      label: "记下完成",
      config: { message: "执行完毕", level: "info" },
    },
  ];
}
