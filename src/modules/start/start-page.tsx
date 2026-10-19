import { useNavigate } from "@tanstack/react-router";
import { Check, PencilLine, Play, Save, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";

import { currentContext } from "@/lib/commands/context";
import { registry } from "@/lib/commands/registry";
import { PROCESS_CATALOG, processById } from "@/lib/targets";
import { findStepById } from "@/lib/template";
import { cn } from "@/lib/utils";
import { MigrationBanner } from "@/modules/flow-editor/migration-banner";
import { LocatorTester } from "@/modules/locator/locator-tester";
import { ExecutionLogPanel } from "@/modules/runner/execution-log-panel";
import { JOB_PRESETS } from "@/modules/start/presets";
import { useEditorStore } from "@/stores/editor";
import { useExecutionStore } from "@/stores/execution";
import { useT, useUiStore } from "@/stores/ui";
import {
  Badge,
  Button,
  ChoiceGroup,
  PageHeader,
  Select,
  SplitPane,
  StatusBadge,
} from "@/ui";

/** 开始页：选模板、选进程、确认识别方式，再试一次。勾选即写模板 disabled。 */
export function StartPage() {
  const navigate = useNavigate();
  const t = useT();
  const [presetId, setPresetId] = useState(JOB_PRESETS[0].id);
  const preset = JOB_PRESETS.find((item) => item.id === presetId) ?? JOB_PRESETS[0];
  const templateSteps = useEditorStore((s) => s.steps);
  const processId = useEditorStore((s) => s.processId);
  const match = useEditorStore((s) => s.match);
  const locate = useEditorStore((s) => s.locate);
  const dirty = useEditorStore((s) => s.dirty);
  const filePath = useEditorStore((s) => s.filePath);
  const bindProcess = useEditorStore((s) => s.bindProcess);
  const setLocateChannel = useEditorStore((s) => s.setLocateChannel);
  const setVisionPack = useEditorStore((s) => s.setVisionPack);
  const setStepDisabled = useEditorStore((s) => s.setStepDisabled);
  const loadTemplate = useEditorStore((s) => s.loadTemplate);
  // 可用预设一律投影当前编辑器模板，勾选与文件共用同一份 disabled
  const liveSteps = preset.available ? templateSteps : preset.steps;
  const startTopHeight = useUiStore((s) => s.startTopHeight);
  const setStartTopHeight = useUiStore((s) => s.setStartTopHeight);
  const startLogWidth = useUiStore((s) => s.startLogWidth);
  const setStartLogWidth = useUiStore((s) => s.setStartLogWidth);
  const phase = useExecutionStore((s) => s.phase);
  const stepStatuses = useExecutionStore((s) => s.stepStatuses);
  const activeStepId = useExecutionStore((s) => s.activeStepId);
  const engineStatus = useExecutionStore((s) => s.engineStatus);
  const canRun =
    engineStatus === "ready" && phase !== "running" && phase !== "validating" && Boolean(processId);

  const selectedCount = useMemo(
    () => liveSteps.filter((step) => !("disabled" in step && step.disabled)).length,
    [liveSteps],
  );
  const probed = processById(processId);

  const selectPreset = (id: string) => {
    const next = JOB_PRESETS.find((item) => item.id === id);
    if (!next?.available) return;
    setPresetId(id);
    if (next.load) {
      loadTemplate(next.load());
    }
  };

  const toggleStep = (id: string) => {
    if (!preset.available) return;
    const step = findStepById(templateSteps, id);
    if (!step) return;
    // 写入编辑器 disabled；有关联路径时 dirty，保存即进 *.flow.json
    setStepDisabled(id, !step.disabled);
  };

  const runCommand = (id: string) => void registry.run(id, currentContext());

  return (
    <div className="flex h-full min-h-0 flex-col">
      <MigrationBanner />
      <PageHeader
        title={t("start.title")}
        description={t("start.description")}
        actions={
          <>
            {filePath ? (
              <Badge tone={dirty ? "warning" : "accent"} title={filePath}>
                {dirty ? t("start.fileDirty") : t("start.fileBound")}
              </Badge>
            ) : (
              <Badge>{t("start.draftOnly")}</Badge>
            )}
            {filePath && dirty ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => runCommand("flow.save")}
                aria-label={t("start.saveFile")}
              >
                <Save />
                {t("start.saveFile")}
              </Button>
            ) : null}
          </>
        }
      />
      <SplitPane
        orientation="vertical"
        className="min-h-0 flex-1 px-4 pb-4"
        size={startTopHeight}
        onSizeChange={setStartTopHeight}
        min={160}
        minSecond={220}
        label={t("layout.resize.vertical")}
      >
        <SplitPane
          className="h-full"
          primary="second"
          size={startLogWidth}
          onSizeChange={setStartLogWidth}
          min={220}
          minSecond={240}
          label={t("layout.resize.horizontal")}
        >
          <section className="flex h-full min-h-0 flex-col gap-3 overflow-auto pr-1">
            {JOB_PRESETS.map((item, index) => {
              const active = item.id === preset.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={!item.available}
                  onClick={() => selectPreset(item.id)}
                  className={cn(
                    "hover-lift flex flex-col items-start gap-2 rounded-xl px-4 py-3 text-left animate-rise",
                    index === 0 && "delay-1",
                    index === 1 && "delay-2",
                    index === 2 && "delay-3",
                    item.available
                      ? active
                        ? "border border-accent bg-accent-soft shadow-float"
                        : "glass-card hover:border-accent/40"
                      : "cursor-not-allowed border border-line bg-surface/60 opacity-60",
                  )}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="font-display text-sm text-fg">{item.title}</span>
                    {item.laterHint ? (
                      <Badge>{item.laterHint}</Badge>
                    ) : active ? (
                      <Badge tone="accent">{t("start.using")}</Badge>
                    ) : null}
                  </div>
                  <span className="text-xs leading-relaxed text-fg-muted">{item.summary}</span>
                </button>
              );
            })}
          </section>
          <ExecutionLogPanel aside={<StatusBadge state={phase} />} />
        </SplitPane>

        <section className="glass-card flex h-full min-h-0 flex-col rounded-xl px-5 py-4">
          <div className="shrink-0">
            <p className="font-display text-lg text-fg">{preset.title}</p>
            <p className="mt-1 text-sm text-fg-muted">
              {t("start.selected", { n: selectedCount, total: liveSteps.length })}
            </p>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-fg-muted">{t("start.process")}</span>
              <Select
                aria-label={t("start.process")}
                value={processId}
                onChange={(event) => {
                  bindProcess(event.target.value);
                }}
              >
                {PROCESS_CATALOG.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
            </label>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-fg-muted">{t("start.locate")}</span>
              <ChoiceGroup
                aria-label={t("start.locate")}
                columns={2}
                value={locate.channel}
                onChange={setLocateChannel}
                options={[
                  { value: "a11y", label: t("start.locate.a11y") },
                  { value: "vision", label: t("start.locate.vision") },
                ]}
              />
            </div>
          </div>
          {probed ? (
            <p className="mt-2 text-xs text-fg-muted">
              {locate.source === "user" ? t("start.locate.overridden") : t("start.locate.probed")}
              {probed.reasons.join(" · ")}
            </p>
          ) : null}
          {locate.channel === "vision" ? (
            <label className="mt-2 flex max-w-xs flex-col gap-1.5">
              <span className="text-xs text-fg-muted">{t("start.visionPack")}</span>
              <Select
                aria-label={t("start.visionPack")}
                value={locate.visionPack}
                onChange={(event) => setVisionPack(event.target.value)}
              >
                <option value="template">{t("start.pack.template")}</option>
                <option value="ocr-zh">{t("start.pack.ocr")}</option>
              </Select>
            </label>
          ) : null}

          {locate.channel === "a11y" ? <LocatorTester match={match} locate={locate} /> : null}

          <ol className="mt-4 min-h-0 flex-1 overflow-auto">
            {liveSteps.map((step, index) => {
              const isOn = !("disabled" in step && step.disabled);
              const running = activeStepId === step.id;
              const runStatus = stepStatuses[step.id];
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isOn}
                    aria-label={step.label}
                    onClick={() => toggleStep(step.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors duration-150",
                      "hover:bg-fg/5",
                      running && "bg-accent-soft",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-sm border transition-all duration-200",
                        isOn
                          ? "border-accent bg-accent text-accent-fg"
                          : "border-line bg-surface-raised text-transparent",
                      )}
                    >
                      <Check
                        className={cn(
                          "size-3 transition-transform duration-200",
                          isOn ? "scale-100" : "scale-50",
                        )}
                      />
                    </span>
                    <span className="w-6 font-display text-sm text-fg-faint">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className={cn("text-sm", isOn ? "text-fg" : "text-fg-muted line-through")}>
                      {step.label}
                    </span>
                    {runStatus && runStatus !== "pending" ? (
                      <span className="ml-auto text-xs text-fg-faint">{t(`edit.run.${runStatus}`)}</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="mt-4 flex shrink-0 flex-wrap items-center gap-2">
            <Button size="lg" disabled={!canRun} onClick={() => runCommand("flow.run")}>
              <Play />
              {t("start.run")}
            </Button>
            <Button
              variant="secondary"
              disabled={!canRun}
              onClick={() => runCommand("flow.dryRun")}
            >
              <Wand2 />
              {t("start.dryRun")}
            </Button>
            <Button variant="outline" onClick={() => void navigate({ to: "/edit" })}>
              <PencilLine />
              {t("start.edit")}
            </Button>
          </div>
        </section>
      </SplitPane>
    </div>
  );
}
