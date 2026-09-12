import {
  Children,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

export type SplitOrientation = "horizontal" | "vertical";
export type SplitPrimary = "first" | "second";

export interface SplitPaneProps {
  orientation?: SplitOrientation;
  /** Which pane `size` describes. Default is the first pane. */
  primary?: SplitPrimary;
  defaultSize?: number;
  size?: number;
  onSizeChange?: (size: number) => void;
  min?: number;
  max?: number;
  minSecond?: number;
  collapsed?: boolean;
  collapsedSize?: number;
  label: string;
  className?: string;
  children: ReactNode;
}

const HANDLE = 12;
const STEP = 16;
const STEP_LARGE = 48;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function clampSplit(
  next: number,
  total: number,
  min: number,
  max: number | undefined,
  minSecond: number,
): number {
  if (total <= 0) return next;
  const usable = Math.max(0, total - HANDLE);
  const maxByContainer = Math.max(min, usable - minSecond);
  const hi = Math.min(max ?? maxByContainer, maxByContainer);
  return clamp(next, Math.min(min, hi), hi);
}

/** Two-pane splitter. Drag or arrow keys resize; collapsed hides the handle. */
export function SplitPane({
  orientation = "horizontal",
  primary = "first",
  defaultSize = 240,
  size: sizeProp,
  onSizeChange,
  min = 160,
  max,
  minSecond = 160,
  collapsed = false,
  collapsedSize = 64,
  label,
  className,
  children,
}: SplitPaneProps) {
  const [first, second] = Children.toArray(children);
  const containerRef = useRef<HTMLDivElement>(null);
  const [uncontrolled, setUncontrolled] = useState(defaultSize);
  const [dragging, setDragging] = useState(false);
  const sessionRef = useRef<{ pointerId: number; start: number; origin: number } | null>(null);
  const stopDragRef = useRef<(() => void) | null>(null);
  const sizeRef = useRef(defaultSize);

  const resolved = collapsed ? collapsedSize : (sizeProp ?? uncontrolled);
  sizeRef.current = resolved;
  const horizontal = orientation === "horizontal";

  const commit = useCallback(
    (next: number) => {
      const node = containerRef.current;
      const total = node
        ? horizontal
          ? node.clientWidth
          : node.clientHeight
        : 0;
      const clamped = clampSplit(next, total, min, max, minSecond);
      if (clamped === sizeRef.current) return;
      if (onSizeChange) onSizeChange(clamped);
      else setUncontrolled(clamped);
    },
    [horizontal, max, min, minSecond, onSizeChange],
  );

  useEffect(() => {
    const node = containerRef.current;
    if (!node || collapsed || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      commit(sizeRef.current);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [collapsed, commit]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (collapsed || event.button === 2) return;
      event.preventDefault();
      const pointerId = event.pointerId;
      const start = horizontal ? event.clientX : event.clientY;
      const origin = sizeRef.current;
      sessionRef.current = { pointerId, start, origin };
      setDragging(true);

      const onMove = (moveEvent: PointerEvent) => {
        if (!sessionRef.current) return;
        const pos = horizontal ? moveEvent.clientX : moveEvent.clientY;
        const delta = pos - start;
        commit(primary === "first" ? origin + delta : origin - delta);
      };
      const onUp = () => {
        if (!sessionRef.current) return;
        stopDragRef.current?.();
      };
      stopDragRef.current?.();
      stopDragRef.current = () => {
        sessionRef.current = null;
        setDragging(false);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        stopDragRef.current = null;
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [collapsed, commit, horizontal, primary],
  );

  useEffect(() => () => stopDragRef.current?.(), []);

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>) => {
      if (collapsed) return;
      const shrink =
        (horizontal && event.key === "ArrowLeft") || (!horizontal && event.key === "ArrowUp");
      const grow =
        (horizontal && event.key === "ArrowRight") || (!horizontal && event.key === "ArrowDown");
      if (!shrink && !grow) return;
      event.preventDefault();
      const step = event.shiftKey ? STEP_LARGE : STEP;
      const signed = grow ? step : -step;
      commit(sizeRef.current + (primary === "first" ? signed : -signed));
    },
    [collapsed, commit, horizontal, primary],
  );

  const firstStyle = paneStyle(horizontal, primary === "first" ? resolved : undefined);
  const secondStyle = paneStyle(horizontal, primary === "second" ? resolved : undefined);

  return (
    <div
      ref={containerRef}
      data-split=""
      data-dragging={dragging ? "true" : undefined}
      className={cn(
        "flex min-h-0 min-w-0",
        horizontal ? "flex-row" : "flex-col",
        dragging && "select-none",
        className,
      )}
    >
      <div data-split-pane="first" className="min-h-0 min-w-0" style={firstStyle}>
        {first}
      </div>
      {collapsed ? (
        <div className="w-3 shrink-0" aria-hidden />
      ) : (
        <div
          role="separator"
          aria-label={label}
          aria-orientation={horizontal ? "vertical" : "horizontal"}
          aria-valuenow={Math.round(resolved)}
          aria-valuemin={min}
          tabIndex={0}
          data-dragging={dragging ? "true" : undefined}
          onPointerDown={onPointerDown}
          onPointerMove={(event) => {
            if (!sessionRef.current) return;
            const pos = horizontal ? event.clientX : event.clientY;
            const delta = pos - sessionRef.current.start;
            commit(primary === "first" ? sessionRef.current.origin + delta : sessionRef.current.origin - delta);
          }}
          onKeyDown={onKeyDown}
          className={cn(
            "group relative flex shrink-0 items-center justify-center",
            "text-fg-faint transition-colors duration-150",
            "hover:text-accent focus-visible:outline-2 focus-visible:outline-accent",
            horizontal ? "w-3 cursor-col-resize" : "h-3 cursor-row-resize",
          )}
        >
          <span
            className={cn(
              "rounded-full bg-line transition-colors duration-150 group-hover:bg-accent group-focus-visible:bg-accent",
              dragging && "bg-accent",
              horizontal ? "h-8 w-1" : "h-1 w-8",
            )}
          />
        </div>
      )}
      <div data-split-pane="second" className="min-h-0 min-w-0" style={secondStyle}>
        {second}
      </div>
    </div>
  );
}

function paneStyle(
  horizontal: boolean,
  size: number | undefined,
): { width?: number; height?: number; flex?: string } {
  if (size === undefined) return { flex: "1 1 0%" };
  return horizontal ? { width: size, flex: "0 0 auto" } : { height: size, flex: "0 0 auto" };
}
