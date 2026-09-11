import { History } from "lucide-react";

import { useExecutionStore } from "@/stores/execution";
import { EmptyState, PageHeader, Separator } from "@/ui";

/** 执行历史页。M0 展示当前会话日志流；SQLite 历史库在 M1 随引擎落地 */
export function HistoryPage() {
  const logLines = useExecutionStore((s) => s.logLines);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="执行历史" description="会话内执行日志；持久化历史库随 M1 引擎落地" />
      {logLines.length === 0 ? (
        <EmptyState
          icon={<History className="size-6" />}
          title="还没有执行记录"
          description="在流程编排页点击「运行」或「预演」，这里会实时显示执行日志。"
        />
      ) : (
        <div className="flex-1 overflow-auto px-6 py-4">
          <ul className="flex flex-col">
            {logLines.map((line, index) => (
              <li key={index}>
                <div className="flex items-baseline gap-3 py-1.5 text-sm">
                  <span className="shrink-0 font-mono text-xs text-fg-faint">
                    {new Date(line.ts).toLocaleTimeString("zh-CN", { hour12: false })}
                  </span>
                  <span className="text-fg">{line.message}</span>
                  {line.traceId ? (
                    <span className="ml-auto font-mono text-xs text-fg-faint select-all">
                      {line.traceId}
                    </span>
                  ) : null}
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
