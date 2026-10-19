import { useNavigate } from "@tanstack/react-router";
import { History, Crosshair } from "lucide-react";

import { RunComparePanel } from "@/modules/history/run-compare-panel";
import { useEditorStore } from "@/stores/editor";
import { useExecutionStore, type RunRecord } from "@/stores/execution";
import { useT, useUiStore } from "@/stores/ui";
import { Button, EmptyState, PageHeader, Separator, StatusBadge } from "@/ui";

/** 运行记录：本会话摘要；失败项可跳回模板对应步骤；预演↔试一次对照。 */
export function HistoryPage() {
  const runs = useExecutionStore((s) => s.runs);
  const locale = useUiStore((s) => s.prefs.locale);
  const t = useT();
  const navigate = useNavigate();
  const selectStep = useEditorStore((s) => s.selectStep);

  const jumpToFailed = (run: RunRecord) => {
    if (!run.failedStepId) return;
    selectStep(run.failedStepId);
    void navigate({ to: "/edit" });
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={t("history.title")} description={t("history.description")} />
      {runs.length === 0 ? (
        <EmptyState
          icon={<History className="size-6" />}
          title={t("history.emptyTitle")}
          description={t("history.emptyDescription")}
        />
      ) : (
        <div className="flex-1 overflow-auto px-6 py-4 animate-rise">
          <RunComparePanel runs={runs} />
          <ul className="flex flex-col">
            {runs.map((run, index) => (
              <li key={run.executionId}>
                <div className="flex flex-wrap items-center gap-3 py-2.5">
                  <span className="shrink-0 font-mono text-xs text-fg-faint">
                    {new Date(run.startedAt).toLocaleTimeString(locale === "en" ? "en-US" : "zh-CN", {
                      hour12: false,
                    })}
                  </span>
                  <StatusBadge state={run.finalState} />
                  <span className="text-sm text-fg">
                    {t(run.mode === "dryRun" ? "history.mode.dryRun" : "history.mode.run")}
                  </span>
                  <span className="text-sm text-fg-muted">
                    {t("history.summary", { done: run.doneCount, skipped: run.skippedCount })}
                  </span>
                  {run.failedCount > 0 ? (
                    <span className="text-sm text-danger">
                      {t("history.failed", { n: run.failedCount })}
                    </span>
                  ) : null}
                  {run.exe ? (
                    <span className="text-xs text-fg-faint">
                      {t("history.target", {
                        exe: run.exe,
                        channel: run.channel === "vision" ? t("start.locate.vision") : t("start.locate.a11y"),
                      })}
                    </span>
                  ) : null}
                  {run.errorMessage ? (
                    <span className="w-full text-xs text-danger sm:w-auto">{run.errorMessage}</span>
                  ) : null}
                  {run.failedStepId ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="ml-auto"
                      onClick={() => jumpToFailed(run)}
                      aria-label={t("history.jumpFailed")}
                    >
                      <Crosshair className="size-3.5" />
                      {t("history.jumpFailed")}
                    </Button>
                  ) : null}
                </div>
                {index < runs.length - 1 ? <Separator /> : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
