import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";

import { bridge, isTauri, type UpdaterResult } from "@/lib/bridge";
import type { ShellPrefs } from "@/lib/gen/shell-prefs";
import { eventToShortcut, formatShortcut } from "@/lib/shortcut";
import { useT, useUiStore } from "@/stores/ui";
import {
  Badge,
  Button,
  ChoiceGroup,
  Kbd,
  PageHeader,
  SettingRow,
  Switch,
  Tabs,
} from "@/ui";

type SettingsTab = "appearance" | "behavior" | "shortcuts" | "debug" | "about";

const ACCENTS: ReadonlyArray<ShellPrefs["accent"]> = ["terracotta", "ink", "moss", "dusk"];

export function SettingsPage() {
  const t = useT();
  const [tab, setTab] = useState<SettingsTab>("appearance");

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={t("settings.title")} description={t("settings.description")} />
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <Tabs
            value={tab}
            onValueChange={setTab}
            items={[
              { value: "appearance", label: t("settings.appearance") },
              { value: "behavior", label: t("settings.behavior") },
              { value: "shortcuts", label: t("settings.shortcuts") },
              { value: "debug", label: t("settings.debug") },
              { value: "about", label: t("settings.about") },
            ]}
          />
          <div className="animate-rise" key={tab}>
            {tab === "appearance" ? <AppearanceSection /> : null}
            {tab === "behavior" ? <BehaviorSection /> : null}
            {tab === "shortcuts" ? <ShortcutsSection /> : null}
            {tab === "debug" ? <DebugSection /> : null}
            {tab === "about" ? <AboutSection /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function AppearanceSection() {
  const t = useT();
  const prefs = useUiStore((s) => s.prefs);
  const patchPrefs = useUiStore((s) => s.patchPrefs);

  return (
    <div className="flex flex-col gap-6">
      <FieldBlock label={t("settings.theme")} hint={t("settings.themeHint")}>
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
      </FieldBlock>

      <FieldBlock label={t("settings.accent")} hint={t("settings.accentHint")}>
        <div role="radiogroup" aria-label={t("settings.accent")} className="flex flex-wrap gap-3">
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
                className="hover-lift flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2"
              >
                <span
                  className={`size-5 rounded-full bg-accent ring-2 ring-offset-2 ring-offset-surface ${selected ? "ring-fg" : "ring-transparent"}`}
                />
                <span className="text-sm text-fg">{t(`settings.accent.${accent}`)}</span>
              </button>
            );
          })}
        </div>
      </FieldBlock>

      <FieldBlock label={t("settings.font")} hint={t("settings.fontHint")}>
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
      </FieldBlock>

      <FieldBlock label={t("settings.motion")} hint={t("settings.motionHint")}>
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
      </FieldBlock>

      <FieldBlock label={t("settings.locale")} hint={t("settings.localeHint")}>
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
      </FieldBlock>
    </div>
  );
}

function BehaviorSection() {
  const t = useT();
  const prefs = useUiStore((s) => s.prefs);
  const patchPrefs = useUiStore((s) => s.patchPrefs);
  const debug = useQuery({ queryKey: ["shellDebug"], queryFn: () => bridge.debugInfo() });
  const [update, setUpdate] = useState<UpdaterResult | null>(null);
  const checkUpdate = useMutation({
    mutationFn: () => bridge.updaterCheck(),
    onSuccess: setUpdate,
  });

  const autostartSupported = debug.data?.autostartSupported ?? false;

  return (
    <div className="flex flex-col gap-4">
      {isTauri ? null : (
        <p className="rounded-lg border border-line bg-surface px-4 py-3 text-xs text-fg-muted">
          {t("common.browserPreview")}
        </p>
      )}

      <FieldBlock label={t("settings.close")} hint={t("settings.closeHint")}>
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
      </FieldBlock>

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
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={checkUpdate.isPending}
          onClick={() => checkUpdate.mutate()}
        >
          {t("settings.updateCheck")}
        </Button>
        <p className="text-xs text-fg-muted">
          {checkUpdate.isPending
            ? t("settings.updateChecking")
            : update
              ? updateStatusText(t, update)
              : t("settings.updateIdle")}
        </p>
      </div>
    </div>
  );
}

function ShortcutsSection() {
  const t = useT();
  const prefs = useUiStore((s) => s.prefs);
  const patchPrefs = useUiStore((s) => s.patchPrefs);
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
    <div className="flex flex-col gap-4">
      <p className="text-xs text-fg-muted">{t("settings.shortcutHint")}</p>
      <SettingRow label={t("settings.shortcut.palette")}>
        <ShortcutRecorder
          value={prefs.shortcuts.palette}
          onChange={(next) => bind("palette", next)}
        />
      </SettingRow>
      <SettingRow label={t("settings.shortcut.run")}>
        <ShortcutRecorder value={prefs.shortcuts.run} onChange={(next) => bind("run", next)} />
      </SettingRow>
      {conflict ? <p className="text-xs text-danger">{conflict}</p> : null}
    </div>
  );
}

function ShortcutRecorder({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const t = useT();
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    if (!recording) return;
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "Escape") {
        setRecording(false);
        return;
      }
      const next = eventToShortcut(event);
      if (!next) return;
      onChange(next);
      setRecording(false);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [recording, onChange]);

  return (
    <Button
      variant={recording ? "default" : "outline"}
      size="sm"
      onClick={() => setRecording(true)}
      aria-pressed={recording}
      className={recording ? "ring-2 ring-accent ring-offset-2 ring-offset-bg" : undefined}
    >
      {recording ? t("settings.shortcutRecording") : <Kbd>{formatShortcut(value)}</Kbd>}
    </Button>
  );
}

function DebugSection() {
  const t = useT();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const debug = useQuery({ queryKey: ["shellDebug"], queryFn: () => bridge.debugInfo() });
  const logs = useQuery({ queryKey: ["shellLogs"], queryFn: () => bridge.logsTail() });
  const engine = useQuery({ queryKey: ["engineInfo"], queryFn: () => bridge.engineInfo() });

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
    <div className="flex flex-col gap-6">
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={refresh}>
          {t("settings.debug.refresh")}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => void copy()}>
          {copied ? t("settings.debug.copied") : t("settings.debug.copy")}
        </Button>
      </div>

      <FieldBlock label={t("settings.debug.system")}>
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
      </FieldBlock>

      <FieldBlock label={t("settings.debug.paths")}>
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
      </FieldBlock>

      <FieldBlock label={t("settings.debug.logs")}>
        {logs.data ? (
          <pre className="max-h-64 overflow-auto rounded-md border border-line bg-bg p-3 font-mono text-xs leading-relaxed text-fg">
            {logs.data}
          </pre>
        ) : (
          <p className="text-sm text-fg-muted">{t("settings.debug.emptyLog")}</p>
        )}
      </FieldBlock>
    </div>
  );
}

function AboutSection() {
  const t = useT();
  const debug = useQuery({ queryKey: ["shellDebug"], queryFn: () => bridge.debugInfo() });

  return (
    <div className="flex flex-col gap-5">
      <div className="relative overflow-hidden rounded-lg border border-line bg-surface px-5 py-8">
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

function FieldBlock({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-line bg-surface px-5 py-4 shadow-soft">
      <h2 className="font-display text-base text-fg">{label}</h2>
      {hint ? <p className="mt-1 text-xs leading-relaxed text-fg-muted">{hint}</p> : null}
      <div className="mt-3">{children}</div>
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
  result: UpdaterResult,
): string {
  if (result.status === "upToDate") {
    return t("settings.updateUpToDate", { version: result.currentVersion });
  }
  if (result.status === "checking") return t("settings.updateChecking");
  return t("settings.updateUnavailable");
}
