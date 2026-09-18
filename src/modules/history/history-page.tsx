import { History } from "lucide-react";

import { useExecutionStore } from "@/stores/execution";
import { useT, useUiStore } from "@/stores/ui";
import { EmptyState, PageHeader, Separator, StatusBadge } from "@/ui";

/** 运行记录页。M0 展示本会话试一次摘要；SQLite 历史库在 M1 随引擎落地。 */
export function HistoryPage() {
  const runs = useExecutionStore((s) => s.runs);
  const locale = useUiStore((s) => s.prefs.locale);
  const t = useT();

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
                  {run.exe ? (
                    <span className="text-xs text-fg-faint">
                      {t("history.target", {
                        exe: run.exe,
                        channel: run.channel === "vision" ? t("start.locate.vision") : t("start.locate.a11y"),
                      })}
                    </span>
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
