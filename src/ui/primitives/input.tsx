import { Primitive } from "@radix-ui/react-primitive";
import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  React.ComponentRef<typeof Primitive.input>,
  React.ComponentPropsWithoutRef<typeof Primitive.input>
>(({ className, type, ...props }, ref) => (
  <Primitive.input
    type={type}
    ref={ref}
    className={cn(
      "flex h-9 w-full rounded-lg border border-line bg-surface-sunken/80 px-3 text-sm text-fg shadow-inset",
      "placeholder:text-fg-faint focus-visible:border-accent focus-visible:bg-surface-raised focus-visible:outline-2 focus-visible:outline-accent",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
