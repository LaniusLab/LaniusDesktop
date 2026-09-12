import { create } from "zustand";

import {
  createKeymapId,
  isLockedProfile,
  mappingConflict,
  persistKeymap,
  profileById,
  readStoredKeymap,
  type KeyMapping,
  type KeymapPatchResult,
  type KeymapState,
} from "@/lib/keymap";

interface KeymapStore extends KeymapState {
  select: (id: string) => void;
  activate: (id: string) => KeymapPatchResult;
  addProfile: (name: string) => string;
  renameProfile: (id: string, name: string) => KeymapPatchResult;
  duplicateProfile: (id: string, name: string) => string | null;
  removeProfile: (id: string) => KeymapPatchResult;
  addMapping: (profileId: string) => string | null;
  patchMapping: (profileId: string, mappingId: string, patch: Partial<KeyMapping>) => KeymapPatchResult;
  removeMapping: (profileId: string, mappingId: string) => void;
}

function commit(set: (partial: Partial<KeymapState>) => void, next: KeymapState): void {
  persistKeymap(next);
  set(next);
}

export const useKeymapStore = create<KeymapStore>()((set, get) => ({
  ...readStoredKeymap(),
  select: (id) => {
    if (!profileById(get(), id)) return;
    set({ selectedId: id });
  },
  activate: (id) => {
    const current = get();
    if (!profileById(current, id)) return { ok: false, code: "missing" };
    commit(set, { ...current, activeId: id, selectedId: id });
    return { ok: true };
  },
  addProfile: (name) => {
    const current = get();
    const id = createKeymapId();
    const next: KeymapState = {
      ...current,
      selectedId: id,
      profiles: [...current.profiles, { id, name, mappings: [] }],
    };
    commit(set, next);
    return id;
  },
  renameProfile: (id, name) => {
    const current = get();
    if (isLockedProfile(id)) return { ok: false, code: "locked" };
    if (!profileById(current, id)) return { ok: false, code: "missing" };
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, code: "missing" };
    commit(set, {
      ...current,
      profiles: current.profiles.map((profile) =>
        profile.id === id ? { ...profile, name: trimmed, preset: undefined } : profile,
      ),
    });
    return { ok: true };
  },
  duplicateProfile: (id, name) => {
    const current = get();
    const source = profileById(current, id);
    if (!source) return null;
    const nextId = createKeymapId();
    commit(set, {
      ...current,
      selectedId: nextId,
      profiles: [
        ...current.profiles,
        {
          id: nextId,
          name,
          mappings: source.mappings.map((mapping) => ({ ...mapping, id: createKeymapId() })),
        },
      ],
    });
    return nextId;
  },
  removeProfile: (id) => {
    const current = get();
    if (isLockedProfile(id)) return { ok: false, code: "locked" };
    if (current.profiles.length <= 1) return { ok: false, code: "last" };
    if (!profileById(current, id)) return { ok: false, code: "missing" };
    const profiles = current.profiles.filter((profile) => profile.id !== id);
    const fallback = profiles[0];
    if (!fallback) return { ok: false, code: "last" };
    const activeId = current.activeId === id ? fallback.id : current.activeId;
    const selectedId = current.selectedId === id ? fallback.id : current.selectedId;
    commit(set, { activeId, selectedId, profiles });
    return { ok: true };
  },
  addMapping: (profileId) => {
    const current = get();
    if (isLockedProfile(profileId) || !profileById(current, profileId)) return null;
    const mappingId = createKeymapId();
    commit(set, {
      ...current,
      profiles: current.profiles.map((profile) =>
        profile.id === profileId
          ? {
              ...profile,
              mappings: [...profile.mappings, { id: mappingId, name: "", keys: "", enabled: true }],
            }
          : profile,
      ),
    });
    return mappingId;
  },
  patchMapping: (profileId, mappingId, patch) => {
    const current = get();
    if (isLockedProfile(profileId)) return { ok: false, code: "locked" };
    const profile = profileById(current, profileId);
    if (!profile) return { ok: false, code: "missing" };
    if (patch.name !== undefined && mappingConflict(profile, patch.name, mappingId)) {
      return { ok: false, code: "conflict" };
    }
    commit(set, {
      ...current,
      profiles: current.profiles.map((entry) =>
        entry.id === profileId
          ? {
              ...entry,
              mappings: entry.mappings.map((mapping) => {
                if (mapping.id !== mappingId) return mapping;
                const next = { ...mapping, ...patch };
                if (patch.name !== undefined) next.preset = undefined;
                return next;
              }),
            }
          : entry,
      ),
    });
    return { ok: true };
  },
  removeMapping: (profileId, mappingId) => {
    const current = get();
    if (isLockedProfile(profileId) || !profileById(current, profileId)) return;
    commit(set, {
      ...current,
      profiles: current.profiles.map((profile) =>
        profile.id === profileId
          ? { ...profile, mappings: profile.mappings.filter((mapping) => mapping.id !== mappingId) }
          : profile,
      ),
    });
  },
}));
