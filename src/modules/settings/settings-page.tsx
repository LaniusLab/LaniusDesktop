import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Bug,
  Info,
  KeyRound,
  Keyboard,
  Languages,
  Monitor,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import {
  bridge,
  isTauri,
  type UpdaterCheckResult,
  type UpdaterDownloadResult,
  type UpdaterListResult,
  type UpdaterProgress,
} from "@/lib/bridge";
import type { ShellPrefs } from "@/lib/gen/shell-prefs";

import { cn } from "@/lib/utils";
import { useT, useUiStore } from "@/stores/ui";
import {
  Badge,
  Button,
  ChoiceGroup,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  KeyRecorder,
  ScrollArea,
  SettingRow,
  Switch,
} from "@/ui";

type SettingsTab =
  | "appearance"
  | "general"
  | "desktop"
  | "credentials"
  | "shortcuts"
  | "debug"
  | "about";

const ACCENTS: ReadonlyArray<ShellPrefs["accent"]> = ["terracotta", "ink", "moss", "dusk"];

const SECTIONS: ReadonlyArray<{ id: SettingsTab; icon: LucideIcon; labelKey: string }> = [
  { id: "appearance", icon: Sparkles, labelKey: "settings.appearance" },
  { id: "general", icon: Languages, labelKey: "settings.behavior" },
  { id: "desktop", icon: Monitor, labelKey: "settings.desktop" },
  { id: "credentials", icon: KeyRound, labelKey: "settings.credentials" },
  { id: "shortcuts", icon: Keyboard, labelKey: "settings.shortcuts" },
  { id: "debug", icon: Bug, labelKey: "settings.debug" },
  { id: "about", icon: Info, labelKey: "settings.about" },
];

/** 设置弹窗：Folia 式左侧分组 + Header/Footer 插槽；外观写 dataset。
 * 浅色/深色只在外观页。桌面项对应关闭 / 自启 / 更新。
 */
export function SettingsDialog() {
  const t = useT();
  const open = useUiStore((s) => s.settingsOpen);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);
  const [tab, setTab] = useState<SettingsTab>("appearance");

  return (
    <Dialog open={open} onOpenChange={setSettingsOpen}>
      <DialogContent className="flex h-[min(40rem,calc(100vh-2rem))] w-[min(52rem,calc(100vw-2rem))] max-w-none flex-col overflow-hidden p-0">
        <DialogHeader className="mb-0 shrink-0 border-b border-line px-6 pb-4 pt-5">
          <DialogTitle>{t("settings.title")}</DialogTitle>
          <DialogDescription>{t("settings.description")}</DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-1">
          <nav
            role="tablist"
            aria-label={t("settings.title")}
            className="flex w-44 shrink-0 flex-col gap-0.5 border-r border-line p-3"
          >
            {SECTIONS.map((section) => {
              const active = tab === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(section.id)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors duration-150",
                    active
                      ? "bg-accent-soft text-fg shadow-soft"
                      : "text-fg-muted hover:bg-fg/5 hover:text-fg",
                  )}
                >
                  <section.icon className={cn("size-4", active ? "text-accent" : undefined)} />
                  {t(section.labelKey)}
                </button>
              );
            })}
          </nav>
          <ScrollArea className="min-h-0 flex-1 px-6 py-5">
            <div className="animate-rise" key={tab}>
              {tab === "appearance" ? <AppearanceSection /> : null}
              {tab === "general" ? <GeneralSection /> : null}
              {tab === "desktop" ? <DesktopSection /> : null}
              {tab === "credentials" ? <CredentialsSection /> : null}
              {tab === "shortcuts" ? <ShortcutsSection /> : null}
              {tab === "debug" ? <DebugSection /> : null}
              {tab === "about" ? <AboutSection /> : null}
            </div>
          </ScrollArea>
        </div>
        <DialogFooter className="mt-0 shrink-0 border-t border-line px-6 py-3">
          <Button variant="secondary" onClick={() => setSettingsOpen(false)}>
            {t("common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AppearanceSection() {
  const t = useT();
  const prefs = useUiStore((s) => s.prefs);
  const patchPrefs = useUiStore((s) => s.patchPrefs);

  return (
    <div className="flex flex-col gap-6">
      <SectionLabel title={t("settings.theme")} hint={t("settings.themeHint")}>
        <ChoiceGroup
          aria-label={t("settings.theme")}
          value={prefs.theme}
          onChange={(theme) => patchPrefs({ theme })}
          options={[
            { value: "light", label: t("settings.theme.light") },
            { value: "dark", label: t("settings.theme.dark") },
            { value: "system", label: t("settings.theme.system") },
          ]}
        />
      </SectionLabel>

      <SectionLabel title={t("settings.accent")} hint={t("settings.accentHint")}>
        <div role="radiogroup" aria-label={t("settings.accent")} className="flex flex-wrap gap-2">
          {ACCENTS.map((accent) => {
            const selected = prefs.accent === accent;
            return (
              <button
                key={accent}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={t(`settings.accent.${accent}`)}
                data-accent={accent}
                onClick={() => patchPrefs({ accent })}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 transition-colors duration-150",
                  selected ? "border-accent bg-accent-soft" : "border-line hover:border-accent/40",
                )}
              >
                <span className="size-3.5 rounded-full bg-accent" />
                <span className="text-sm text-fg">{t(`settings.accent.${accent}`)}</span>
              </button>
            );
          })}
        </div>
      </SectionLabel>

      <SectionLabel title={t("settings.font")} hint={t("settings.fontHint")}>
        <ChoiceGroup
          aria-label={t("settings.font")}
          value={prefs.font}
          onChange={(font) => patchPrefs({ font })}
          options={[
            { value: "mixed", label: t("settings.font.mixed") },
            { value: "hei", label: t("settings.font.hei") },
            { value: "song", label: t("settings.font.song") },
          ]}
        />
        <p className="mt-3 font-display text-lg text-fg">{t("brand.tagline")}</p>
      </SectionLabel>

      <SectionLabel title={t("settings.motion")} hint={t("settings.motionHint")}>
        <ChoiceGroup
          aria-label={t("settings.motion")}
          columns={2}
          value={prefs.motion}
          onChange={(motion) => patchPrefs({ motion })}
          options={[
            { value: "normal", label: t("settings.motion.normal") },
            { value: "reduce", label: t("settings.motion.reduce") },
          ]}
        />
      </SectionLabel>
    </div>
  );
}

function GeneralSection() {
  const t = useT();
  const prefs = useUiStore((s) => s.prefs);
  const patchPrefs = useUiStore((s) => s.patchPrefs);

  return (
    <div className="flex flex-col gap-4">
      <SectionLabel title={t("settings.locale")} hint={t("settings.localeHint")}>
        <ChoiceGroup
          aria-label={t("settings.locale")}
          columns={2}
          value={prefs.locale}
          onChange={(locale) => patchPrefs({ locale })}
          options={[
            { value: "zh-CN", label: t("settings.locale.zh-CN") },
            { value: "en", label: t("settings.locale.en") },
          ]}
        />
      </SectionLabel>

      <SettingRow
        label={t("settings.blockDestructive")}
        description={t("settings.blockDestructiveHint")}
      >
        <Switch
          checked={prefs.blockAllDestructive}
          onCheckedChange={(blockAllDestructive) => patchPrefs({ blockAllDestructive })}
          aria-label={t("settings.blockDestructive")}
        />
      </SettingRow>

      <TrustListSection />
    </div>
  );
}

/** 本机信任索引：只显示 flowId + hash 前缀；可撤销（SECURITY.md §4）。 */
function TrustListSection() {
  const t = useT();
  const queryClient = useQueryClient();
  const trust = useQuery({ queryKey: ["trustList"], queryFn: () => bridge.trustList() });
  const revoke = useMutation({
    mutationFn: (input: { flowId: string; contentHash: string }) =>
      bridge.trustRevoke(input.flowId, input.contentHash),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["trustList"] });
      await queryClient.invalidateQueries({ queryKey: ["trustCheck"] });
    },
  });

  return (
    <SectionLabel title={t("settings.trust")} hint={t("settings.trust.hint")}>
      {trust.isPending ? (
        <p className="text-sm text-fg-muted">{t("engine.starting")}</p>
      ) : null}
      {trust.data && trust.data.records.length === 0 ? (
        <p className="text-sm text-fg-muted">{t("settings.trust.empty")}</p>
      ) : null}
      {trust.data && trust.data.records.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {trust.data.records.map((record) => (
            <li
              key={`${record.flowId}:${record.contentHash}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-xs text-fg">{record.flowId}</p>
                <p className="truncate font-mono text-[11px] text-fg-faint">
                  {record.contentHash.slice(0, 12)}…
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={revoke.isPending}
                aria-label={t("settings.trust.revoke")}
                onClick={() =>
                  revoke.mutate({ flowId: record.flowId, contentHash: record.contentHash })
                }
              >
                {t("settings.trust.revoke")}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </SectionLabel>
  );
}

function DesktopSection() {
  const t = useT();
  const prefs = useUiStore((s) => s.prefs);
  const patchPrefs = useUiStore((s) => s.patchPrefs);
  const debug = useQuery({ queryKey: ["shellDebug"], queryFn: () => bridge.debugInfo() });
  const [update, setUpdate] = useState<UpdaterCheckResult | null>(null);
  const [list, setList] = useState<UpdaterListResult | null>(null);
  const [downloaded, setDownloaded] = useState<UpdaterDownloadResult | null>(null);
  const [progress, setProgress] = useState<UpdaterProgress | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyTag, setBusyTag] = useState<string | null>(null);

  const listReleases = useMutation({
    mutationFn: () => bridge.updaterList(),
    onSuccess: (result) => {
      setList(result);
      setActionError(null);
    },
    onError: (err) => setActionError(err instanceof Error ? err.message : String(err)),
  });

  const checkUpdate = useMutation({
    mutationFn: () => bridge.updaterCheck(),
    onSuccess: (result) => {
      setUpdate(result);
      setActionError(null);
      if (result.status === "available" || result.status === "unavailable") {
        listReleases.mutate();
      }
    },
    onError: (err) => setActionError(err instanceof Error ? err.message : String(err)),
  });

  const downloadRelease = useMutation({
    mutationFn: (tag: string) => bridge.updaterDownload(tag),
    onMutate: (tag) => {
      setBusyTag(tag);
      setActionError(null);
      setProgress(null);
    },
    onSuccess: (result) => {
      setDownloaded(result);
      setBusyTag(null);
    },
    onError: (err) => {
      setBusyTag(null);
      setActionError(err instanceof Error ? err.message : String(err));
    },
  });

  const applyRelease = useMutation({
    mutationFn: (tag: string) => bridge.updaterApply(tag),
    onMutate: (tag) => {
      setBusyTag(tag);
      setActionError(null);
      setProgress(null);
    },
    onSuccess: (result) => {
      setDownloaded({
        tag: result.tag,
        fileName: result.fileName,
        path: result.path,
        bytes: result.bytes,
        kind: result.kind,
        checksumStatus: result.checksumStatus,
      });
      setBusyTag(null);
      if (result.installSkippedReason) {
        setActionError(t("settings.updateInstallSkipped", { reason: result.installSkippedReason }));
      }
    },
    onError: (err) => {
      setBusyTag(null);
      setActionError(err instanceof Error ? err.message : String(err));
    },
  });

  const installPackage = useMutation({
    mutationFn: (path: string) => bridge.updaterInstall(path),
    onError: (err) => setActionError(err instanceof Error ? err.message : String(err)),
  });

  const installSupported = list?.installSupported ?? false;
  const actionPending =
    checkUpdate.isPending ||
    listReleases.isPending ||
    downloadRelease.isPending ||
    applyRelease.isPending ||
    installPackage.isPending;

  useEffect(() => {
    return bridge.onUpdaterProgress((event) => setProgress(event));
  }, []);

  const autostartSupported = debug.data?.autostartSupported ?? false;

  return (
    <div className="flex flex-col gap-3">
      {isTauri ? null : (
        <p className="rounded-xl border border-line px-4 py-3 text-xs text-fg-muted">
          {t("common.browserPreview")}
        </p>
      )}

      <SectionLabel title={t("settings.close")} hint={t("settings.closeHint")}>
        <ChoiceGroup
          aria-label={t("settings.close")}
          columns={2}
          value={prefs.closeBehavior}
          onChange={(closeBehavior) => patchPrefs({ closeBehavior })}
          options={[
            { value: "quit", label: t("settings.close.quit") },
            { value: "minimize", label: t("settings.close.minimize") },
          ]}
        />
      </SectionLabel>

      <SettingRow label={t("settings.autostart")} description={t("settings.autostartHint")}>
        <Switch
          checked={prefs.autostart}
          disabled={!isTauri || !autostartSupported}
          onCheckedChange={(autostart) => patchPrefs({ autostart })}
        />
      </SettingRow>
      {isTauri && !autostartSupported ? (
        <p className="text-xs text-fg-faint">{t("settings.autostartUnsupported")}</p>
      ) : null}

      <SettingRow label={t("settings.update")} description={t("settings.updateHint")}>
        <Switch
          checked={prefs.autoUpdate}
          onCheckedChange={(autoUpdate) => patchPrefs({ autoUpdate })}
        />
      </SettingRow>
      <div className="flex flex-wrap items-center gap-3 px-1">
        <Button
          variant="outline"
          size="sm"
          disabled={actionPending}
          onClick={() => checkUpdate.mutate()}
        >
          {t("settings.updateCheck")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={actionPending}
          onClick={() => listReleases.mutate()}
        >
          {t("settings.updateList")}
        </Button>
        <p className="text-xs text-fg-muted">
          {actionPending && (listReleases.isPending || checkUpdate.isPending)
            ? listReleases.isPending
              ? t("settings.updateListing")
              : t("settings.updateChecking")
            : update
              ? updateStatusText(t, update)
              : t("settings.updateIdle")}
        </p>
      </div>
      <p className="px-1 text-xs text-fg-faint">{t("settings.updateDraftsNote")}</p>
      {list ? (
        <p className="px-1 font-mono text-xs text-fg-faint">{list.releasesPageUrl}</p>
      ) : null}
      {progress?.phase === "downloading" && progress.percent != null ? (
        <p className="px-1 text-xs text-fg-muted">
          {t("settings.updateProgress", { percent: Math.round(progress.percent) })}
        </p>
      ) : null}
      {downloaded ? (
        <div className="flex flex-wrap items-center gap-3 px-1">
          <p className="text-xs text-fg-muted">
            {t("settings.updateDownloaded", { file: downloaded.fileName })}
          </p>
          <Button
            size="sm"
            disabled={installPackage.isPending || !installSupported}
            onClick={() => installPackage.mutate(downloaded.path)}
          >
            {t("settings.updateInstall")}
          </Button>
          <p className="text-xs text-fg-faint">
            {installSupported
              ? t("settings.updateInstallHint")
              : t("settings.updateInstallWindowsOnly")}
          </p>
        </div>
      ) : null}
      {actionError ? (
        <p className="px-1 text-xs text-danger">{t("settings.updateError", { message: actionError })}</p>
      ) : null}
      {list ? (
        <ul className="flex flex-col gap-2 rounded-xl border border-line px-3 py-2">
          {list.releases.length === 0 ? (
            <li className="text-xs text-fg-muted">{t("settings.updateEmpty")}</li>
          ) : (
            list.releases.map((release) => {
              const asset = release.preferredAsset;
              const canDownload = Boolean(asset);
              const isBusy = busyTag === release.tag;
              return (
                <li
                  key={release.tag}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-fg">
                      {release.tag}
                      {release.prerelease ? (
                        <Badge className="ml-2" tone="warning">
                          pre
                        </Badge>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-fg-muted">
                      {asset ? asset.name : t("settings.updateNoWindowsAsset")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!canDownload || actionPending}
                      onClick={() => downloadRelease.mutate(release.tag)}
                    >
                      {isBusy && downloadRelease.isPending
                        ? t("settings.updateDownloading")
                        : t("settings.updateDownload")}
                    </Button>
                    <Button
                      size="sm"
                      disabled={!canDownload || actionPending}
                      onClick={() => applyRelease.mutate(release.tag)}
                    >
                      {isBusy && applyRelease.isPending
                        ? t("settings.updateApplying")
                        : t("settings.updateApply")}
                    </Button>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}

function CredentialsSection() {
  const t = useT();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const list = useQuery({
    queryKey: ["secrets"],
    queryFn: () => bridge.secretList(),
  });
  const save = useMutation({
    mutationFn: () => bridge.secretSet(name.trim(), value),
    onSuccess: async () => {
      setName("");
      setValue("");
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["secrets"] });
    },
    onError: () => setError(t("settings.credentials.error")),
  });
  const remove = useMutation({
    mutationFn: (key: string) => bridge.secretDelete(key),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["secrets"] });
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-fg-muted">{t("settings.credentials.hint")}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-xs text-fg-muted">{t("settings.credentials.name")}</span>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("settings.credentials.namePlaceholder")}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-xs text-fg-muted">{t("settings.credentials.value")}</span>
          <Input
            type="password"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={t("settings.credentials.valuePlaceholder")}
            autoComplete="new-password"
          />
        </label>
        <Button
          disabled={!name.trim() || !value || save.isPending}
          onClick={() => save.mutate()}
        >
          {t("settings.credentials.add")}
        </Button>
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
      <p className="text-xs text-fg-faint">{t("settings.credentials.refHint")}</p>
      {list.data?.keys.length ? (
        <ul className="flex flex-col gap-1">
          {list.data.keys.map((key) => (
            <li
              key={key}
              className="flex items-center gap-2 rounded-lg border border-line px-3 py-2"
            >
              <span className="min-w-0 flex-1 truncate font-mono text-sm text-fg">{key}</span>
              <span className="text-xs text-fg-faint">secret://{key}</span>
              <Button
                size="sm"
                variant="ghost"
                disabled={remove.isPending}
                onClick={() => remove.mutate(key)}
                aria-label={t("settings.credentials.delete")}
              >
                {t("settings.credentials.delete")}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-fg-muted">{t("settings.credentials.empty")}</p>
      )}
    </div>
  );
}

function ShortcutsSection() {
  const t = useT();
  const navigate = useNavigate();
  const prefs = useUiStore((s) => s.prefs);
  const patchPrefs = useUiStore((s) => s.patchPrefs);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);
  const [conflict, setConflict] = useState<string | null>(null);

  const bind = (key: keyof ShellPrefs["shortcuts"], next: string) => {
    const otherKey = key === "palette" ? "run" : "palette";
    if (prefs.shortcuts[otherKey] === next) {
      setConflict(t("settings.shortcut.conflict", { name: t(`settings.shortcut.${otherKey}`) }));
      return;
    }
    setConflict(null);
    patchPrefs({ shortcuts: { ...prefs.shortcuts, [key]: next } });
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-fg-muted">{t("settings.shortcutHint")}</p>
      <SettingRow label={t("settings.shortcut.palette")} description={t("settings.shortcut.paletteHint")}>
        <KeyRecorder
          value={prefs.shortcuts.palette}
          recordingLabel={t("settings.shortcutRecording")}
          onChange={(next) => bind("palette", next)}
        />
      </SettingRow>
      <SettingRow label={t("settings.shortcut.run")}>
        <KeyRecorder
          value={prefs.shortcuts.run}
          recordingLabel={t("settings.shortcutRecording")}
          onChange={(next) => bind("run", next)}
        />
      </SettingRow>
      {conflict ? <p className="text-xs text-danger">{conflict}</p> : null}
      <SettingRow label={t("settings.shortcut.keymap")} description={t("settings.shortcut.keymapHint")}>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setSettingsOpen(false);
            void navigate({ to: "/keymap" });
          }}
        >
          {t("settings.shortcut.keymapOpen")}
        </Button>
      </SettingRow>
    </div>
  );
}

function DebugSection() {
  const t = useT();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const debug = useQuery({ queryKey: ["shellDebug"], queryFn: () => bridge.debugInfo() });
  const logs = useQuery({ queryKey: ["shellLogs"], queryFn: () => bridge.logsTail() });
  const engine = useQuery({ queryKey: ["engineInfo"], queryFn: () => bridge.engineInfo() });

  const exportDiag = useMutation({
    mutationFn: () => bridge.exportDiagnostics(),
    onSuccess: (result) => {
      const shown = result.archivePath ?? result.path;
      setExportMessage(t("settings.debug.exportDone", { path: shown }));
    },
    onError: () => setExportMessage(t("settings.debug.exportFailed")),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["shellDebug"] });
    void queryClient.invalidateQueries({ queryKey: ["shellLogs"] });
    void queryClient.invalidateQueries({ queryKey: ["engineInfo"] });
  };

  const copy = async () => {
    const payload = {
      debug: debug.data ?? null,
      engine: engine.data ?? null,
      logs: logs.data ?? "",
    };
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={refresh}>
          {t("settings.debug.refresh")}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => void copy()}>
          {copied ? t("settings.debug.copied") : t("settings.debug.copy")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={exportDiag.isPending}
          onClick={() => {
            setExportMessage(null);
            exportDiag.mutate();
          }}
        >
          {t("settings.debug.export")}
        </Button>
      </div>
      <p className="text-xs text-fg-muted">{t("settings.debug.exportHint")}</p>
      {exportMessage ? (
        <p
          className={
            exportDiag.isError ? "text-xs text-danger" : "break-all text-xs text-fg-muted"
          }
        >
          {exportMessage}
        </p>
      ) : null}

      <SectionLabel title={t("settings.debug.system")}>
        {debug.isPending || engine.isPending ? (
          <p className="text-sm text-fg-muted">{t("engine.starting")}</p>
        ) : (
          <InfoList
            rows={[
              [t("settings.debug.appVersion"), debug.data?.appVersion ?? "—"],
              [t("settings.debug.os"), debug.data?.os ?? "—"],
              [t("settings.debug.arch"), debug.data?.arch ?? "—"],
              [t("settings.debug.family"), debug.data?.family ?? "—"],
              [t("settings.debug.engine"), engine.data?.engineVersion ?? "—"],
              [t("settings.debug.protocol"), engine.data?.protocolVersion ?? "—"],
            ]}
          />
        )}
        {engine.data ? (
          <div className="mt-3 flex flex-col gap-2">
            <p className="text-xs text-fg-faint">{t("settings.debug.capabilities")}</p>
            <div className="flex flex-wrap gap-1.5">
              {engine.data.capabilities.map((cap) => (
                <Badge key={cap} tone="accent">
                  {cap}
                </Badge>
              ))}
            </div>
            <p className="mt-2 text-xs text-fg-faint">{t("settings.debug.nodeTypes")}</p>
            <div className="flex flex-wrap gap-1.5">
              {engine.data.nodeTypes.map((type) => (
                <Badge key={type}>{type}</Badge>
              ))}
            </div>
          </div>
        ) : null}
      </SectionLabel>

      <SectionLabel title={t("settings.debug.paths")}>
        {debug.data ? (
          <InfoList
            rows={[
              ["configDir", debug.data.paths.configDir],
              ["dataDir", debug.data.paths.dataDir],
              ["logDir", debug.data.paths.logDir],
              ["logFile", debug.data.paths.logFile],
              ["exePath", debug.data.paths.exePath],
            ]}
          />
        ) : (
          <p className="text-sm text-fg-muted">{t("engine.starting")}</p>
        )}
      </SectionLabel>

      <SectionLabel title={t("settings.debug.logs")}>
        {logs.data ? (
          <pre className="max-h-64 overflow-auto rounded-xl border border-line bg-surface-sunken/80 p-3 font-mono text-xs leading-relaxed text-fg">
            {logs.data}
          </pre>
        ) : (
          <p className="text-sm text-fg-muted">{t("settings.debug.emptyLog")}</p>
        )}
      </SectionLabel>
    </div>
  );
}

function AboutSection() {
  const t = useT();
  const debug = useQuery({ queryKey: ["shellDebug"], queryFn: () => bridge.debugInfo() });

  return (
    <div className="flex flex-col gap-5">
      <div className="relative overflow-hidden rounded-2xl border border-line px-5 py-8">
        <div className="pointer-events-none absolute -right-8 -top-10 size-36 rounded-full bg-accent/15" />
        <div className="pointer-events-none absolute -bottom-12 left-8 size-24 rounded-full bg-accent/10" />
        <p className="font-display text-3xl tracking-wide text-fg">{t("brand.name")}</p>
        <p className="mt-1 text-sm text-fg-faint">{t("brand.tagline")}</p>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-fg-muted">
          {t("settings.about.blurb")}
        </p>
      </div>
      <InfoList
        rows={[
          [t("settings.about.version"), debug.data?.appVersion ?? "0.1.0"],
          [t("settings.about.license"), t("settings.about.licenseValue")],
          [t("settings.about.org"), t("settings.about.orgValue")],
        ]}
      />
    </div>
  );
}

function SectionLabel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-medium text-fg">{title}</h2>
        {hint ? <p className="mt-1 text-xs leading-relaxed text-fg-muted">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function InfoList({ rows }: { rows: ReadonlyArray<readonly [string, string]> }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
      {rows.map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="text-fg-muted">{key}</dt>
          <dd className="break-all font-mono text-fg">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function updateStatusText(
  t: (key: string, vars?: Record<string, string | number>) => string,
  result: UpdaterCheckResult,
): string {
  if (result.status === "upToDate") {
    return t("settings.updateUpToDate", { version: result.currentVersion });
  }
  if (result.status === "available") {
    return t("settings.updateAvailable", { tag: result.latestTag ?? "" });
  }
  if (result.status === "checking") return t("settings.updateChecking");
  return t("settings.updateUnavailable");
}
