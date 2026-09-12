import { useNavigate } from "@tanstack/react-router";
import { Check, PencilLine, Play, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";

import { currentContext } from "@/lib/commands/context";
import { registry } from "@/lib/commands/registry";
import { cn } from "@/lib/utils";
import { JOB_PRESETS } from "@/modules/start/presets";
import { useExecutionStore } from "@/stores/execution";
import { useT, useUiStore } from "@/stores/ui";
import { Badge, Button, PageHeader, SplitPane, StatusBadge } from "@/ui";

/** 开始页：MaaEnd 式可调分栏——上栏预设与日志，下栏步骤与试一次。勾选为 M0 mock。 */
export function StartPage() {
  const navigate = useNavigate();
  const t = useT();
  const [presetId, setPresetId] = useState(JOB_PRESETS[0].id);
  const preset = JOB_PRESETS.find((item) => item.id === presetId) ?? JOB_PRESETS[0];
  const [checked, setChecked] = useState<ReadonlySet<string>>(
    () => new Set(preset.steps.map((step) => step.id)),
  );
  const startTopHeight = useUiStore((s) => s.startTopHeight);
  const setStartTopHeight = useUiStore((s) => s.setStartTopHeight);
  const startLogWidth = useUiStore((s) => s.startLogWidth);
  const setStartLogWidth = useUiStore((s) => s.setStartLogWidth);
  const logLines = useExecutionStore((s) => s.logLines);
  const phase = useExecutionStore((s) => s.phase);
  const engineStatus = useExecutionStore((s) => s.engineStatus);
  const canRun =
    engineStatus === "ready" && phase !== "running" && phase !== "validating";

  const selectedCount = useMemo(
    () => preset.steps.filter((step) => checked.has(step.id)).length,
    [checked, preset.steps],
  );

  const selectPreset = (id: string) => {
    const next = JOB_PRESETS.find((item) => item.id === id);
    if (!next?.available) return;
    setPresetId(id);
    setChecked(new Set(next.steps.map((step) => step.id)));
  };

  const toggleStep = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const runCommand = (id: string) => void registry.run(id, currentContext());

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader title={t("start.title")} description={t("start.description")} />
      <SplitPane
        orientation="vertical"
        className="min-h-0 flex-1 px-4 pb-4"
        size={startTopHeight}
        onSizeChange={setStartTopHeight}
        min={160}
        minSecond={180}
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
          <section className="glass-card flex h-full min-h-0 flex-col rounded-xl px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-display text-sm text-fg">{t("start.log")}</p>
              <StatusBadge state={phase} />
            </div>
            {logLines.length === 0 ? (
              <p className="m-auto text-sm text-fg-faint">{t("start.logEmpty")}</p>
            ) : (
              <ol className="mt-3 min-h-0 flex-1 overflow-auto">
                {logLines.map((line, index) => (
                  <li
                    key={`${String(line.ts)}-${String(index)}`}
                    className="border-b border-line/70 py-1.5 text-xs text-fg-muted last:border-b-0"
                  >
                    {line.message}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </SplitPane>

        <section className="glass-card flex h-full min-h-0 flex-col rounded-xl px-5 py-4">
          <div className="shrink-0">
            <p className="font-display text-lg text-fg">{preset.title}</p>
            <p className="mt-1 text-sm text-fg-muted">
              {t("start.selected", { n: selectedCount, total: preset.steps.length })}
            </p>
          </div>
          <ol className="mt-4 min-h-0 flex-1 overflow-auto">
            {preset.steps.map((step, index) => {
              const isOn = checked.has(step.id);
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
