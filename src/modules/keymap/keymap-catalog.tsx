import { useState } from "react";

import {
  mappingDisplayName,
  pickableMappings,
  profileById,
  profileLabel,
  type KeyMapping,
  type KeymapProfile,
} from "@/lib/keymap";
import { writeStepDrag } from "@/lib/template";
import { useKeymapStore } from "@/stores/keymap";
import { useT } from "@/stores/ui";
import { Kbd, Select } from "@/ui";

export function useKeymapLabels() {
  const t = useT();
  return {
    profileLabel: (profile: KeymapProfile) => profileLabel(profile, t),
    mappingLabel: (mapping: KeyMapping) =>
      mappingDisplayName(mapping, (preset) => t(`keymap.macro.${preset}`)),
  };
}

/** 指定方案的映射表。可点选或拖进模板步骤。 */
export function KeymapCatalog({
  profileId,
  allowSwitchProfile = false,
  onPick,
  onProfileChange,
}: {
  profileId?: string;
  allowSwitchProfile?: boolean;
  onPick?: (mapping: KeyMapping, profileId: string) => void;
  onProfileChange?: (profileId: string) => void;
}) {
  const t = useT();
  const { profileLabel: labelOf, mappingLabel } = useKeymapLabels();
  const profiles = useKeymapStore((s) => s.profiles);
  const activeId = useKeymapStore((s) => s.activeId);
  const selectedId = useKeymapStore((s) => s.selectedId);
  const [localId, setLocalId] = useState(profileId ?? activeId);
  const resolvedId = allowSwitchProfile ? localId : (profileId ?? activeId);
  const profile =
    profileById({ activeId, selectedId, profiles }, resolvedId) ??
    profileById({ activeId, selectedId, profiles }, activeId) ??
    profiles[0];
  const items = profile ? pickableMappings(profile) : [];
  const interactive = Boolean(onPick);

  return (
    <div className="flex flex-col gap-2">
      {allowSwitchProfile ? (
        <Select
          aria-label={t("edit.keymapSelect")}
          value={profile?.id ?? ""}
          onChange={(event) => {
            setLocalId(event.target.value);
            onProfileChange?.(event.target.value);
          }}
        >
          {profiles.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {labelOf(entry)}
            </option>
          ))}
        </Select>
      ) : null}
      {items.length === 0 ? null : (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {items.slice(0, 24).map((mapping) => (
            <li key={mapping.id}>
              <button
                type="button"
                draggable={interactive}
                aria-label={mappingLabel(mapping)}
                className="flex w-full cursor-grab items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-fg-muted hover:bg-fg/5 hover:text-fg"
                onDragStart={(event) => {
                  if (!profile || !onPick) return;
                  writeStepDrag(event.dataTransfer, {
                    source: "palette",
                    draft: {
                      kind: "binding",
                      type: "keyboard.press",
                      label: mappingLabel(mapping),
                      mappingId: mapping.id,
                      profileId: profile.id,
                      keys: mapping.keys,
                      config: {},
                    },
                  });
                  event.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => {
                  if (profile && onPick) onPick(mapping, profile.id);
                }}
              >
                <span className="truncate">{mappingLabel(mapping)}</span>
                <Kbd>{mapping.keys}</Kbd>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
