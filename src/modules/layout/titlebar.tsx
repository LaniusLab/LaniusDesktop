import { Copy, Minus, Moon, Settings, Square, Sun, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { bridge } from "@/lib/bridge";
import { isApplePlatform } from "@/lib/shortcut";
import { cn } from "@/lib/utils";
import { useT, useUiStore } from "@/stores/ui";

/** 自定义顶栏：无边框窗口靠 data-tauri-drag-region 拖动；关闭走壳的 closeBehavior。
 * Windows 用右侧 CaptionButton；Apple 用左侧 TrafficLights（布局镜像）。
 * 主题快捷切换在设置左侧；设置打开 Dialog。
 * 五个 CaptionButton 用 pointer；设置 / 主题只改图标色，不铺 hover 底。
 */
export function Titlebar() {
  const t = useT();
  const apple = isApplePlatform();
  const [maximized, setMaximized] = useState(false);
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen);
  const resolvedTheme = useUiStore((s) => s.resolvedTheme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);

  useEffect(() => {
    let cancelled = false;
    const sync = () => {
      void bridge.windowIsMaximized().then((value) => {
        if (!cancelled) setMaximized(value);
      });
    };
    sync();
    window.addEventListener("resize", sync);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", sync);
    };
  }, []);

  const toggleMaximize = () => {
    void bridge.windowToggleMaximize().then(() => {
      void bridge.windowIsMaximized().then(setMaximized);
    });
  };

  const themeButton = (
    <CaptionButton
      label={t("titlebar.theme")}
      tone="accent"
      pressed={resolvedTheme === "dark"}
      onClick={toggleTheme}
    >
      {resolvedTheme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
    </CaptionButton>
  );

  const settingsButton = (
    <CaptionButton
      label={t("titlebar.settings")}
      tone="accent"
      onClick={() => setSettingsOpen(true)}
    >
      <Settings className="size-3.5" />
    </CaptionButton>
  );

  return (
    <header className="relative flex h-10 shrink-0 select-none items-stretch bg-glass backdrop-blur-md">
      <div className="pointer-events-none absolute inset-0 border-b border-line" />
      <div className="pointer-events-none absolute inset-x-16 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/35 to-transparent" />
      {apple ? (
        <TrafficLights
          maximized={maximized}
          onClose={() => void bridge.windowClose()}
          onMinimize={() => void bridge.windowMinimize()}
          onToggleMaximize={toggleMaximize}
        />
      ) : (
        <div className="w-2 shrink-0" data-tauri-drag-region="" />
      )}

      <div
        className="app-drag flex min-w-0 flex-1 items-center px-3"
        data-tauri-drag-region=""
        onDoubleClick={toggleMaximize}
      >
        <span className="pointer-events-none font-display text-xs tracking-[0.22em] text-fg-faint">
          {t("brand.name")}
        </span>
      </div>

      {apple ? (
        <div className="flex">
          {themeButton}
          {settingsButton}
        </div>
      ) : (
        <div className="flex">
          {themeButton}
          {settingsButton}
          <CaptionButton label={t("titlebar.minimize")} onClick={() => void bridge.windowMinimize()}>
            <Minus className="size-3.5" />
          </CaptionButton>
          <CaptionButton
            label={maximized ? t("titlebar.restore") : t("titlebar.maximize")}
            onClick={toggleMaximize}
          >
            {maximized ? <Copy className="size-3" /> : <Square className="size-3" />}
          </CaptionButton>
          <CaptionButton
            label={t("titlebar.close")}
            onClick={() => void bridge.windowClose()}
            danger
          >
            <X className="size-3.5" />
          </CaptionButton>
        </div>
      )}
    </header>
  );
}

function CaptionButton({
  label,
  onClick,
  children,
  danger = false,
  pressed,
  tone = "chrome",
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
  pressed?: boolean;
  tone?: "chrome" | "accent";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "app-no-drag inline-flex h-full w-11 cursor-pointer items-center justify-center text-fg-muted transition-colors duration-200",
        tone === "accent" && "hover:text-accent",
        tone === "chrome" && !danger && "hover:bg-fg/5 hover:text-fg",
        danger && "hover:bg-danger hover:text-accent-fg",
      )}
    >
      {children}
    </button>
  );
}

function TrafficLights({
  maximized,
  onClose,
  onMinimize,
  onToggleMaximize,
}: {
  maximized: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
}) {
  const t = useT();
  return (
    <div className="app-no-drag group/lights flex items-center gap-2 px-3">
      <TrafficDot
        label={t("titlebar.close")}
        tone="bg-danger"
        onClick={onClose}
        icon={<X className="size-2" />}
      />
      <TrafficDot
        label={t("titlebar.minimize")}
        tone="bg-warning"
        onClick={onMinimize}
        icon={<Minus className="size-2" />}
      />
      <TrafficDot
        label={maximized ? t("titlebar.restore") : t("titlebar.maximize")}
        tone="bg-success"
        onClick={onToggleMaximize}
        icon={<Square className="size-1.5" />}
      />
    </div>
  );
}

function TrafficDot({
  label,
  tone,
  onClick,
  icon,
}: {
  label: string;
  tone: "bg-danger" | "bg-warning" | "bg-success";
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "relative flex size-3 items-center justify-center rounded-full transition-transform duration-150 hover:scale-110",
        tone,
      )}
    >
      <span className="text-accent-fg opacity-0 transition-opacity duration-150 group-hover/lights:opacity-100">
        {icon}
      </span>
    </button>
  );
}
