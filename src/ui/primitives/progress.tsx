import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

export interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  label?: string;
}

export function Progress({ value, max = 100, className, label }: ProgressProps) {
  const clamped = Math.min(Math.max(value, 0), max);
  const percent = max === 0 ? 0 : (clamped / max) * 100;

  return (
    <ProgressPrimitive.Root
      value={clamped}
      max={max}
      aria-label={label}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-sunken shadow-inset", className)}
    >
      <ProgressPrimitive.Indicator
        className="h-full rounded-full bg-accent transition-[width] duration-300"
        style={{ width: `${String(percent)}%` }}
      />
    </ProgressPrimitive.Root>
  );
}
