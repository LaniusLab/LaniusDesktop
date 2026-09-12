import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "rounded border border-line bg-surface-raised px-1.5 py-0.5 font-mono text-[11px] text-fg-faint",
        className,
      )}
      {...props}
    />
  );
}
