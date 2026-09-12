import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as React from "react";

import { cn } from "@/lib/utils";

export interface SwitchProps
  extends Omit<React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>, "checked" | "onCheckedChange"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export const Switch = React.forwardRef<React.ComponentRef<typeof SwitchPrimitive.Root>, SwitchProps>(
  ({ checked, onCheckedChange, className, ...props }, ref) => (
    <SwitchPrimitive.Root
      ref={ref}
      checked={checked}
      onCheckedChange={onCheckedChange}
      className={cn(
        "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border transition-colors duration-200",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=checked]:shadow-soft",
        "data-[state=unchecked]:border-line data-[state=unchecked]:bg-surface-sunken data-[state=unchecked]:shadow-inset",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-4 rounded-full shadow-soft transition-transform duration-200",
          "data-[state=checked]:translate-x-5 data-[state=checked]:bg-accent-fg",
          "data-[state=unchecked]:translate-x-1 data-[state=unchecked]:bg-fg-muted",
        )}
      />
    </SwitchPrimitive.Root>
  ),
);
Switch.displayName = "Switch";
