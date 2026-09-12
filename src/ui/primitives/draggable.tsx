import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
} from "react";

import { cn } from "@/lib/utils";

export interface DragOffset {
  x: number;
  y: number;
}

export interface UseDraggableOptions {
  enabled?: boolean;
  /**
   * Inset from the app viewport when clamping.
   * Default 0 keeps the entire node inside the current window.
   */
  edge?: number;
}

export interface DraggableHandleProps {
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
}

export interface UseDraggableResult {
  offset: DragOffset;
  dragging: boolean;
  setNodeRef: (node: HTMLElement | null) => void;
  handleProps: DraggableHandleProps;
  style: CSSProperties;
}

const IGNORE_DRAG = "button, a, input, textarea, select, [role='tab'], [role='switch'], [data-no-drag]";

function isIgnoredTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(IGNORE_DRAG));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Keep `size` inside `viewport` with `inset` padding. Oversized nodes pin to the start inset. */
function clampAxis(proposed: number, size: number, viewport: number, inset: number): number {
  const min = inset;
  const max = viewport - size - inset;
  if (max < min) return inset;
  return clamp(proposed, min, max);
}

/**
 * Pointer-based drag for any positioned node.
 * Put `setNodeRef` on the moving element and `handleProps` on the grab surface.
 */
export function useDraggable(options: UseDraggableOptions = {}): UseDraggableResult {
  const { enabled = true, edge = 0 } = options;
  const nodeRef = useRef<HTMLElement | null>(null);
  const offsetRef = useRef<DragOffset>({ x: 0, y: 0 });
  const sessionRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [offset, setOffset] = useState<DragOffset>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const commitOffset = useCallback((next: DragOffset) => {
    offsetRef.current = next;
    setOffset(next);
  }, []);

  const setNodeRef = useCallback((node: HTMLElement | null) => {
    nodeRef.current = node;
  }, []);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled || event.button > 0 || isIgnoredTarget(event.target)) return;
      sessionRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: offsetRef.current.x,
        originY: offsetRef.current.y,
      };
      setDragging(true);
      if (event.cancelable) event.preventDefault();
      event.stopPropagation();
      if (typeof event.currentTarget.setPointerCapture === "function") {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    },
    [enabled],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const session = sessionRef.current;
      const node = nodeRef.current;
      if (!session || !node) return;
      if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;
      const nextX = session.originX + event.clientX - session.startX;
      const nextY = session.originY + event.clientY - session.startY;
      const rect = node.getBoundingClientRect();
      const current = offsetRef.current;
      const proposedLeft = rect.left + (nextX - current.x);
      const proposedTop = rect.top + (nextY - current.y);
      const clampedLeft = clampAxis(proposedLeft, rect.width, window.innerWidth, edge);
      const clampedTop = clampAxis(proposedTop, rect.height, window.innerHeight, edge);
      commitOffset({
        x: nextX + (clampedLeft - proposedLeft),
        y: nextY + (clampedTop - proposedTop),
      });
    },
    [commitOffset, edge],
  );

  useEffect(() => {
    if (!enabled) return;
    const onResize = () => {
      const node = nodeRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const current = offsetRef.current;
      const clampedLeft = clampAxis(rect.left, rect.width, window.innerWidth, edge);
      const clampedTop = clampAxis(rect.top, rect.height, window.innerHeight, edge);
      if (clampedLeft === rect.left && clampedTop === rect.top) return;
      commitOffset({
        x: current.x + (clampedLeft - rect.left),
        y: current.y + (clampedTop - rect.top),
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [commitOffset, edge, enabled]);

  const onPointerUp = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!sessionRef.current) return;
    sessionRef.current = null;
    setDragging(false);
    if (typeof event.currentTarget.releasePointerCapture === "function") {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // jsdom / already released
      }
    }
  }, []);

  const handleProps = useMemo<DraggableHandleProps>(
    () => ({ onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp }),
    [onPointerDown, onPointerMove, onPointerUp],
  );

  const style = useMemo<CSSProperties>(
    () => ({
      transform: `translate(${String(offset.x)}px, ${String(offset.y)}px)`,
    }),
    [offset.x, offset.y],
  );

  return { offset, dragging, setNodeRef, handleProps, style };
}

const DraggableContext = createContext<UseDraggableResult | null>(null);

export function useDraggableContext(): UseDraggableResult | null {
  return useContext(DraggableContext);
}

export interface DraggableProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  enabled?: boolean;
  edge?: number;
  children: ReactNode;
}

/** Drop-in wrapper: the root is both the moving node and the handle. */
export function Draggable({
  enabled = true,
  edge,
  className,
  style,
  children,
  ...props
}: DraggableProps) {
  const drag = useDraggable({ enabled, edge });

  return (
    <DraggableContext.Provider value={drag}>
      <div
        ref={drag.setNodeRef}
        data-dragging={drag.dragging ? "true" : undefined}
        className={cn(enabled && "touch-none", className)}
        style={{ ...drag.style, ...style }}
        {...(enabled ? drag.handleProps : {})}
        {...props}
      >
        {children}
      </div>
    </DraggableContext.Provider>
  );
}

export interface DraggableHandleSlotProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/** Grab surface when the moving node should not start a drag itself. */
export function DraggableHandle({ className, children, ...props }: DraggableHandleSlotProps) {
  const drag = useDraggableContext();
  return (
    <div
      className={cn(drag ? "cursor-grab active:cursor-grabbing" : undefined, className)}
      {...(drag?.handleProps ?? {})}
      {...props}
    >
      {children}
    </div>
  );
}

export function mergeRefs<T>(...refs: Array<Ref<T> | undefined>): (node: T | null) => void {
  return (node) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") {
        ref(node);
      } else {
        ref.current = node;
      }
    }
  };
}
