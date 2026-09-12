import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

interface TabsProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  items: ReadonlyArray<{ value: T; label: string }>;
  className?: string;
}

export function Tabs<T extends string>({ value, onValueChange, items, className }: TabsProps<T>) {
  return (
    <TabsPrimitive.Root
      value={value}
      onValueChange={(next) => {
        onValueChange(next as T);
      }}
    >
      <TabsPrimitive.List
        className={cn(
          "flex flex-wrap gap-1 rounded-xl border border-line bg-surface-sunken/70 p-1 shadow-inset",
          className,
        )}
      >
        {items.map((item) => (
          <TabsPrimitive.Trigger
            key={item.value}
            value={item.value}
            onClick={() => onValueChange(item.value)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm transition-all duration-200",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              "data-[state=active]:bg-surface-raised data-[state=active]:text-fg data-[state=active]:shadow-soft",
              "data-[state=inactive]:text-fg-muted data-[state=inactive]:hover:bg-fg/5 data-[state=inactive]:hover:text-fg",
            )}
          >
            {item.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
    </TabsPrimitive.Root>
  );
}
