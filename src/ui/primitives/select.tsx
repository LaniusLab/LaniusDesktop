import { Primitive } from "@radix-ui/react-primitive";
import * as React from "react";

import { cn } from "@/lib/utils";

export const Select = React.forwardRef<
  React.ComponentRef<typeof Primitive.select>,
  React.ComponentPropsWithoutRef<typeof Primitive.select>
>(({ className, children, ...props }, ref) => (
  <Primitive.select
    ref={ref}
    className={cn(
      "h-9 rounded-lg border border-line bg-surface-sunken/80 px-3 text-sm text-fg shadow-inset",
      "focus-visible:border-accent focus-visible:bg-surface-raised focus-visible:outline-2 focus-visible:outline-accent",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    {children}
  </Primitive.select>
));
Select.displayName = "Select";
