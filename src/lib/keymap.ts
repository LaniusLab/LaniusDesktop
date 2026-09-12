export const KEYMAP_STORAGE_KEY = "lanius.keymap";
export const DEFAULT_PROFILE_ID = "default";
export const ARROWS_PROFILE_ID = "arrows";

export const MAPPING_PRESETS = [
  "up",
  "left",
  "down",
  "right",
  "enter",
  "escape",
  "tab",
  "space",
  "backspace",
  "delete",
  "home",
  "end",
  "pageup",
  "pagedown",
  "insert",
  "copy",
  "paste",
  "cut",
  "selectAll",
  "save",
  "undo",
] as const;
export type MappingPreset = (typeof MAPPING_PRESETS)[number];

export interface KeyMapping {
  id: string;
  /** 编排点选时显示；内置条目可用 preset 走 i18n */
  name: string;
  /** 选中后要发出的按键或组合 */
  keys: string;
  enabled: boolean;
  preset?: MappingPreset;
}

export interface KeymapProfile {
  id: string;
  name: string;
  preset?: "default" | "arrows";
  mappings: KeyMapping[];
}

export interface KeymapState {
  activeId: string;
  selectedId: string;
  profiles: KeymapProfile[];
}

/** 编排按键积木可点选的一条。流程文件应只存 profileId + mappingId。 */
export interface KeymapCatalogItem {
  profileId: string;
  mappingId: string;
  name: string;
  keys: string;
}

export type KeymapPatchResult =
  | { ok: true }
  | { ok: false; code: "conflict" | "missing" | "last" | "locked" };

export function isLockedProfile(id: string): boolean {
  return id === DEFAULT_PROFILE_ID;
}

function mappingEntry(id: string, keys: string, preset?: MappingPreset): KeyMapping {
  return { id: `d-${id}`, name: keys, keys, enabled: true, preset };
}

/** 内置默认：常用导航、编辑、字母、数字、功能键与剪贴板组合。 */
export function createLockedDefaultMappings(): KeyMapping[] {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => mappingEntry(letter.toLowerCase(), letter));
  const digits = "0123456789".split("").map((digit) => mappingEntry(`n${digit}`, digit));
  const functionKeys = Array.from({ length: 12 }, (_, index) => {
    const key = `F${index + 1}`;
    return mappingEntry(key.toLowerCase(), key);
  });
  return [
    mappingEntry("up", "Up", "up"),
    mappingEntry("left", "Left", "left"),
    mappingEntry("down", "Down", "down"),
    mappingEntry("right", "Right", "right"),
    mappingEntry("home", "Home", "home"),
    mappingEntry("end", "End", "end"),
    mappingEntry("pageup", "PageUp", "pageup"),
    mappingEntry("pagedown", "PageDown", "pagedown"),
    mappingEntry("enter", "Enter", "enter"),
    mappingEntry("tab", "Tab", "tab"),
    mappingEntry("space", "Space", "space"),
    mappingEntry("escape", "Escape", "escape"),
    mappingEntry("backspace", "Backspace", "backspace"),
    mappingEntry("delete", "Delete", "delete"),
    mappingEntry("insert", "Insert", "insert"),
    mappingEntry("copy", "Mod+C", "copy"),
    mappingEntry("paste", "Mod+V", "paste"),
    mappingEntry("cut", "Mod+X", "cut"),
    mappingEntry("select-all", "Mod+A", "selectAll"),
    mappingEntry("save", "Mod+S", "save"),
    mappingEntry("undo", "Mod+Z", "undo"),
    ...letters,
    ...digits,
    ...functionKeys,
  ];
}

export function createLockedDefaultProfile(): KeymapProfile {
  return { id: DEFAULT_PROFILE_ID, name: "Default", preset: "default", mappings: createLockedDefaultMappings() };
}

export function ensureLockedDefault(profiles: KeymapProfile[]): KeymapProfile[] {
  const rest = profiles.filter((profile) => profile.id !== DEFAULT_PROFILE_ID);
  return [createLockedDefaultProfile(), ...rest];
}

export function createKeymapId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `km-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createDefaultKeymapState(): KeymapState {
  return {
    activeId: DEFAULT_PROFILE_ID,
    selectedId: DEFAULT_PROFILE_ID,
    profiles: [
      createLockedDefaultProfile(),
      {
        id: ARROWS_PROFILE_ID,
        name: "Arrows",
        preset: "arrows",
        mappings: [
          { id: "m-up", name: "Up", keys: "Up", enabled: true, preset: "up" },
          { id: "m-left", name: "Left", keys: "Left", enabled: true, preset: "left" },
          { id: "m-down", name: "Down", keys: "Down", enabled: true, preset: "down" },
          { id: "m-right", name: "Right", keys: "Right", enabled: true, preset: "right" },
        ],
      },
    ],
  };
}

export function profileById(state: KeymapState, id: string): KeymapProfile | undefined {
  return state.profiles.find((profile) => profile.id === id);
}

export function isMappingPreset(value: unknown): value is MappingPreset {
  return typeof value === "string" && (MAPPING_PRESETS as readonly string[]).includes(value);
}

export function profileLabel(profile: KeymapProfile, t: (key: string) => string): string {
  return profile.preset ? t(`keymap.preset.${profile.preset}`) : profile.name;
}

export function mappingDisplayName(
  mapping: KeyMapping,
  presetLabel: (preset: MappingPreset) => string,
): string {
  if (mapping.preset) return presetLabel(mapping.preset);
  const name = mapping.name.trim();
  return name || mapping.keys;
}

/** 启用且已录按键的条目，供编排列出。 */
export function pickableMappings(profile: KeymapProfile): KeyMapping[] {
  return profile.mappings.filter((mapping) => mapping.enabled && mapping.keys.length > 0);
}

export function toCatalogItems(
  profile: KeymapProfile,
  presetLabel: (preset: MappingPreset) => string,
): KeymapCatalogItem[] {
  return pickableMappings(profile).map((mapping) => ({
    profileId: profile.id,
    mappingId: mapping.id,
    name: mappingDisplayName(mapping, presetLabel),
    keys: mapping.keys,
  }));
}

export function mappingConflict(profile: KeymapProfile, name: string, exceptId?: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  return profile.mappings.some((mapping) => mapping.id !== exceptId && mapping.name.trim() === trimmed);
}

export function parseKeymap(raw: unknown): KeymapState {
  const fallback = createDefaultKeymapState();
  if (!raw || typeof raw !== "object") return fallback;
  const data = raw as Partial<KeymapState>;
  if (!Array.isArray(data.profiles) || data.profiles.length === 0) return fallback;

  const parsed = data.profiles
    .map((profile) => parseProfile(profile))
    .filter((profile): profile is KeymapProfile => profile !== null)
    .map((profile) => upgradeLegacyArrows(profile));
  if (parsed.length === 0) return fallback;
  const profiles = ensureLockedDefault(parsed);

  const activeId =
    typeof data.activeId === "string" && profiles.some((profile) => profile.id === data.activeId)
      ? data.activeId
      : (profiles[0]?.id ?? fallback.activeId);
  const selectedId =
    typeof data.selectedId === "string" && profiles.some((profile) => profile.id === data.selectedId)
      ? data.selectedId
      : activeId;

  return { activeId, selectedId, profiles };
}

/** 把早期 WASD→方向键 重映射升成可点选的方向宏表。用户改过 id 的方案不碰。 */
function upgradeLegacyArrows(profile: KeymapProfile): KeymapProfile {
  if (profile.id !== ARROWS_PROFILE_ID) return profile;
  const legacyIds = ["m-w", "m-a", "m-s", "m-d"];
  if (profile.mappings.length !== 4) return profile;
  if (!profile.mappings.every((mapping, index) => mapping.id === legacyIds[index])) return profile;
  const next = createDefaultKeymapState().profiles.find((entry) => entry.id === ARROWS_PROFILE_ID);
  return next ? { ...profile, mappings: next.mappings, preset: "arrows" } : profile;
}

function parseProfile(raw: unknown): KeymapProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Partial<KeymapProfile>;
  if (typeof data.id !== "string" || data.id.length === 0) return null;
  const mappings = Array.isArray(data.mappings)
    ? data.mappings
        .map((mapping) => parseMapping(mapping))
        .filter((mapping): mapping is KeyMapping => mapping !== null)
    : [];
  const preset = data.preset === "default" || data.preset === "arrows" ? data.preset : undefined;
  return {
    id: data.id,
    name: typeof data.name === "string" && data.name.length > 0 ? data.name : data.id,
    preset,
    mappings,
  };
}

function parseMapping(raw: unknown): KeyMapping | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Partial<KeyMapping> & { from?: string; to?: string };
  if (typeof data.id !== "string" || data.id.length === 0) return null;
  const keys = typeof data.keys === "string" ? data.keys : typeof data.to === "string" ? data.to : "";
  const name = typeof data.name === "string" ? data.name : typeof data.from === "string" ? data.from : "";
  return {
    id: data.id,
    name,
    keys,
    enabled: data.enabled !== false,
    preset: isMappingPreset(data.preset) ? data.preset : undefined,
  };
}

export function persistKeymap(state: Pick<KeymapState, "activeId" | "profiles">): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEYMAP_STORAGE_KEY, JSON.stringify({ activeId: state.activeId, profiles: state.profiles }));
}

export function readStoredKeymap(): KeymapState {
  if (typeof localStorage === "undefined") return createDefaultKeymapState();
  try {
    const raw = localStorage.getItem(KEYMAP_STORAGE_KEY);
    if (!raw) return createDefaultKeymapState();
    return parseKeymap(JSON.parse(raw) as unknown);
  } catch {
    return createDefaultKeymapState();
  }
}
