import { Keyboard, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { isLockedProfile, profileById } from "@/lib/keymap";
import { cn } from "@/lib/utils";
import { useKeymapStore } from "@/stores/keymap";
import { useT } from "@/stores/ui";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  KeyRecorder,
  PageHeader,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui";

import { useKeymapLabels } from "./keymap-catalog";

export function KeymapPage() {
  const t = useT();
  const { profileLabel: labelOf, mappingLabel } = useKeymapLabels();
  const profiles = useKeymapStore((s) => s.profiles);
  const activeId = useKeymapStore((s) => s.activeId);
  const selectedId = useKeymapStore((s) => s.selectedId);
  const select = useKeymapStore((s) => s.select);
  const activate = useKeymapStore((s) => s.activate);
  const addProfile = useKeymapStore((s) => s.addProfile);
  const renameProfile = useKeymapStore((s) => s.renameProfile);
  const duplicateProfile = useKeymapStore((s) => s.duplicateProfile);
  const removeProfile = useKeymapStore((s) => s.removeProfile);
  const addMapping = useKeymapStore((s) => s.addMapping);
  const patchMapping = useKeymapStore((s) => s.patchMapping);
  const removeMapping = useKeymapStore((s) => s.removeMapping);
  const [conflict, setConflict] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const selected = profileById({ activeId, selectedId, profiles }, selectedId) ?? profiles[0];
  const untitledIndex = profiles.filter((profile) => !profile.preset).length + 1;

  if (!selected) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader title={t("keymap.title")} />
        <EmptyState title={t("keymap.emptyTitle")} />
      </div>
    );
  }

  const locked = isLockedProfile(selected.id);

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={t("keymap.title")}
        actions={
          <Button
            size="sm"
            onClick={() => addProfile(t("keymap.preset.untitled", { n: untitledIndex }))}
          >
            <Plus />
            {t("keymap.newProfile")}
          </Button>
        }
      />
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-52 shrink-0 flex-col gap-1 border-r border-line p-3">
          {profiles.map((profile) => {
            const active = profile.id === selected.id;
            return (
              <button
                key={profile.id}
                type="button"
                onClick={() => {
                  setConflict(null);
                  setConfirmDelete(false);
                  select(profile.id);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm",
                  active ? "bg-accent-soft text-fg shadow-soft" : "text-fg-muted hover:bg-fg/5 hover:text-fg",
                )}
              >
                <span className="min-w-0 truncate">{labelOf(profile)}</span>
                <span className="flex shrink-0 items-center gap-1">
                  <span className="text-xs text-fg-faint">{profile.mappings.length}</span>
                  {isLockedProfile(profile.id) ? <Badge>{t("keymap.locked")}</Badge> : null}
                  {profile.id === activeId ? <Badge tone="accent">{t("keymap.active")}</Badge> : null}
                </span>
              </button>
            );
          })}
        </aside>

        <div className="min-w-0 flex-1 overflow-auto px-6 py-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <label className="flex min-w-40 flex-1 flex-col gap-1.5">
                <span className="text-xs text-fg-muted">{t("keymap.profileName")}</span>
                <Input
                  value={labelOf(selected)}
                  disabled={locked}
                  onChange={(event) => {
                    renameProfile(selected.id, event.target.value);
                  }}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {selected.id === activeId ? null : (
                  <Button size="sm" variant="secondary" onClick={() => activate(selected.id)}>
                    {t("keymap.useProfile")}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    duplicateProfile(selected.id, t("keymap.copyName", { name: labelOf(selected) }))
                  }
                >
                  {t("keymap.duplicate")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={locked || profiles.length <= 1}
                  onClick={() => setConfirmDelete(true)}
                >
                  {t("keymap.delete")}
                </Button>
              </div>
            </div>

            {selected.mappings.length === 0 ? (
              <EmptyState
                icon={<Keyboard className="size-6" />}
                title={t("keymap.emptyTitle")}
                action={
                  locked ? undefined : (
                    <Button size="sm" onClick={() => addMapping(selected.id)}>
                      <Plus />
                      {t("keymap.addMapping")}
                    </Button>
                  )
                }
              />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("keymap.enabled")}</TableHead>
                      <TableHead>{t("keymap.name")}</TableHead>
                      <TableHead>{t("keymap.keys")}</TableHead>
                      <TableHead className="w-12">
                        <span className="sr-only">{t("keymap.removeMapping")}</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selected.mappings.map((mapping) => (
                      <TableRow key={mapping.id}>
                        <TableCell>
                          <Switch
                            checked={mapping.enabled}
                            disabled={locked}
                            onCheckedChange={(enabled) =>
                              patchMapping(selected.id, mapping.id, { enabled })
                            }
                            aria-label={t("keymap.enabled")}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={mappingLabel(mapping)}
                            placeholder={t("keymap.name")}
                            aria-label={t("keymap.name")}
                            disabled={locked}
                            onChange={(event) => {
                              const result = patchMapping(selected.id, mapping.id, {
                                name: event.target.value,
                              });
                              setConflict(result.ok ? null : t("keymap.conflict"));
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <KeyRecorder
                            value={mapping.keys}
                            disabled={locked}
                            recordingLabel={t("keymap.recording")}
                            emptyLabel={t("keymap.record")}
                            onChange={(keys) => patchMapping(selected.id, mapping.id, { keys })}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t("keymap.removeMapping")}
                            disabled={locked}
                            onClick={() => removeMapping(selected.id, mapping.id)}
                          >
                            <Trash2 />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {locked ? null : (
                  <div>
                    <Button size="sm" variant="outline" onClick={() => addMapping(selected.id)}>
                      <Plus />
                      {t("keymap.addMapping")}
                    </Button>
                  </div>
                )}
              </>
            )}
            {conflict ? <p className="text-xs text-danger">{conflict}</p> : null}
          </div>
        </div>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("keymap.deleteConfirm", { name: labelOf(selected) })}</DialogTitle>
            <DialogDescription className="sr-only">
              {t("keymap.deleteConfirm", { name: labelOf(selected) })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                removeProfile(selected.id);
                setConfirmDelete(false);
              }}
            >
              {t("keymap.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
