import * as AvatarPrimitive from "@radix-ui/react-avatar";

import { cn } from "@/lib/utils";

export interface AvatarProps {
  initials: string;
  alt?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE = {
  sm: "size-7 text-xs",
  md: "size-9 text-sm",
  lg: "size-12 text-base",
} as const;

export function Avatar({ initials, alt, size = "md", className }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      role="img"
      aria-label={alt ?? initials}
      className={cn(
        "inline-flex items-center justify-center overflow-hidden rounded-full bg-accent-soft font-display font-medium text-accent shadow-soft",
        SIZE[size],
        className,
      )}
    >
      <AvatarPrimitive.Fallback delayMs={0} className="flex size-full items-center justify-center">
        {initials}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
