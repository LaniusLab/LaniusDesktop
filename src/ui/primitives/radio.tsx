import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface RadioGroupProps {
  value: string;
  onValueChange: (value: string) => void;
  name?: string;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}

export function RadioGroup({
  value,
  onValueChange,
  name,
  className,
  children,
  "aria-label": ariaLabel,
}: RadioGroupProps) {
  return (
    <RadioGroupPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      name={name}
      aria-label={ariaLabel}
      className={cn("flex flex-col gap-2", className)}
    >
      {children}
    </RadioGroupPrimitive.Root>
  );
}

export interface RadioProps {
  value: string;
  label: string;
  disabled?: boolean;
  className?: string;
}

export function Radio({ value, label, disabled, className }: RadioProps) {
  return (
    <RadioGroupPrimitive.Item
      value={value}
      disabled={disabled}
      className={cn(
        "group flex items-center gap-2.5 text-left text-sm text-fg",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
          "group-data-[state=checked]:border-accent group-data-[state=checked]:bg-accent-soft",
          "group-data-[state=unchecked]:border-line-strong group-data-[state=unchecked]:bg-surface-raised group-data-[state=unchecked]:shadow-inset",
        )}
      >
        <RadioGroupPrimitive.Indicator className="size-2 rounded-full bg-accent" />
      </span>
      {label}
    </RadioGroupPrimitive.Item>
  );
}
