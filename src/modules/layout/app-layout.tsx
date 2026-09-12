import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bird, History, LayoutGrid, PencilLine, Play, Search, Settings } from "lucide-react";
import { useEffect } from "react";

import { bridge, isTauri } from "@/lib/bridge";
import { currentContext, injectNavigate } from "@/lib/commands/context";
import { registry } from "@/lib/commands/registry";
import { formatShortcut, matchShortcut } from "@/lib/shortcut";
import { cn } from "@/lib/utils";
import { useExecutionStore } from "@/stores/execution";
import { useT, useUiStore } from "@/stores/ui";
import { Kbd, StatusBadge, Tooltip, TooltipContent, TooltipTrigger } from "@/ui";

import { GlobalSearch } from "../search/global-search";
import { Titlebar } from "./titlebar";

const NAV_ITEMS = [
  { to: "/", key: "nav.start", icon: Play },
  { to: "/edit", key: "nav.edit", icon: PencilLine },
  { to: "/history", key: "nav.history", icon: History },
  { to: "/settings", key: "nav.settings", icon: Settings },
  { to: "/gallery", key: "nav.gallery", icon: LayoutGrid },
] as const;

const SKIP_DEFAULT_SHORTCUT = new Set(["app.search", "flow.run"]);

/** 应用壳：侧栏导航 + 顶栏 + 引擎状态脚注 + 全局快捷键分发。
 * palette/run 快捷键读 prefs；其余命令用注册表默认 shortcut（跳过 app.search/flow.run）。
 */
export function AppLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { engineStatus, engineUptimeMs, phase, setEngineStatus, setPhase, appendLog } =
    useExecutionStore();
  const searchOpen = useUiStore((s) => s.searchOpen);
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);
  const replacePrefs = useUiStore((s) => s.replacePrefs);
  const t = useT();
  const searchShortcut = useUiStore((s) => s.prefs.shortcuts.palette);
  const runShortcut = useUiStore((s) => s.prefs.shortcuts.run);

  useEffect(() => {
    injectNavigate((to) => void navigate({ to }));
  }, [navigate]);

  useEffect(() => {
    if (!isTauri) return;
    let cancelled = false;
    void (async () => {
      const remote = await bridge.prefsGet();
      if (cancelled) return;
      replacePrefs(remote);
      if (remote.autoUpdate) {
        await bridge.updaterCheck();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [replacePrefs]);

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
    const onKeyDown = (event: KeyboardEvent) => {
      if (matchShortcut(event, searchShortcut)) {
        event.preventDefault();
        setSearchOpen(!searchOpen);
        return;
      }
      if (searchOpen) return;
      const ctx = currentContext();
      if (matchShortcut(event, runShortcut)) {
        event.preventDefault();
        void registry.run("flow.run", ctx);
        return;
      }
      for (const command of registry.list(ctx)) {
        if (SKIP_DEFAULT_SHORTCUT.has(command.id)) continue;
        if (command.shortcut && matchShortcut(event, command.shortcut)) {
          event.preventDefault();
          void registry.run(command.id, ctx);
          return;
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [searchOpen, searchShortcut, runShortcut, setSearchOpen]);

  return (
    <div className="flex h-screen flex-col bg-bg text-fg">
      <Titlebar />
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-48 shrink-0 flex-col border-r border-line bg-surface">
          <div className="flex items-center gap-2.5 px-4 py-5 animate-rise">
            <div className="flex size-8 items-center justify-center rounded-md bg-accent text-accent-fg shadow-soft transition-transform duration-200 hover:scale-105">
              <Bird className="size-4" />
            </div>
            <div>
              <p className="font-display text-sm leading-tight text-fg">{t("brand.name")}</p>
              <p className="text-xs leading-tight text-fg-faint">{t("brand.tagline")}</p>
            </div>
          </div>
          <nav className="flex flex-col gap-0.5 px-2">
            {NAV_ITEMS.map((item, index) => {
              const active =
                item.to === "/"
                  ? pathname === "/"
                  : item.to === "/gallery"
                    ? pathname.startsWith("/gallery") || pathname.startsWith("/dev/gallery")
                    : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-all duration-200 animate-rise",
                    index === 0 && "delay-1",
                    index === 1 && "delay-2",
                    index === 2 && "delay-3",
                    index === 3 && "delay-4",
                    index === 4 && "delay-5",
                    active
                      ? "bg-surface-raised text-fg before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-accent"
                      : "text-fg-muted hover:bg-surface-raised hover:text-fg",
                  )}
                >
                  <item.icon className="size-4" />
                  {t(item.key)}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto px-3 py-3">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex w-full items-center justify-between rounded-md border border-line bg-bg px-3 py-2 text-xs text-fg-faint transition-colors duration-150 hover:text-fg-muted"
            >
              <span className="flex items-center gap-1.5">
                <Search className="size-3.5" />
                {t("search.title")}
              </span>
              <Kbd>{formatShortcut(searchShortcut)}</Kbd>
            </button>
          </div>
        </aside>

        <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
          <div key={pathname} className="h-full overflow-auto animate-page">
            <Outlet />
          </div>
        </main>
      </div>

      <footer className="flex h-8 shrink-0 items-center gap-4 border-t border-line bg-surface px-4 text-xs text-fg-muted">
        <Tooltip>
          <TooltipTrigger className="flex items-center gap-1.5">
            <span
              className={cn(
                "size-2 rounded-full",
                engineStatus === "ready" && "bg-success",
                engineStatus === "starting" && "bg-warning animate-pulse-dot",
                (engineStatus === "degraded" || engineStatus === "stopped") && "bg-danger",
              )}
            />
            {t(`engine.${engineStatus}`)}
          </TooltipTrigger>
          <TooltipContent>
            {t("engine.uptime", { seconds: Math.floor(engineUptimeMs / 1000) })}
            {isTauri ? "" : ` · ${t("engine.preview")}`}
          </TooltipContent>
        </Tooltip>
        <StatusBadge state={phase} />
      </footer>

      <GlobalSearch />
    </div>
  );
}
