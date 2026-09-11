import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Bird, History, Settings, Workflow } from "lucide-react";
import { useEffect } from "react";

import { bridge, isTauri } from "@/lib/bridge";
import { currentContext } from "@/lib/commands/context";
import { registry } from "@/lib/commands/registry";
import { cn } from "@/lib/utils";
import { useExecutionStore } from "@/stores/execution";
import { useUiStore } from "@/stores/ui";
import { StatusBadge, Tooltip, TooltipContent, TooltipTrigger } from "@/ui";

import { CommandPalette } from "../command-palette/command-palette";

const NAV_ITEMS = [
  { to: "/", label: "流程编排", icon: Workflow },
  { to: "/history", label: "执行历史", icon: History },
  { to: "/settings", label: "设置", icon: Settings },
] as const;

const ENGINE_STATUS_LABEL = {
  starting: "引擎启动中",
  ready: "引擎就绪",
  degraded: "引擎降级",
  stopped: "引擎已停止",
} as const;

export function AppLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { engineStatus, engineUptimeMs, phase, lastTraceId, setEngineStatus, setPhase, appendLog } =
    useExecutionStore();
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);

  useEffect(() => {
    return bridge.onEngineEvent((event) => {
      if (event.kind === "status" && event.status) {
        setEngineStatus(event.status, event.uptimeMs);
      } else if (event.kind === "execution" && event.phase) {
        setPhase(event.phase, event.executionId, event.traceId);
      } else if (event.kind === "log" && event.message) {
        appendLog({ ts: Date.now(), message: event.message, traceId: event.traceId });
      }
    });
  }, [setEngineStatus, setPhase, appendLog]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      const ctx = currentContext();
      for (const command of registry.list(ctx)) {
        if (command.shortcut && matchShortcut(e, command.shortcut)) {
          e.preventDefault();
          void registry.run(command.id, ctx);
          return;
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setPaletteOpen]);

  return (
    <div className="flex h-screen flex-col bg-bg text-fg">
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-52 shrink-0 flex-col border-r border-line bg-surface">
          <div className="flex items-center gap-2.5 px-4 py-4">
            <div className="flex size-8 items-center justify-center rounded-md bg-accent/15 text-accent">
              <Bird className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">Lanius</p>
              <p className="text-xs text-fg-faint leading-tight">桌面自动化平台</p>
            </div>
          </div>
          <nav className="flex flex-col gap-0.5 px-2">
            {NAV_ITEMS.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors duration-150",
                    active
                      ? "bg-surface-raised text-fg"
                      : "text-fg-muted hover:bg-surface-raised hover:text-fg",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto px-4 py-3">
            <button
              onClick={() => setPaletteOpen(true)}
              className="flex w-full items-center justify-between rounded-md border border-line bg-bg px-3 py-1.5 text-xs text-fg-faint transition-colors hover:text-fg-muted"
            >
              <span>命令面板</span>
              <kbd className="font-mono">⌘K</kbd>
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      <footer className="flex h-8 shrink-0 items-center gap-4 border-t border-line bg-surface px-4 text-xs text-fg-muted">
        <Tooltip>
          <TooltipTrigger className="flex items-center gap-1.5">
            <span
              className={cn(
                "size-2 rounded-full",
                engineStatus === "ready" && "bg-success",
                engineStatus === "starting" && "bg-warning",
                (engineStatus === "degraded" || engineStatus === "stopped") && "bg-danger",
              )}
            />
            {ENGINE_STATUS_LABEL[engineStatus]}
          </TooltipTrigger>
          <TooltipContent>
            运行 {Math.floor(engineUptimeMs / 1000)}s{isTauri ? "" : "（浏览器 mock）"}
          </TooltipContent>
        </Tooltip>
        <StatusBadge state={phase} />
        {lastTraceId ? (
          <span className="font-mono text-fg-faint select-all">trace: {lastTraceId}</span>
        ) : null}
        <span className="ml-auto font-mono text-fg-faint">v0.1.0 · M0</span>
      </footer>

      <CommandPalette />
    </div>
  );
}

function matchShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut.split("+");
  const key = parts[parts.length - 1].toLowerCase();
  const needMod = parts.includes("Mod");
  const needShift = parts.includes("Shift");
  const modPressed = event.metaKey || event.ctrlKey;
  if (needMod !== modPressed || needShift !== event.shiftKey) return false;
  if (key === "enter") return event.key === "Enter";
  if (key === ",") return event.key === ",";
  return event.key.toLowerCase() === key;
}
