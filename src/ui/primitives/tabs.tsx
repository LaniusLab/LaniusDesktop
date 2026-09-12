import { cn } from "@/lib/utils";

interface TabsProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  items: ReadonlyArray<{ value: T; label: string }>;
  className?: string;
}

export function Tabs<T extends string>({ value, onValueChange, items, className }: TabsProps<T>) {
  return (
    <div
      role="tablist"
      className={cn("flex flex-wrap gap-1 rounded-lg border border-line bg-surface p-1", className)}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onValueChange(item.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-all duration-200",
              active
                ? "bg-surface-raised text-fg shadow-sm"
                : "text-fg-muted hover:bg-surface-raised/60 hover:text-fg",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
