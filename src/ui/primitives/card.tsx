import { Primitive } from "@radix-ui/react-primitive";
import * as React from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentPropsWithoutRef<typeof Primitive.div>) {
  return <Primitive.div className={cn("glass-card rounded-xl shadow-soft", className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.ComponentPropsWithoutRef<typeof Primitive.div>) {
  return <Primitive.div className={cn("flex flex-col gap-1 px-5 pt-4", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentPropsWithoutRef<typeof Primitive.h3>) {
  return <Primitive.h3 className={cn("font-display text-base text-fg", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.ComponentPropsWithoutRef<typeof Primitive.p>) {
  return <Primitive.p className={cn("text-xs leading-relaxed text-fg-muted", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.ComponentPropsWithoutRef<typeof Primitive.div>) {
  return <Primitive.div className={cn("px-5 py-4", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.ComponentPropsWithoutRef<typeof Primitive.div>) {
  return <Primitive.div className={cn("flex items-center gap-2 px-5 pb-4", className)} {...props} />;
}
