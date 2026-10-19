import { Clock, Eye, GitBranch, Keyboard, MousePointer2, Sparkles, Type } from "lucide-react";
import type { ReactNode } from "react";

import { INSERT_PRESETS, MOUSE_PRESETS, writeStepDrag, type TemplateDraft } from "@/lib/template";
import { cn } from "@/lib/utils";
import { KeymapCatalog, useKeymapLabels } from "@/modules/keymap/keymap-catalog";
import { useEditorStore } from "@/stores/editor";
import { useT } from "@/stores/ui";

export function TemplatePalette() {
  const t = useT();
  const { mappingLabel } = useKeymapLabels();
  const keymapProfileId = useEditorStore((s) => s.keymapProfileId);
  const insertStep = useEditorStore((s) => s.insertStep);
  const setKeymapProfileId = useEditorStore((s) => s.setKeymapProfileId);

  const addDraft = (draft: TemplateDraft) => {
    insertStep(draft);
  };

  const keyOps = INSERT_PRESETS.filter((item) => item.group === "keys");
  const visionOps = INSERT_PRESETS.filter((item) => item.group === "vision");
  const controlOps = INSERT_PRESETS.filter((item) => item.group === "control");
  const presetOps = INSERT_PRESETS.filter((item) => item.group === "preset");

  return (
    <aside className="flex h-full min-h-0 flex-col gap-3 overflow-auto bg-glass px-3 py-4 backdrop-blur-md">
      <p className="px-1 font-display text-sm text-fg animate-rise">{t("edit.blocks")}</p>
      <p className="px-1 text-xs leading-relaxed text-fg-muted animate-rise delay-1">
        {t("edit.blocksHint")}
      </p>

      <section className="rounded-xl border border-line bg-surface-sunken/50 px-3 py-2.5 animate-rise delay-2">
        <p className="flex items-center gap-1.5 text-sm text-fg">
          <Keyboard className="size-3.5 text-accent" />
          {t("edit.group.keys")}
        </p>
        <p className="mt-1 text-xs text-fg-faint">{t("edit.group.keysHint")}</p>
        <div className="mt-2">
          <KeymapCatalog
            profileId={keymapProfileId}
            allowSwitchProfile
            onProfileChange={setKeymapProfileId}
            onPick={(mapping, profileId) =>
              addDraft({
                kind: "binding",
                type: "keyboard.press",
                label: mappingLabel(mapping),
                mappingId: mapping.id,
                profileId,
                keys: mapping.keys,
                config: {},
              })
            }
          />
        </div>
        <ul className="mt-2 m-0 flex list-none flex-col gap-1 p-0">
          {keyOps.map((item) => (
            <li key={item.type}>
              <PaletteButton
                label={t(item.labelKey)}
                icon={<Type className="size-3" />}
                onAdd={() =>
                  addDraft({
                    kind: "preset",
                    type: item.type,
                    label: t(item.labelKey),
                    config: { ...(item.config ?? {}) },
                  })
                }
                draft={{
                  kind: "preset",
                  type: item.type,
                  label: t(item.labelKey),
                  config: { ...(item.config ?? {}) },
                }}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-line bg-surface-sunken/50 px-3 py-2.5 animate-rise delay-3">
        <p className="flex items-center gap-1.5 text-sm text-fg">
          <MousePointer2 className="size-3.5 text-accent" />
          {t("edit.group.mouse")}
        </p>
        <ul className="mt-2 m-0 flex list-none flex-col gap-1 p-0">
          {MOUSE_PRESETS.map((item) => (
            <li key={item.type}>
              <PaletteButton
                label={t(item.labelKey)}
                onAdd={() =>
                  addDraft({
                    kind: "mouse",
                    type: item.type,
                    label: t(item.labelKey),
                    config: item.type === "mouse.move" ? { x: 0, y: 0 } : { button: "left", x: 0, y: 0 },
                  })
                }
                draft={{
                  kind: "mouse",
                  type: item.type,
                  label: t(item.labelKey),
                  config: item.type === "mouse.move" ? { x: 0, y: 0 } : { button: "left", x: 0, y: 0 },
                }}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-line bg-surface-sunken/50 px-3 py-2.5 animate-rise delay-3">
        <p className="flex items-center gap-1.5 text-sm text-fg">
          <Eye className="size-3.5 text-accent" />
          {t("edit.group.vision")}
        </p>
        <PresetList items={visionOps} t={t} addDraft={addDraft} />
      </section>

      <section className="rounded-xl border border-line bg-surface-sunken/50 px-3 py-2.5 animate-rise delay-4">
        <p className="flex items-center gap-1.5 text-sm text-fg">
          <GitBranch className="size-3.5 text-accent" />
          {t("edit.group.control")}
        </p>
        <PresetList items={controlOps} t={t} addDraft={addDraft} control />
      </section>

      <section className="rounded-xl border border-line bg-surface-sunken/50 px-3 py-2.5 animate-rise delay-4">
        <p className="flex items-center gap-1.5 text-sm text-fg">
          <Sparkles className="size-3.5 text-accent" />
          {t("edit.group.presets")}
        </p>
        <PresetList items={presetOps} t={t} addDraft={addDraft} />
      </section>
    </aside>
  );
}

function PresetList({
  items,
  t,
  addDraft,
  control = false,
}: {
  items: typeof INSERT_PRESETS;
  t: (key: string) => string;
  addDraft: (draft: TemplateDraft) => void;
  control?: boolean;
}) {
  return (
    <ul className="mt-2 m-0 flex list-none flex-col gap-1 p-0">
      {items.map((item) => (
        <li key={item.type}>
          {item.available ? (
            <PaletteButton
              label={t(item.labelKey)}
              onAdd={() =>
                addDraft({
                  kind: control || item.kind === "control" ? "control" : "preset",
                  type: item.type,
                  label: t(item.labelKey),
                  config: { ...(item.config ?? {}) },
                  then: item.type === "flow.if" ? [] : undefined,
                  else: item.type === "flow.if" ? [] : undefined,
                  body: item.type === "flow.loop" ? [] : undefined,
                })
              }
              draft={{
                kind: control || item.kind === "control" ? "control" : "preset",
                type: item.type,
                label: t(item.labelKey),
                config: { ...(item.config ?? {}) },
                then: item.type === "flow.if" ? [] : undefined,
                else: item.type === "flow.if" ? [] : undefined,
                body: item.type === "flow.loop" ? [] : undefined,
              }}
            />
          ) : (
            <p className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-fg-faint">
              <Clock className="size-3" />
              {t(item.labelKey)}
              <span>{t("edit.later")}</span>
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

function PaletteButton({
  label,
  onAdd,
  draft,
  icon,
}: {
  label: string;
  onAdd: () => void;
  draft: TemplateDraft;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      draggable
      className={cn(
        "flex w-full cursor-grab items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs text-fg-muted",
        "hover:bg-fg/5 hover:text-fg",
      )}
      onClick={onAdd}
      onDragStart={(event) => {
        writeStepDrag(event.dataTransfer, { source: "palette", draft });
        event.dataTransfer.effectAllowed = "copy";
      }}
    >
      {icon}
      {label}
    </button>
  );
}
