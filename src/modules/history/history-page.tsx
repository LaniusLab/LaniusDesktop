import { History } from "lucide-react";

import { useExecutionStore } from "@/stores/execution";
import { useT, useUiStore } from "@/stores/ui";
import { EmptyState, PageHeader, Separator } from "@/ui";

/** 运行记录页。M0 展示当前会话日志流；SQLite 历史库在 M1 随引擎落地 */
export function HistoryPage() {
  const logLines = useExecutionStore((s) => s.logLines);
  const locale = useUiStore((s) => s.prefs.locale);
  const t = useT();

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={t("history.title")} description={t("history.description")} />
      {logLines.length === 0 ? (
        <EmptyState
          icon={<History className="size-6" />}
          title={t("history.emptyTitle")}
          description={t("history.emptyDescription")}
        />
      ) : (
        <div className="flex-1 overflow-auto px-6 py-4 animate-rise">
          <ul className="flex flex-col">
            {logLines.map((line, index) => (
              <li key={`${String(line.ts)}-${String(index)}`}>
                <div className="flex items-baseline gap-3 py-1.5 text-sm">
                  <span className="shrink-0 font-mono text-xs text-fg-faint">
                    {new Date(line.ts).toLocaleTimeString(locale === "en" ? "en-US" : "zh-CN", {
                      hour12: false,
                    })}
                  </span>
                  <span className="text-fg">{line.message}</span>
                </div>
                {index < logLines.length - 1 ? <Separator /> : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
