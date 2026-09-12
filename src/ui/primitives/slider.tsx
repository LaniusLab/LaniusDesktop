import * as SliderPrimitive from "@radix-ui/react-slider";
import * as React from "react";

import { cn } from "@/lib/utils";

export interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  name?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

export const Slider = React.forwardRef<React.ComponentRef<typeof SliderPrimitive.Root>, SliderProps>(
  ({ value, onValueChange, min = 0, max = 100, step = 1, className, ...props }, ref) => (
    <SliderPrimitive.Root
      ref={ref}
      value={[value]}
      onValueChange={(next) => {
        const resolved = next[0];
        if (resolved !== undefined) onValueChange(resolved);
      }}
      min={min}
      max={max}
      step={step}
      className={cn("relative flex h-6 w-full touch-none items-center select-none", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-surface-sunken shadow-inset">
        <SliderPrimitive.Range className="absolute h-full bg-accent" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block size-4 rounded-full border border-line-strong bg-surface-raised shadow-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none" />
    </SliderPrimitive.Root>
  ),
);
Slider.displayName = "Slider";
