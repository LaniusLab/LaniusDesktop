import { useNavigate } from "@tanstack/react-router";
import { Terminal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { currentContext, injectNavigate } from "@/lib/commands/context";
import { registry } from "@/lib/commands/registry";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui";
import { Dialog, DialogContent, DialogTitle, Input } from "@/ui";

/** 命令面板：命令注册表的触发器之一，本身不含任何动作实现（ADR-0007） */
export function CommandPalette() {
  const open = useUiStore((s) => s.paletteOpen);
  const setOpen = useUiStore((s) => s.setPaletteOpen);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    injectNavigate((to) => void navigate({ to }));
  }, [navigate]);

  const ctx = currentContext();
  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return registry
      .list(ctx)
      .filter((cmd) => !q || cmd.title.toLowerCase().includes(q) || cmd.id.includes(q));
    // ctx 每次渲染重建，但其内容（store 快照）驱动 list 结果；query 是过滤主输入
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
    }
  }, [open]);

  const runItem = (index: number) => {
    const item = items[index];
    if (!item?.enabled) return;
    setOpen(false);
    void registry.run(item.id, currentContext());
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="top-[20%] translate-y-0 gap-0 p-0" aria-describedby={undefined}>
        <DialogTitle className="sr-only">命令面板</DialogTitle>
        <div className="flex items-center gap-2 border-b border-line px-4">
          <Terminal className="size-4 text-fg-faint" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setCursor((c) => Math.min(c + 1, items.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                runItem(cursor);
              }
            }}
            placeholder="输入命令或搜索…"
            className="border-0 bg-transparent focus-visible:outline-none"
            autoFocus
          />
        </div>
        <ul className="max-h-72 overflow-auto py-2">
          {items.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-fg-faint">没有匹配的命令</li>
          ) : (
            items.map((cmd, index) => (
              <li key={cmd.id}>
                <button
                  disabled={!cmd.enabled}
                  onMouseEnter={() => setCursor(index)}
                  onClick={() => runItem(index)}
                  className={cn(
                    "flex w-full items-center justify-between px-4 py-2 text-left text-sm",
                    index === cursor ? "bg-surface-raised text-fg" : "text-fg-muted",
                    !cmd.enabled && "cursor-not-allowed opacity-40",
                  )}
                >
                  <span>{cmd.title}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-xs text-fg-faint">{cmd.id}</span>
                    {cmd.shortcut ? (
                      <kbd className="rounded border border-line px-1.5 py-0.5 font-mono text-xs text-fg-faint">
                        {cmd.shortcut}
                      </kbd>
                    ) : null}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
