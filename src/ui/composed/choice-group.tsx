import { cn } from "@/lib/utils";

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

export interface ChoiceGroupProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<ChoiceOption<T>>;
  columns?: 2 | 3 | 4;
  "aria-label"?: string;
}

export function ChoiceGroup<T extends string>({
  value,
  onChange,
  options,
  columns = 3,
  "aria-label": ariaLabel,
}: ChoiceGroupProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "grid gap-2",
        columns === 2 && "grid-cols-2",
        columns === 3 && "sm:grid-cols-3",
        columns === 4 && "grid-cols-2 sm:grid-cols-4",
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "hover-lift rounded-lg border px-3 py-2.5 text-left",
              selected
                ? "border-accent bg-surface-raised shadow-float"
                : "border-line bg-surface hover:border-accent/40 hover:bg-surface-raised",
            )}
          >
            <span className="block text-sm text-fg">{option.label}</span>
            {option.description ? (
              <span className="mt-0.5 block text-xs leading-relaxed text-fg-muted">
                {option.description}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
