import * as TogglePrimitive from "@radix-ui/react-toggle";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import * as React from "react";

import { cn } from "@/lib/utils";

const toggleClassName = (className?: string) =>
  cn(
    "inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-all duration-150",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "data-[state=on]:border-accent data-[state=on]:bg-accent-soft data-[state=on]:text-accent data-[state=on]:shadow-stamp",
    "data-[state=off]:border-line data-[state=off]:bg-surface-raised data-[state=off]:text-fg-muted data-[state=off]:hover:border-line-strong data-[state=off]:hover:text-fg",
    className,
  );

export interface ToggleProps
  extends Omit<React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root>, "pressed" | "onPressedChange"> {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
}

export const Toggle = React.forwardRef<React.ComponentRef<typeof TogglePrimitive.Root>, ToggleProps>(
  ({ pressed, onPressedChange, className, ...props }, ref) => (
    <TogglePrimitive.Root
      ref={ref}
      pressed={pressed}
      onPressedChange={onPressedChange}
      className={toggleClassName(className)}
      {...props}
    />
  ),
);
Toggle.displayName = "Toggle";

export interface ToggleOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface ToggleGroupBase<T extends string> {
  items: ReadonlyArray<ToggleOption<T>>;
  className?: string;
  "aria-label"?: string;
}

export interface ToggleGroupSingleProps<T extends string> extends ToggleGroupBase<T> {
  type?: "single";
  value: T | null;
  onValueChange: (value: T | null) => void;
}

export interface ToggleGroupMultipleProps<T extends string> extends ToggleGroupBase<T> {
  type: "multiple";
  value: readonly T[];
  onValueChange: (value: T[]) => void;
}

export type ToggleGroupProps<T extends string> = ToggleGroupSingleProps<T> | ToggleGroupMultipleProps<T>;

export function ToggleGroup<T extends string>(props: ToggleGroupProps<T>) {
  const { items, className, "aria-label": ariaLabel } = props;

  if (props.type === "multiple") {
    return (
      <ToggleGroupPrimitive.Root
        type="multiple"
        value={[...props.value]}
        onValueChange={(next) => props.onValueChange(next as T[])}
        aria-label={ariaLabel}
        className={cn("flex flex-wrap gap-1.5", className)}
      >
        {items.map((item) => (
          <ToggleGroupPrimitive.Item
            key={item.value}
            value={item.value}
            disabled={item.disabled}
            className={toggleClassName()}
          >
            {item.label}
          </ToggleGroupPrimitive.Item>
        ))}
      </ToggleGroupPrimitive.Root>
    );
  }

  return (
    <ToggleGroupPrimitive.Root
      type="single"
      value={props.value ?? ""}
      onValueChange={(next) => props.onValueChange(next === "" ? null : (next as T))}
      aria-label={ariaLabel}
      className={cn("flex flex-wrap gap-1.5", className)}
    >
      {items.map((item) => (
        <ToggleGroupPrimitive.Item
          key={item.value}
          value={item.value}
          disabled={item.disabled}
          className={toggleClassName()}
        >
          {item.label}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  );
}
