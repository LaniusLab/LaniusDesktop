import { useState } from "react";

import {
  mappingDisplayName,
  pickableMappings,
  profileById,
  profileLabel,
  type KeyMapping,
  type KeymapProfile,
} from "@/lib/keymap";
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

/** 指定方案的映射表。编排按键积木会列出这些条目；M0 只预览，不插入画布。 */
export function KeymapCatalog({
  profileId,
  allowSwitchProfile = false,
}: {
  profileId?: string;
  allowSwitchProfile?: boolean;
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

  return (
    <div className="flex flex-col gap-2">
      {allowSwitchProfile ? (
        <Select
          aria-label={t("edit.keymapSelect")}
          value={profile?.id ?? ""}
          onChange={(event) => setLocalId(event.target.value)}
        >
          {profiles.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {labelOf(entry)}
            </option>
          ))}
        </Select>
      ) : null}
      {items.length === 0 ? null : (
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {items.map((mapping) => (
            <li key={mapping.id}>
              <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
                {mappingLabel(mapping)}
                <Kbd>{mapping.keys}</Kbd>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
