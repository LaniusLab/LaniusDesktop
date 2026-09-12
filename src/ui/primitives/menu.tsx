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
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

interface MenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: RefObject<HTMLElement | null>;
  contentId: string;
}

const MenuContext = createContext<MenuContextValue | null>(null);

function useMenuContext(): MenuContextValue {
  const ctx = useContext(MenuContext);
  if (!ctx) {
    throw new Error("Menu 子组件必须放在 Menu 内");
  }
  return ctx;
}

export interface MenuProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

/** 自研下拉，避免再引入 Radix Dropdown。点击外部与 Escape 关闭。 */
export function Menu({ open, defaultOpen = false, onOpenChange, children }: MenuProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const triggerRef = useRef<HTMLElement | null>(null);
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
    <MenuContext.Provider value={{ open: resolved, setOpen, triggerRef, contentId }}>
      <div className="relative inline-flex">{children}</div>
    </MenuContext.Provider>
  );
}

export interface MenuTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export function MenuTrigger({ asChild = false, className, children, onClick, ...props }: MenuTriggerProps) {
  const menu = useMenuContext();
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      ref={(node) => {
        menu.triggerRef.current = node instanceof HTMLElement ? node : null;
      }}
      type={asChild ? undefined : "button"}
      aria-haspopup="menu"
      aria-expanded={menu.open}
      aria-controls={menu.contentId}
      className={cn(
        !asChild &&
          "inline-flex items-center justify-center rounded-lg border border-line bg-surface-raised px-3 py-1.5 text-sm text-fg hover:border-line-strong",
        !asChild && "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        menu.setOpen(!menu.open);
      }}
      {...props}
    >
      {children}
    </Comp>
  );
}

export interface MenuContentProps {
  children: ReactNode;
  align?: "start" | "end";
  className?: string;
}

export function MenuContent({ children, align = "start", className }: MenuContentProps) {
  const menu = useMenuContext();
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const place = useCallback(() => {
    const trigger = menu.triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;

    const rect = trigger.getBoundingClientRect();
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    const gap = 6;
    const pad = 8;
    let top = rect.bottom + gap;
    if (top + height > window.innerHeight - pad) {
      top = Math.max(pad, rect.top - gap - height);
    }
    let left = align === "end" ? rect.right - width : rect.left;
    left = Math.min(Math.max(pad, left), Math.max(pad, window.innerWidth - width - pad));
    setCoords({ top, left });
  }, [align, menu.triggerRef]);

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
      if (menu.triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      menu.setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        menu.setOpen(false);
        menu.triggerRef.current?.focus();
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

    const onReposition = () => place();

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
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

export interface MenuItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  onSelect?: () => void;
  tone?: "default" | "danger";
}

export function MenuItem({ onSelect, tone = "default", className, disabled, children, ...props }: MenuItemProps) {
  const menu = useMenuContext();

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

export function MenuSeparator({ className }: { className?: string }) {
  return <div role="separator" className={cn("my-1 h-px bg-line", className)} />;
}
