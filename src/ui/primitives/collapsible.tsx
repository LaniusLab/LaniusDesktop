import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface CollapsibleProps {
  title: string;
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export function Collapsible({
  title,
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  className,
}: CollapsibleProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const expanded = open ?? uncontrolled;

  const setExpanded = (next: boolean) => {
    if (open === undefined) setUncontrolled(next);
    onOpenChange?.(next);
  };

  return (
    <CollapsiblePrimitive.Root
      open={expanded}
      onOpenChange={setExpanded}
      className={cn("rounded-xl border border-line bg-surface-raised/70", className)}
    >
      <CollapsiblePrimitive.Trigger
        className={cn(
          "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-medium text-fg",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        )}
      >
        {title}
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-fg-muted transition-transform duration-200",
            expanded && "rotate-180",
          )}
        />
      </CollapsiblePrimitive.Trigger>
      <CollapsiblePrimitive.Content
        forceMount
        hidden={!expanded}
        className="border-t border-line px-3 py-2 text-sm text-fg-muted"
      >
        {children}
      </CollapsiblePrimitive.Content>
    </CollapsiblePrimitive.Root>
  );
}
