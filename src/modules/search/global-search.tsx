import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";

import { currentContext, injectNavigate } from "@/lib/commands/context";
import { registry } from "@/lib/commands/registry";
import { commandShortcut } from "@/lib/prefs";
import { collectHits, groupHits, highlightMatch, type SearchGroup, type SearchHit } from "@/lib/search/query";
import { formatShortcut } from "@/lib/shortcut";
import { cn } from "@/lib/utils";
import { useT, useUiStore } from "@/stores/ui";
import { Input, Kbd, Overlay } from "@/ui";

const GROUP_KEY: Record<SearchGroup, string> = {
  nav: "search.group.nav",
  run: "search.group.run",
  app: "search.group.app",
};

/** 全局搜索：Overlay 浮层 + 命令注册表索引。动作仍只走 registry（ADR-0007）。 */
export function GlobalSearch() {
  const open = useUiStore((s) => s.searchOpen);
  const setOpen = useUiStore((s) => s.setSearchOpen);
  const prefs = useUiStore((s) => s.prefs);
  const t = useT();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    injectNavigate((to) => void navigate({ to }));
  }, [navigate]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
    }
  }, [open]);

  const ctx = currentContext();
  const hits = useMemo(() => {
    const listed = registry.list(ctx).map((cmd) => ({
      id: cmd.id,
      title: t(`cmd.${cmd.id}`),
      shortcut: commandShortcut(cmd.id, prefs, cmd.shortcut),
      enabled: cmd.enabled,
    }));
    return collectHits(query, listed);
    // list 依赖 store 快照；query / 语言 / 开合 / 快捷键驱动结果
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open, t, prefs]);

  const groups = useMemo(() => groupHits(hits), [hits]);

  useEffect(() => {
    setCursor((current) => (hits.length === 0 ? 0 : Math.min(current, hits.length - 1)));
  }, [hits.length]);

  const runHit = (hit: SearchHit | undefined) => {
    if (!hit?.enabled) return;
    setOpen(false);
    void registry.run(hit.id, currentContext());
  };

  const onQueryKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((current) => Math.min(current + 1, Math.max(hits.length - 1, 0)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      runHit(hits[cursor]);
    }
  };

  let offset = 0;

  return (
    <Overlay open={open} onOpenChange={setOpen} title={t("search.title")}>
      <div className="flex items-center gap-2 border-b border-line px-4">
        <Search className="size-4 text-fg-faint" />
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setCursor(0);
          }}
          onKeyDown={onQueryKeyDown}
          placeholder={t("search.placeholder")}
          className="border-0 bg-transparent focus-visible:outline-none"
          autoFocus
        />
      </div>
      <ul className="max-h-80 overflow-auto py-2" role="listbox" aria-label={t("search.title")}>
        {hits.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-fg-faint">{t("search.empty")}</li>
        ) : (
          groups.map((bucket) => {
            const start = offset;
            offset += bucket.hits.length;
            return (
              <li key={bucket.group} className="px-2">
                <p className="px-2 pb-1 pt-2 font-display text-xs text-fg-faint">
                  {t(GROUP_KEY[bucket.group])}
                </p>
                <ul>
                  {bucket.hits.map((hit, indexInGroup) => {
                    const index = start + indexInGroup;
                    return (
                      <li key={hit.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={index === cursor}
                          aria-label={hit.title}
                          disabled={!hit.enabled}
                          onMouseEnter={() => setCursor(index)}
                          onClick={() => runHit(hit)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors duration-150",
                            index === cursor ? "bg-surface-raised text-fg" : "text-fg-muted",
                            !hit.enabled && "cursor-not-allowed opacity-40",
                          )}
                        >
                          <span>
                            {highlightMatch(hit.title, query).map((part, partIndex) => (
                              <span
                                key={`${hit.id}-${String(partIndex)}`}
                                className={part.match ? "text-accent" : undefined}
                              >
                                {part.text}
                              </span>
                            ))}
                          </span>
                          {hit.shortcut ? <Kbd>{formatShortcut(hit.shortcut)}</Kbd> : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })
        )}
      </ul>
      <div className="flex items-center gap-3 border-t border-line px-4 py-2 text-[11px] text-fg-faint">
        <span>
          <Kbd>↑</Kbd> <Kbd>↓</Kbd> {t("search.hint.move")}
        </span>
        <span>
          <Kbd>Enter</Kbd> {t("search.hint.run")}
        </span>
        <span>
          <Kbd>Esc</Kbd> {t("search.hint.close")}
        </span>
      </div>
    </Overlay>
  );
}
