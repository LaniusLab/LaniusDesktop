import { Slot } from "@radix-ui/react-slot";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * 对齐 Radix Themes `Kbd`：默认 `<kbd>`，`asChild` 经 Slot 合成。
 * @see https://github.com/radix-ui/themes/blob/main/packages/radix-ui-themes/src/components/kbd.tsx
 */
export interface KbdProps extends React.ComponentPropsWithoutRef<"kbd"> {
  asChild?: boolean;
}

export const Kbd = React.forwardRef<HTMLElement, KbdProps>(
  ({ asChild = false, className, ...props }, ref) => {
    const Comp = asChild ? Slot : "kbd";
    return <Comp ref={ref} className={cn("ui-kbd", className)} {...props} />;
  },
);
Kbd.displayName = "Kbd";
