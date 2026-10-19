import { Pause, Play, Square, Wand2 } from "lucide-react";

import { currentContext } from "@/lib/commands/context";
import { registry } from "@/lib/commands/registry";
import { useExecutionStore } from "@/stores/execution";
import { useT } from "@/stores/ui";
import { Button, StatusBadge, Tooltip, TooltipContent, TooltipTrigger } from "@/ui";

/** M3 执行控制条：试一次 / 预演 / 暂停 / 继续 / 取消。 */
export function ExecutionControlBar() {
  const t = useT();
  const phase = useExecutionStore((s) => s.phase);
  const activeExecutionId = useExecutionStore((s) => s.activeExecutionId);
  const pendingMode = useExecutionStore((s) => s.pendingRun?.mode);
  const ctx = currentContext();
  const listed = registry.list(ctx);
  const enabled = (id: string) => listed.find((cmd) => cmd.id === id)?.enabled === true;
  const run = (id: string) => void registry.run(id, currentContext());

  const busy =
    phase === "running" || phase === "paused" || phase === "validating";

  return (
    <div className="ml-auto flex items-center gap-1.5">
      <StatusBadge state={phase} />
      {busy && pendingMode ? (
        <span className="hidden text-fg-faint sm:inline">
          {pendingMode === "dryRun" ? t("history.mode.dryRun") : t("history.mode.run")}
        </span>
      ) : null}
      {activeExecutionId && busy ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="max-w-24 truncate font-mono text-[10px] text-fg-faint">
              {activeExecutionId}
            </span>
          </TooltipTrigger>
          <TooltipContent>{activeExecutionId}</TooltipContent>
        </Tooltip>
      ) : null}

      {enabled("flow.run") ? (
        <Button size="sm" variant="secondary" onClick={() => run("flow.run")} aria-label={t("cmd.flow.run")}>
          <Play className="size-3.5" />
          <span className="hidden sm:inline">{t("cmd.flow.run")}</span>
        </Button>
      ) : null}
      {enabled("flow.dryRun") ? (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => run("flow.dryRun")}
          aria-label={t("cmd.flow.dryRun")}
        >
          <Wand2 className="size-3.5" />
          <span className="hidden sm:inline">{t("cmd.flow.dryRun")}</span>
        </Button>
      ) : null}
      {enabled("flow.pause") ? (
        <Button size="sm" variant="secondary" onClick={() => run("flow.pause")} aria-label={t("cmd.flow.pause")}>
          <Pause className="size-3.5" />
          <span className="hidden sm:inline">{t("cmd.flow.pause")}</span>
        </Button>
      ) : null}
      {enabled("flow.resume") ? (
        <Button size="sm" variant="secondary" onClick={() => run("flow.resume")} aria-label={t("cmd.flow.resume")}>
          <Play className="size-3.5" />
          <span className="hidden sm:inline">{t("cmd.flow.resume")}</span>
        </Button>
      ) : null}
      {enabled("flow.cancel") ? (
        <Button size="sm" variant="ghost" onClick={() => run("flow.cancel")} aria-label={t("cmd.flow.cancel")}>
          <Square className="size-3.5" />
          <span className="hidden sm:inline">{t("cmd.flow.cancel")}</span>
        </Button>
      ) : null}
    </div>
  );
}
