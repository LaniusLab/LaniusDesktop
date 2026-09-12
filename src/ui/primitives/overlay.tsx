import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface OverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  /** Accessible title; rendered sr-only when callers don't supply a visible heading. */
  title: string;
  className?: string;
  panelClassName?: string;
}

/**
 * Lightweight modal layer: portal + backdrop + focus trap + Escape.
 * Intentionally not Dialog/Radix — Global Search needs a full-window palette without Dialog semantics.
 * Invariant: body scroll locks while open; focus restores to the previous element on close.
 */
export function Overlay({
  open,
  onOpenChange,
  children,
  title,
  className,
  panelClassName,
}: OverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onOpenChange(false);
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const nodes = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (node) => !node.hasAttribute("disabled") && node.tabIndex !== -1,
      );
      if (nodes.length === 0) {
        event.preventDefault();
        return;
      }
      const firstNode = nodes[0];
      const lastNode = nodes[nodes.length - 1];
      if (!firstNode || !lastNode) return;
      if (event.shiftKey && document.activeElement === firstNode) {
        event.preventDefault();
        lastNode.focus();
      } else if (!event.shiftKey && document.activeElement === lastNode) {
        event.preventDefault();
        firstNode.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [open, onOpenChange]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className={cn("fixed inset-0 z-50", className)} data-slot="overlay">
      <button
        type="button"
        tabIndex={-1}
        aria-label={title}
        className="absolute inset-0 bg-bg/70 backdrop-blur-sm animate-fade"
        onClick={() => onOpenChange(false)}
      />
      <div className="pointer-events-none relative flex h-full justify-center px-4 pt-[14vh]">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={cn(
            "pointer-events-auto w-full max-w-xl overflow-hidden rounded-lg border border-line bg-surface shadow-float animate-pop",
            panelClassName,
          )}
        >
          <h2 id={titleId} className="sr-only">
            {title}
          </h2>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
