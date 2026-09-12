import { Primitive } from "@radix-ui/react-primitive";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: ComponentPropsWithoutRef<typeof Primitive.div>) {
  return (
    <Primitive.div
      aria-hidden
      className={cn(
        "animate-shimmer rounded-md bg-linear-to-r from-surface-sunken via-surface-raised to-surface-sunken",
        className,
      )}
      {...props}
    />
  );
}
