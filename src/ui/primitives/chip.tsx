import { Primitive } from "@radix-ui/react-primitive";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface ChipProps {
  children: ReactNode;
  selected?: boolean;
  onSelect?: () => void;
  onRemove?: () => void;
  removeLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function Chip({
  children,
  selected = false,
  onSelect,
  onRemove,
  removeLabel = "移除",
  disabled,
  className,
}: ChipProps) {
  return (
    <Primitive.span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
        selected
          ? "border-accent bg-accent-soft text-accent"
          : "border-line bg-surface-raised text-fg-muted",
        disabled && "opacity-50",
        className,
      )}
    >
      {onSelect ? (
        <Primitive.button
          type="button"
          aria-pressed={selected}
          disabled={disabled}
          onClick={onSelect}
          className="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed"
        >
          {children}
        </Primitive.button>
      ) : (
        children
      )}
      {onRemove ? (
        <Primitive.button
          type="button"
          aria-label={removeLabel}
          disabled={disabled}
          onClick={onRemove}
          className={cn(
            "inline-flex size-4 items-center justify-center rounded-full",
            "hover:bg-fg/8 hover:text-fg",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            "disabled:pointer-events-none",
          )}
        >
          <X className="size-3" />
        </Primitive.button>
      ) : null}
    </Primitive.span>
  );
}
