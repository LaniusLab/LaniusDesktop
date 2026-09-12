import { useNavigate } from "@tanstack/react-router";
import {
  Command,
  CornerDownLeft,
  History,
  Keyboard,
  LayoutGrid,
  PencilLine,
  Play,
  Search,
  Settings,
  Sun,
  Wand2,
  type LucideIcon,
} from "lucide-react";
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

const COMMAND_ICON: Record<string, LucideIcon> = {
  "nav.flows": Play,
  "nav.edit": PencilLine,
  "nav.history": History,
  "nav.keymap": Keyboard,
  "nav.settings": Settings,
  "nav.gallery": LayoutGrid,
  "flow.run": Play,
  "flow.dryRun": Wand2,
  "app.toggleTheme": Sun,
};

/** 命令盒：占位显示「搜索」，命中与回车只走命令注册表（ADR-0007）。 */
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
    <Overlay
      open={open}
      onOpenChange={setOpen}
      title={t("search.title")}
      panelClassName="max-w-2xl rounded-2xl"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <Search className="size-4 shrink-0 text-fg-faint" />
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setCursor(0);
          }}
          onKeyDown={onQueryKeyDown}
          placeholder={t("search.placeholder")}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={hits.length > 0}
          aria-controls="command-palette-list"
          className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:outline-none"
          autoFocus
        />
        <Command className="size-4 shrink-0 text-fg-faint" aria-hidden />
      </div>
      <ul
        id="command-palette-list"
        className="max-h-80 overflow-auto px-2 pb-2"
        role="listbox"
        aria-label={t("search.title")}
      >
        {hits.length === 0 ? (
          <li className="px-3 py-10 text-center text-sm text-fg-faint">{t("search.empty")}</li>
        ) : (
          groups.map((bucket) => {
            const start = offset;
            offset += bucket.hits.length;
            return (
              <li key={bucket.group} className="pb-1">
                <p className="px-3 pb-1 pt-2 text-[11px] tracking-wide text-fg-faint">
                  {t(GROUP_KEY[bucket.group])}
                </p>
                <ul>
                  {bucket.hits.map((hit, indexInGroup) => {
                    const index = start + indexInGroup;
                    const Icon = COMMAND_ICON[hit.id] ?? Command;
                    const active = index === cursor;
                    return (
                      <li key={hit.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          aria-label={hit.title}
                          disabled={!hit.enabled}
                          onMouseEnter={() => setCursor(index)}
                          onClick={() => runHit(hit)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors duration-150",
                            active ? "bg-fg/8 text-fg" : "text-fg-muted hover:bg-fg/5",
                            !hit.enabled && "cursor-not-allowed opacity-40",
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-8 shrink-0 items-center justify-center rounded-xl",
                              active ? "bg-accent-soft text-accent" : "bg-fg/5 text-fg-faint",
                            )}
                          >
                            <Icon className="size-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-fg">
                              {highlightMatch(hit.title, query).map((part, partIndex) => (
                                <span
                                  key={`${hit.id}-${String(partIndex)}`}
                                  className={part.match ? "text-accent" : undefined}
                                >
                                  {part.text}
                                </span>
                              ))}
                            </span>
                            <span className="mt-0.5 block text-[11px] text-fg-faint">
                              {t(GROUP_KEY[hit.group])}
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            {hit.shortcut ? <Kbd>{formatShortcut(hit.shortcut)}</Kbd> : null}
                            {active ? (
                              <span className="flex items-center gap-1 text-[11px] text-fg-faint">
                                <CornerDownLeft className="size-3" />
                                {t("search.hint.run")}
                              </span>
                            ) : null}
                          </span>
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
