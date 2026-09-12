import { Slot } from "@radix-ui/react-slot";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

interface ContextMenuValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  point: { x: number; y: number };
  setPoint: (point: { x: number; y: number }) => void;
  contentId: string;
}

const ContextMenuContext = createContext<ContextMenuValue | null>(null);

function useContextMenu(): ContextMenuValue {
  const ctx = useContext(ContextMenuContext);
  if (!ctx) {
    throw new Error("ContextMenu 子组件必须放在 ContextMenu 内");
  }
  return ctx;
}

export interface ContextMenuProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

/** 自研右键菜单，避免再引入 Radix Context Menu。 */
export function ContextMenu({ open, onOpenChange, children }: ContextMenuProps) {
  const [uncontrolled, setUncontrolled] = useState(false);
  const [point, setPoint] = useState({ x: 0, y: 0 });
  const contentId = useId();
  const resolved = open ?? uncontrolled;

  const setOpen = useCallback(
    (next: boolean) => {
      if (open === undefined) setUncontrolled(next);
      onOpenChange?.(next);
    },
    [open, onOpenChange],
  );

  return (
    <ContextMenuContext.Provider value={{ open: resolved, setOpen, point, setPoint, contentId }}>
      {children}
    </ContextMenuContext.Provider>
  );
}

export interface ContextMenuTriggerProps extends HTMLAttributes<HTMLElement> {
  asChild?: boolean;
}

export function ContextMenuTrigger({
  asChild = false,
  className,
  children,
  onContextMenu,
  onKeyDown,
  ...props
}: ContextMenuTriggerProps) {
  const menu = useContextMenu();
  const Comp = asChild ? Slot : "div";

  const openAt = (x: number, y: number) => {
    menu.setPoint({ x, y });
    menu.setOpen(true);
  };

  const handleContextMenu = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    onContextMenu?.(event);
    openAt(event.clientX, event.clientY);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    onKeyDown?.(event);
    if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      openAt(rect.left + 8, rect.bottom);
    }
  };

  return (
    <Comp
      aria-haspopup="menu"
      aria-expanded={menu.open}
      aria-controls={menu.contentId}
      tabIndex={asChild ? undefined : 0}
      className={className}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {children}
    </Comp>
  );
}

export interface ContextMenuContentProps {
  children: ReactNode;
  className?: string;
}

export function ContextMenuContent({ children, className }: ContextMenuContentProps) {
  const menu = useContextMenu();
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const place = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    const pad = 8;
    const left = Math.min(Math.max(pad, menu.point.x), Math.max(pad, window.innerWidth - width - pad));
    const top = Math.min(Math.max(pad, menu.point.y), Math.max(pad, window.innerHeight - height - pad));
    setCoords({ top, left });
  }, [menu.point.x, menu.point.y]);

  useLayoutEffect(() => {
    if (!menu.open) return;
    place();
    const first = panelRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])');
    first?.focus();
  }, [menu.open, place]);

  useEffect(() => {
    if (!menu.open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target)) return;
      menu.setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        menu.setOpen(false);
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = [...panel.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])')];
      if (items.length === 0) return;
      event.preventDefault();
      const active = document.activeElement;
      const index = items.findIndex((item) => item === active);
      const delta = event.key === "ArrowDown" ? 1 : -1;
      const next = items[(index + delta + items.length) % items.length];
      next?.focus();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [menu, place]);

  if (!menu.open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panelRef}
      id={menu.contentId}
      role="menu"
      style={{ top: coords.top, left: coords.left }}
      className={cn(
        "fixed z-50 min-w-40 overflow-hidden rounded-xl border border-line p-1 shadow-float glass-modal",
        className,
      )}
    >
      {children}
    </div>,
    document.body,
  );
}

export interface ContextMenuItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  onSelect?: () => void;
  tone?: "default" | "danger";
}

export function ContextMenuItem({
  onSelect,
  tone = "default",
  className,
  disabled,
  children,
  ...props
}: ContextMenuItemProps) {
  const menu = useContextMenu();

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onSelect?.();
        menu.setOpen(false);
      }}
      className={cn(
        "flex w-full cursor-pointer items-center rounded-lg px-2.5 py-1.5 text-left text-sm",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        tone === "danger" ? "text-danger hover:bg-danger/8" : "text-fg hover:bg-fg/6",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function ContextMenuSeparator({ className }: { className?: string }) {
  return <div role="separator" className={cn("my-1 h-px bg-line", className)} />;
}
