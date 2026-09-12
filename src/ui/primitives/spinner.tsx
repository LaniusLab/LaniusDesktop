import { Primitive } from "@radix-ui/react-primitive";

import { cn } from "@/lib/utils";

export interface SpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
}

const SIZE = {
  sm: "size-4 border-2",
  md: "size-8 border-2",
  lg: "size-10 border-2",
} as const;

export function Spinner({ className, size = "md", label }: SpinnerProps) {
  return (
    <Primitive.span
      role="status"
      aria-label={label}
      className={cn(
        "inline-block rounded-full border-line border-t-accent animate-spin-ring",
        SIZE[size],
        className,
      )}
    />
  );
}
