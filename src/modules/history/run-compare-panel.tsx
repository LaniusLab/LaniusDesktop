import { compareTrajectories, pickLatestDryAndRun } from "@/lib/run-compare";
import { cn } from "@/lib/utils";
import type { RunRecord } from "@/stores/execution";
import { useT } from "@/stores/ui";

function statusLabel(
  t: (key: string) => string,
  status: string | undefined,
): string {
  if (!status) return "—";
  const key = `edit.run.${status}`;
  const translated = t(key);
  return translated === key ? status : translated;
}

/** 最近一次预演 vs 最近一次试一次的逐步对照。 */
export function RunComparePanel({ runs }: { runs: RunRecord[] }) {
  const t = useT();
  const { dry, real } = pickLatestDryAndRun(runs);
  if (!dry?.nodeRuns?.length || !real?.nodeRuns?.length) return null;

  const compare = compareTrajectories(dry.nodeRuns, real.nodeRuns);

  return (
    <section className="mb-4 rounded-xl border border-line bg-surface/50 px-4 py-3" aria-label={t("history.compare.title")}>
      <div className="flex flex-wrap items-baseline gap-2">
        <p className="font-display text-sm text-fg">{t("history.compare.title")}</p>
        <p className="text-xs text-fg-muted">{t("history.compare.hint")}</p>
      </div>
      <p
        className={cn(
          "mt-2 text-xs",
          compare.structureMatch && compare.statusMatch ? "text-success" : "text-warning",
        )}
      >
        {compare.structureMatch
          ? compare.statusMatch
            ? t("history.compare.aligned")
            : t("history.compare.statusDiff")
          : t("history.compare.structureDiff")}
      </p>
      <ol className="mt-2">
        {compare.rows.map((row) => (
          <li
            key={row.nodeId}
            className={cn(
              "grid grid-cols-[minmax(0,1.4fr)_1fr_1fr] gap-2 border-b border-line/60 py-1.5 text-xs last:border-b-0",
              row.match ? "text-fg-muted" : "text-warning",
            )}
          >
            <span className="truncate text-fg">{row.label ?? row.nodeId}</span>
            <span>
              {t("history.mode.dryRun")}：{statusLabel(t, row.dryStatus)}
            </span>
            <span>
              {t("history.mode.run")}：{statusLabel(t, row.runStatus)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
