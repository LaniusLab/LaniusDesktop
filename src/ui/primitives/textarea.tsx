import * as React from "react";

import { cn } from "@/lib/utils";

/** `@radix-ui/react-primitive` 节点表不含 textarea，保持原生元素。 */
export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-24 w-full resize-y rounded-lg border border-line bg-surface-sunken/80 px-3 py-2 text-sm text-fg shadow-inset",
      "placeholder:text-fg-faint focus-visible:border-accent focus-visible:bg-surface-raised focus-visible:outline-2 focus-visible:outline-accent",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
