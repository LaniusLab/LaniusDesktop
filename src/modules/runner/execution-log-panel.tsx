import { useMemo, useState, type ReactNode } from "react";

import type { LogLevel } from "@/lib/bridge";
import { cn } from "@/lib/utils";
import { useExecutionStore, type LogLine } from "@/stores/execution";
import { useT } from "@/stores/ui";
import { Select } from "@/ui";

type LevelFilter = "all" | LogLevel;

function lineTone(level: LogLevel | undefined): string {
  if (level === "error") return "text-danger";
  if (level === "warning") return "text-warning";
  if (level === "debug") return "text-fg-faint";
  return "text-fg-muted";
}

function filterLines(lines: LogLine[], filter: LevelFilter, onlyLatestTrace: boolean, lastTraceId?: string): LogLine[] {
  return lines.filter((line) => {
    if (filter !== "all" && (line.level ?? "info") !== filter) return false;
    if (onlyLatestTrace && lastTraceId && line.traceId && line.traceId !== lastTraceId) return false;
    return true;
  });
}

function groupByTrace(lines: LogLine[]): Array<{ traceId: string; lines: LogLine[] }> {
  const order: string[] = [];
  const map = new Map<string, LogLine[]>();
  for (const line of lines) {
    const key = line.traceId ?? "(no-trace)";
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)?.push(line);
  }
  return order.map((traceId) => ({ traceId, lines: map.get(traceId) ?? [] }));
}

/** 执行日志：级别过滤 + 可选按 trace 聚合（默认界面不常驻展示 traceId）。 */
export function ExecutionLogPanel({
  className,
  aside,
}: {
  className?: string;
  aside?: ReactNode;
}) {
  const t = useT();
  const logLines = useExecutionStore((s) => s.logLines);
  const lastTraceId = useExecutionStore((s) => s.lastTraceId);
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [groupTrace, setGroupTrace] = useState(false);
  const [onlyLatest, setOnlyLatest] = useState(false);

  const filtered = useMemo(
    () => filterLines(logLines, levelFilter, onlyLatest, lastTraceId),
    [logLines, levelFilter, onlyLatest, lastTraceId],
  );
  const groups = useMemo(() => (groupTrace ? groupByTrace(filtered) : null), [filtered, groupTrace]);

  return (
    <section className={cn("glass-card flex h-full min-h-0 flex-col rounded-xl px-4 py-3", className)}>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <p className="font-display text-sm text-fg">{t("start.log")}</p>
        {aside}
        <Select
          aria-label={t("log.filter.level")}
          className="ml-auto w-28"
          value={levelFilter}
          onChange={(event) => setLevelFilter(event.target.value as LevelFilter)}
        >
          <option value="all">{t("log.filter.all")}</option>
          <option value="info">{t("log.filter.info")}</option>
          <option value="warning">{t("log.filter.warning")}</option>
          <option value="error">{t("log.filter.error")}</option>
          <option value="debug">{t("log.filter.debug")}</option>
        </Select>
        <label className="flex items-center gap-1 text-xs text-fg-muted">
          <input
            type="checkbox"
            checked={groupTrace}
            onChange={(event) => setGroupTrace(event.target.checked)}
          />
          {t("log.groupTrace")}
        </label>
        <label className="flex items-center gap-1 text-xs text-fg-muted">
          <input
            type="checkbox"
            checked={onlyLatest}
            onChange={(event) => setOnlyLatest(event.target.checked)}
          />
          {t("log.onlyLatest")}
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="m-auto text-sm text-fg-faint">{t("start.logEmpty")}</p>
      ) : groups ? (
        <div className="mt-2 min-h-0 flex-1 overflow-auto">
          {groups.map((group) => (
            <div key={group.traceId} className="mb-3">
              <p className="sticky top-0 bg-surface/90 py-1 font-mono text-[10px] text-fg-faint backdrop-blur-sm" title={group.traceId}>
                {group.traceId === "(no-trace)" ? t("log.noTrace") : t("log.traceGroup")}
              </p>
              <ol>
                {group.lines.map((line, index) => (
                  <LogRow key={`${String(line.ts)}-${String(index)}`} line={line} />
                ))}
              </ol>
            </div>
          ))}
        </div>
      ) : (
        <ol className="mt-2 min-h-0 flex-1 overflow-auto">
          {filtered.map((line, index) => (
            <LogRow key={`${String(line.ts)}-${String(index)}`} line={line} />
          ))}
        </ol>
      )}
    </section>
  );
}

function LogRow({ line }: { line: LogLine }) {
  return (
    <li
      className={cn("border-b border-line/70 py-1.5 text-xs last:border-b-0", lineTone(line.level))}
      title={line.traceId ? `trace ${line.traceId}` : undefined}
    >
      {line.message}
    </li>
  );
}
