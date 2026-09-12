import { useNavigate } from "@tanstack/react-router";
import { Check, PencilLine, Play, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";

import { currentContext } from "@/lib/commands/context";
import { registry } from "@/lib/commands/registry";
import { cn } from "@/lib/utils";
import { JOB_PRESETS } from "@/modules/start/presets";
import { useExecutionStore } from "@/stores/execution";
import { useT } from "@/stores/ui";
import { Badge, Button, PageHeader } from "@/ui";

/** 开始页：MaaEnd 式预设 + 勾选 + 试一次；勾选为 M0 mock，不写回引擎 */
/** 开始页：MaaEnd 式预设 + 勾选 + 试一次；勾选为 M0 mock，不写回引擎。
 */
export function StartPage() {
  const navigate = useNavigate();
  const t = useT();
  const [presetId, setPresetId] = useState(JOB_PRESETS[0].id);
  const preset = JOB_PRESETS.find((item) => item.id === presetId) ?? JOB_PRESETS[0];
  const [checked, setChecked] = useState<ReadonlySet<string>>(
    () => new Set(preset.steps.map((step) => step.id)),
  );

  const engineStatus = useExecutionStore((s) => s.engineStatus);
  const phase = useExecutionStore((s) => s.phase);
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
    <div className="flex h-full flex-col">
      <PageHeader title={t("start.title")} description={t("start.description")} />
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <section className="grid gap-3 sm:grid-cols-3">
            {JOB_PRESETS.map((item, index) => {
              const active = item.id === preset.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={!item.available}
                  onClick={() => selectPreset(item.id)}
                  className={cn(
                    "hover-lift flex flex-col items-start gap-2 rounded-lg border px-4 py-3 text-left animate-rise",
                    index === 0 && "delay-1",
                    index === 1 && "delay-2",
                    index === 2 && "delay-3",
                    item.available
                      ? active
                        ? "border-accent bg-surface-raised shadow-float"
                        : "border-line bg-surface hover:border-accent/40 hover:shadow-soft"
                      : "cursor-not-allowed border-line bg-surface/60 opacity-60",
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

          <section className="rounded-lg border border-line bg-surface px-5 py-5 shadow-soft animate-rise delay-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="font-display text-lg text-fg">{preset.title}</p>
                <p className="mt-1 text-sm text-fg-muted">
                  {t("start.selected", { n: selectedCount, total: preset.steps.length })}
                </p>
              </div>
            </div>

            <ol className="mt-5 flex flex-col gap-1">
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
                        "flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left transition-colors duration-150",
                        "hover:bg-surface-raised",
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

            <div className="mt-6 flex flex-wrap items-center gap-2">
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
        </div>
      </div>
    </div>
  );
}
