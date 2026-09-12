import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bird,
  History,
  Keyboard,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  PencilLine,
  Play,
  Search,
  Settings,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { bridge, isTauri } from "@/lib/bridge";
import { currentContext, injectNavigate } from "@/lib/commands/context";
import { registry } from "@/lib/commands/registry";
import { formatShortcut, matchShortcut } from "@/lib/shortcut";
import { cn } from "@/lib/utils";
import { useExecutionStore } from "@/stores/execution";
import { useT, useUiStore } from "@/stores/ui";
import { Kbd, SplitPane, StatusBadge, Tooltip, TooltipContent, TooltipTrigger } from "@/ui";

import { GlobalSearch } from "../search/global-search";
import { SettingsDialog } from "../settings/settings-page";
import { Titlebar } from "./titlebar";

const NAV_ITEMS = [
  { to: "/", key: "nav.start", icon: Play },
  { to: "/edit", key: "nav.edit", icon: PencilLine },
  { to: "/history", key: "nav.history", icon: History },
  { to: "/keymap", key: "nav.keymap", icon: Keyboard },
  { to: "/gallery", key: "nav.gallery", icon: LayoutGrid },
] as const;

const SKIP_DEFAULT_SHORTCUT = new Set(["app.search", "flow.run"]);

function navClass(active: boolean, index: number, collapsed: boolean): string {
  return cn(
    "relative flex items-center rounded-lg py-2 text-sm transition-all duration-200 animate-rise",
    collapsed ? "justify-center px-2" : "gap-2.5 px-3",
    index === 0 && "delay-1",
    index === 1 && "delay-2",
    index === 2 && "delay-3",
    index === 3 && "delay-4",
    index === 4 && "delay-5",
    active
      ? "bg-accent-soft text-fg shadow-soft"
      : "text-fg-muted hover:bg-fg/5 hover:text-fg",
  );
}

/** 应用壳：可拖拽分栏的侧栏 + 顶栏 + 引擎状态脚注 + 全局快捷键分发。
 * 搜索在侧栏顶部；设置在底部并以 Dialog 打开。palette/run 读 prefs。
 */
export function AppLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { engineStatus, engineUptimeMs, phase, setEngineStatus, setPhase, appendLog } =
    useExecutionStore();
  const searchOpen = useUiStore((s) => s.searchOpen);
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);
  const settingsOpen = useUiStore((s) => s.settingsOpen);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed);
  const sidebarWidth = useUiStore((s) => s.sidebarWidth);
  const setSidebarWidth = useUiStore((s) => s.setSidebarWidth);
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
      <SplitPane
        orientation="horizontal"
        className="min-h-0 flex-1 px-3 pb-3 pt-2"
        size={sidebarWidth}
        onSizeChange={setSidebarWidth}
        min={176}
        max={360}
        minSecond={280}
        collapsed={sidebarCollapsed}
        collapsedSize={64}
        label={t("layout.resize.horizontal")}
      >
        <aside className="glass-panel flex h-full min-h-0 flex-col rounded-xl">
          <div
            className={cn(
              "flex items-center pb-3 pt-4 animate-rise",
              sidebarCollapsed ? "justify-center px-2" : "gap-3 px-4",
            )}
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-fg shadow-stamp transition-transform duration-200 hover:scale-105">
              <Bird className="size-4" />
            </div>
            {sidebarCollapsed ? null : (
              <div className="min-w-0">
                <p className="font-display text-sm leading-tight tracking-wide text-fg">{t("brand.name")}</p>
                <p className="truncate text-xs leading-tight text-fg-faint">{t("brand.tagline")}</p>
              </div>
            )}
          </div>

          <div className={cn("pb-3 animate-rise delay-1", sidebarCollapsed ? "px-2" : "px-3")}>
            <SidebarTip label={`${t("search.title")} · ${formatShortcut(searchShortcut)}`} collapsed={sidebarCollapsed}>
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label={t("search.title")}
                className={cn(
                  "glass-card flex w-full items-center rounded-xl text-xs text-fg-faint transition-colors duration-150 hover:text-fg-muted",
                  sidebarCollapsed ? "justify-center px-0 py-2.5" : "justify-between px-3 py-2",
                )}
              >
                <span className="flex items-center gap-1.5">
                  <Search className="size-3.5" />
                  {sidebarCollapsed ? null : t("search.title")}
                </span>
                {sidebarCollapsed ? null : <Kbd>{formatShortcut(searchShortcut)}</Kbd>}
              </button>
            </SidebarTip>
          </div>

          <nav className="flex flex-col gap-0.5 px-2.5">
            {NAV_ITEMS.map((item, index) => {
              const active =
                item.to === "/"
                  ? pathname === "/"
                  : item.to === "/gallery"
                    ? pathname.startsWith("/gallery") || pathname.startsWith("/dev/gallery")
                    : pathname.startsWith(item.to);
              const label = t(item.key);
              return (
                <SidebarTip key={item.to} label={label} collapsed={sidebarCollapsed}>
                  <Link
                    to={item.to}
                    aria-label={label}
                    className={navClass(active, index, sidebarCollapsed)}
                  >
                    <item.icon className={cn("size-4 shrink-0", active ? "text-accent" : undefined)} />
                    {sidebarCollapsed ? null : label}
                  </Link>
                </SidebarTip>
              );
            })}
          </nav>

          <div className="mt-auto flex flex-col gap-0.5 px-2.5 pb-3">
            <button
              type="button"
              aria-expanded={!sidebarCollapsed}
              aria-label={sidebarCollapsed ? t("nav.expand") : t("nav.collapse")}
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={navClass(false, 4, sidebarCollapsed)}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="size-4 shrink-0" />
              ) : (
                <PanelLeftClose className="size-4 shrink-0" />
              )}
              {sidebarCollapsed ? null : t("nav.collapse")}
            </button>
            <SidebarTip label={t("nav.settings")} collapsed={sidebarCollapsed}>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                aria-label={t("nav.settings")}
                className={navClass(settingsOpen, 4, sidebarCollapsed)}
              >
                <Settings className={cn("size-4 shrink-0", settingsOpen ? "text-accent" : undefined)} />
                {sidebarCollapsed ? null : t("nav.settings")}
              </button>
            </SidebarTip>
          </div>
        </aside>

        <main className="glass-panel relative h-full min-h-0 min-w-0 overflow-hidden rounded-xl">
          <div key={pathname} className="h-full overflow-hidden animate-page">
            <Outlet />
          </div>
        </main>
      </SplitPane>

      <footer className="mx-3 mb-3 flex h-8 shrink-0 items-center gap-4 rounded-xl border border-line bg-glass px-4 text-xs text-fg-muted backdrop-blur-md">
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
      <SettingsDialog />
    </div>
  );
}

function SidebarTip({
  label,
  collapsed,
  children,
}: {
  label: string;
  collapsed: boolean;
  children: ReactNode;
}) {
  if (!collapsed) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
