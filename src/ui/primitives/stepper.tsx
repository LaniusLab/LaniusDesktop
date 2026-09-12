import { Primitive } from "@radix-ui/react-primitive";

import { cn } from "@/lib/utils";

export interface StepperStep {
  label: string;
  description?: string;
}

export interface StepperProps {
  steps: ReadonlyArray<StepperStep>;
  /** 0-based index of the current (in-progress) step. */
  current: number;
  className?: string;
}

export function Stepper({ steps, current, className }: StepperProps) {
  return (
    <Primitive.ol className={cn("flex flex-col gap-3 sm:flex-row sm:items-start", className)}>
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;

        return (
          <Primitive.li key={step.label} className="flex flex-1 items-start gap-3">
            <Primitive.span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                done && "border-success bg-success/10 text-success",
                active && "border-accent bg-accent-soft text-accent shadow-stamp",
                !done && !active && "border-line bg-surface-raised text-fg-faint",
              )}
            >
              {index + 1}
            </Primitive.span>
            <Primitive.div className="min-w-0 flex-1 pb-1">
              <Primitive.p className={cn("text-sm font-medium", active ? "text-fg" : "text-fg-muted")}>
                {step.label}
              </Primitive.p>
              {step.description ? (
                <Primitive.p className="mt-0.5 text-xs text-fg-faint">{step.description}</Primitive.p>
              ) : null}
            </Primitive.div>
          </Primitive.li>
        );
      })}
    </Primitive.ol>
  );
}
