/** 作业模板的步骤草稿与调色板。流程文件只存这些字段（docs/FLOW-FORMAT.md）。 */

export type StepKind = "binding" | "mouse" | "preset" | "control";

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
  then?: TemplateStep[];
  else?: TemplateStep[];
  body?: TemplateStep[];
}

export type TemplateDraft = Omit<TemplateStep, "id" | "then" | "else" | "body"> & {
  then?: TemplateDraft[];
  else?: TemplateDraft[];
  body?: TemplateDraft[];
};

export interface MousePreset {
  type: "mouse.click" | "mouse.dblclick" | "mouse.move";
  labelKey: string;
}

export interface OpPreset {
  type: string;
  labelKey: string;
  kind?: StepKind;
  config?: Record<string, unknown>;
  available: boolean;
  group: "keys" | "mouse" | "vision" | "control" | "preset";
}

export const MOUSE_PRESETS: readonly MousePreset[] = [
  { type: "mouse.click", labelKey: "edit.mouse.click" },
  { type: "mouse.dblclick", labelKey: "edit.mouse.dblclick" },
  { type: "mouse.move", labelKey: "edit.mouse.move" },
];

export const INSERT_PRESETS: readonly OpPreset[] = [
  { type: "core.wait", labelKey: "edit.preset.wait", config: { ms: 200 }, available: true, group: "preset" },
  {
    type: "core.log",
    labelKey: "edit.preset.log",
    config: { message: "步骤完成", level: "info" },
    available: true,
    group: "preset",
  },
  {
    type: "keyboard.type",
    labelKey: "edit.preset.type",
    config: { text: "" },
    available: true,
    group: "keys",
  },
  {
    type: "vision.ocr",
    labelKey: "edit.preset.ocr",
    config: { fakeText: "确认" },
    available: true,
    group: "vision",
  },
  {
    type: "vision.wait",
    labelKey: "edit.preset.waitImage",
    config: { text: "下一步", timeoutMs: 8000 },
    available: true,
    group: "vision",
  },
  {
    type: "flow.if",
    kind: "control",
    labelKey: "edit.control.if",
    config: { when: "ocr.contains", text: "确认", source: "{{ocr.text}}" },
    available: true,
    group: "control",
  },
  {
    type: "flow.loop",
    kind: "control",
    labelKey: "edit.control.loop",
    config: { max: 3, until: "" },
    available: true,
    group: "control",
  },
];

/** @deprecated 使用 INSERT_PRESETS */
export const OP_PRESETS = INSERT_PRESETS.filter((p) => p.group === "preset" || p.group === "vision");

export const STEP_DND_MIME = "application/x-lanius-step";
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

function isStepKind(value: unknown): value is StepKind {
  return value === "binding" || value === "mouse" || value === "preset" || value === "control";
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
      if (!isStepKind(draft.kind)) return null;
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
          then: draft.then,
          else: draft.else,
          body: draft.body,
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

export interface StepDragTransfer {
  setData: (type: string, value: string) => void;
  getData: (type: string) => string;
}

export function writeStepDrag(transfer: StepDragTransfer, payload: StepDragPayload): void {
  const raw = encodeStepDrag(payload);
  transfer.setData(STEP_DND_MIME, raw);
  transfer.setData("text/plain", raw);
}

export function readStepDrag(transfer: StepDragTransfer): StepDragPayload | null {
  return decodeStepDrag(transfer.getData(STEP_DND_MIME) || transfer.getData("text/plain"));
}

export function configNumber(config: Record<string, unknown>, key: string, fallback: number): number {
  const raw = config[key];
  return typeof raw === "number" && Number.isFinite(raw) ? raw : fallback;
}

export function configString(config: Record<string, unknown>, key: string, fallback: string): string {
  const raw = config[key];
  return typeof raw === "string" ? raw : fallback;
}

export function stepIssueKey(step: TemplateStep): string | null {
  if (step.kind === "binding" && !String(step.keys ?? "").trim()) {
    return "edit.issue.keys";
  }
  if (step.type === "core.wait" && configNumber(step.config, "ms", 0) < 0) {
    return "edit.issue.wait";
  }
  if (step.type === "keyboard.type" && !configString(step.config, "text", "").trim()) {
    return "edit.issue.text";
  }
  return null;
}

export function materializeDraft(draft: TemplateDraft): TemplateStep {
  const id = createStepId();
  const base: TemplateStep = {
    id,
    kind: draft.kind,
    type: draft.type,
    label: draft.label,
    mappingId: draft.mappingId,
    profileId: draft.profileId,
    keys: draft.keys,
    config: { ...(draft.config ?? {}) },
    disabled: draft.disabled,
  };
  if (draft.kind === "control" && draft.type === "flow.if") {
    return { ...base, then: [], else: [] };
  }
  if (draft.kind === "control" && draft.type === "flow.loop") {
    return { ...base, body: [] };
  }
  return base;
}

/** 记事本多行输入预设（与 examples/notepad-multiline.flow.json 对齐）。 */
export function createNotepadMultilineSteps(): TemplateStep[] {
  return [
    {
      id: "wait_focus",
      kind: "preset",
      type: "core.wait",
      label: "稍等片刻",
      config: { ms: 300 },
    },
    {
      id: "type_body",
      kind: "preset",
      type: "keyboard.type",
      label: "输入多行文本",
      config: {
        text: "Lanius 记事本测试\n第二行：自动化写入\n第三行：结束。",
      },
    },
    {
      id: "log_done",
      kind: "preset",
      type: "core.log",
      label: "记下完成",
      config: { message: "多行文本已写入记事本", level: "info" },
    },
  ];
}

export function createDemoSteps(): TemplateStep[] {
  return createNotepadMultilineSteps();
}

export interface FlatStepRow {
  step: TemplateStep;
  depth: number;
  parentId?: string;
  branch?: "then" | "else" | "body";
  marker?: "then" | "else" | "body-end" | "if-end" | "loop-end";
}

/** 把嵌套 steps 展平为指令条行（含则/否则标记行）。 */
export function flattenSteps(
  steps: TemplateStep[],
  depth = 0,
  parentId?: string,
  branch?: FlatStepRow["branch"],
): FlatStepRow[] {
  const rows: FlatStepRow[] = [];
  for (const step of steps) {
    rows.push({ step, depth, parentId, branch });
    if (step.kind === "control" && step.type === "flow.if") {
      rows.push({
        step: { ...step, id: `${step.id}__then`, label: "则", kind: "control", type: "marker.then", config: {} },
        depth: depth + 1,
        parentId: step.id,
        marker: "then",
        branch: "then",
      });
      rows.push(...flattenSteps(step.then ?? [], depth + 2, step.id, "then"));
      rows.push({
        step: { ...step, id: `${step.id}__else`, label: "否则", kind: "control", type: "marker.else", config: {} },
        depth: depth + 1,
        parentId: step.id,
        marker: "else",
        branch: "else",
      });
      rows.push(...flattenSteps(step.else ?? [], depth + 2, step.id, "else"));
    }
    if (step.kind === "control" && step.type === "flow.loop") {
      rows.push(...flattenSteps(step.body ?? [], depth + 1, step.id, "body"));
    }
  }
  return rows;
}

export function mapSteps(
  steps: TemplateStep[],
  id: string,
  mapper: (step: TemplateStep) => TemplateStep,
): TemplateStep[] {
  return steps.map((step) => {
    if (step.id === id) return mapper(step);
    return {
      ...step,
      then: step.then ? mapSteps(step.then, id, mapper) : step.then,
      else: step.else ? mapSteps(step.else, id, mapper) : step.else,
      body: step.body ? mapSteps(step.body, id, mapper) : step.body,
    };
  });
}

export function removeStepById(steps: TemplateStep[], id: string): TemplateStep[] {
  return steps
    .filter((step) => step.id !== id)
    .map((step) => ({
      ...step,
      then: step.then ? removeStepById(step.then, id) : step.then,
      else: step.else ? removeStepById(step.else, id) : step.else,
      body: step.body ? removeStepById(step.body, id) : step.body,
    }));
}

export function findStepById(steps: TemplateStep[], id: string): TemplateStep | undefined {
  for (const step of steps) {
    if (step.id === id) return step;
    const nested = findStepById(
      [...(step.then ?? []), ...(step.else ?? []), ...(step.body ?? [])],
      id,
    );
    if (nested) return nested;
  }
  return undefined;
}

export function insertIntoSteps(
  steps: TemplateStep[],
  draft: TemplateStep,
  parentId: string | undefined,
  branch: "then" | "else" | "body" | "root",
): TemplateStep[] {
  if (!parentId || branch === "root") {
    return [...steps, draft];
  }
  return steps.map((step) => {
    if (step.id !== parentId) {
      return {
        ...step,
        then: step.then ? insertIntoSteps(step.then, draft, parentId, branch) : step.then,
        else: step.else ? insertIntoSteps(step.else, draft, parentId, branch) : step.else,
        body: step.body ? insertIntoSteps(step.body, draft, parentId, branch) : step.body,
      };
    }
    if (branch === "then") return { ...step, then: [...(step.then ?? []), draft] };
    if (branch === "else") return { ...step, else: [...(step.else ?? []), draft] };
    return { ...step, body: [...(step.body ?? []), draft] };
  });
}
