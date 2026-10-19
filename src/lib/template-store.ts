import { PROCESS_CATALOG, type LocateProfile, type TargetMatch } from "@/lib/targets";
import { createDemoSteps, type StepKind, type TemplateStep } from "@/lib/template";

export const TEMPLATE_STORAGE_KEY = "lanius.template.v3";

export interface StoredTemplate {
  steps: TemplateStep[];
  keymapProfileId: string;
  processId: string;
  match: TargetMatch;
  locate: LocateProfile;
  dirty: boolean;
}

function isStepKind(value: unknown): value is StepKind {
  return value === "binding" || value === "mouse" || value === "preset" || value === "control";
}

function parseLocate(raw: unknown): LocateProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  if (data.channel !== "a11y" && data.channel !== "vision") return null;
  if (data.source !== "probe" && data.source !== "user") return null;
  if (data.capture !== "client" && data.capture !== "screen") return null;
  if (typeof data.visionPack !== "string") return null;
  return {
    channel: data.channel,
    source: data.source,
    capture: data.capture,
    visionPack: data.visionPack,
  };
}

function parseMatch(raw: unknown): TargetMatch | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  if (typeof data.exe !== "string" || typeof data.title !== "string" || typeof data.className !== "string") {
    return null;
  }
  return { exe: data.exe, title: data.title, className: data.className };
}

function parseStepList(raw: unknown): TemplateStep[] | null {
  if (!Array.isArray(raw)) return null;
  const steps: TemplateStep[] = [];
  for (const item of raw) {
    const step = parseStep(item);
    if (!step) return null;
    steps.push(step);
  }
  return steps;
}

function parseStep(raw: unknown): TemplateStep | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  if (typeof data.id !== "string" || !isStepKind(data.kind)) return null;
  if (typeof data.type !== "string" || typeof data.label !== "string") return null;
  const configRaw = data.config;
  const config =
    configRaw && typeof configRaw === "object" && !Array.isArray(configRaw)
      ? (configRaw as Record<string, unknown>)
      : {};
  const step: TemplateStep = {
    id: data.id,
    kind: data.kind,
    type: data.type,
    label: data.label,
    mappingId: typeof data.mappingId === "string" ? data.mappingId : undefined,
    profileId: typeof data.profileId === "string" ? data.profileId : undefined,
    keys: typeof data.keys === "string" ? data.keys : undefined,
    config,
    disabled: data.disabled === true,
  };
  if (data.then !== undefined) {
    const thenSteps = parseStepList(data.then);
    if (!thenSteps) return null;
    step.then = thenSteps;
  }
  if (data.else !== undefined) {
    const elseSteps = parseStepList(data.else);
    if (!elseSteps) return null;
    step.else = elseSteps;
  }
  if (data.body !== undefined) {
    const bodySteps = parseStepList(data.body);
    if (!bodySteps) return null;
    step.body = bodySteps;
  }
  return step;
}

export function defaultStoredTemplate(): StoredTemplate {
  const notepad = PROCESS_CATALOG.find((item) => item.id === "notepad") ?? PROCESS_CATALOG[0];
  return {
    steps: createDemoSteps(),
    keymapProfileId: "default",
    processId: notepad?.id ?? "",
    match: notepad?.match ?? { exe: "", title: "", className: "" },
    locate: notepad?.recommended ?? {
      channel: "a11y",
      source: "probe",
      capture: "client",
      visionPack: "template",
    },
    dirty: false,
  };
}

export function parseStoredTemplate(raw: unknown): StoredTemplate | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  if (!Array.isArray(data.steps) || typeof data.keymapProfileId !== "string") return null;
  if (typeof data.processId !== "string") return null;
  const steps = parseStepList(data.steps);
  if (!steps) return null;
  const match = parseMatch(data.match);
  const locate = parseLocate(data.locate);
  if (!match || !locate) return null;
  const known = PROCESS_CATALOG.some((item) => item.id === data.processId);
  const fallback = defaultStoredTemplate();
  return {
    steps,
    keymapProfileId: data.keymapProfileId,
    processId: known ? data.processId : fallback.processId,
    match: known ? match : fallback.match,
    locate,
    dirty: data.dirty === true,
  };
}

export function readStoredTemplate(): StoredTemplate {
  if (typeof localStorage === "undefined") return defaultStoredTemplate();
  try {
    const raw = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (!raw) {
      // 兼容旧键：有草稿则读一次，下次写入 v3 键
      const legacy = localStorage.getItem("lanius.template.v2");
      if (legacy) {
        const parsed: unknown = JSON.parse(legacy);
        return parseStoredTemplate(parsed) ?? defaultStoredTemplate();
      }
      return defaultStoredTemplate();
    }
    const parsed: unknown = JSON.parse(raw);
    return parseStoredTemplate(parsed) ?? defaultStoredTemplate();
  } catch {
    return defaultStoredTemplate();
  }
}

export function writeStoredTemplate(template: StoredTemplate): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(template));
}
