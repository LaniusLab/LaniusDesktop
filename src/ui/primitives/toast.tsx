import { Primitive } from "@radix-ui/react-primitive";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ToastTone = "info" | "success" | "warning" | "danger";

const TONE: Record<ToastTone, { wrap: string; icon: typeof Info; iconClass: string }> = {
  info: { wrap: "border-info/30 bg-glass-strong", icon: Info, iconClass: "text-info" },
  success: { wrap: "border-success/30 bg-glass-strong", icon: CircleCheck, iconClass: "text-success" },
  warning: { wrap: "border-warning/30 bg-glass-strong", icon: TriangleAlert, iconClass: "text-warning" },
  danger: { wrap: "border-danger/30 bg-glass-strong", icon: CircleAlert, iconClass: "text-danger" },
};

export interface ToastProps {
  title: string;
  description?: ReactNode;
  tone?: ToastTone;
  onClose?: () => void;
  closeLabel?: string;
  className?: string;
}

export function Toast({
  title,
  description,
  tone = "info",
  onClose,
  closeLabel = "关闭",
  className,
}: ToastProps) {
  const meta = TONE[tone];
  const Icon = meta.icon;

  return (
    <Primitive.div
      role="status"
      className={cn(
        "glass-card flex w-full max-w-sm gap-3 rounded-xl border px-3 py-2.5 shadow-float",
        meta.wrap,
        className,
      )}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", meta.iconClass)} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-fg">{title}</p>
        {description ? <div className="mt-0.5 text-xs leading-relaxed text-fg-muted">{description}</div> : null}
      </div>
      {onClose ? (
        <Primitive.button
          type="button"
          aria-label={closeLabel}
          onClick={onClose}
          className={cn(
            "inline-flex size-6 shrink-0 items-center justify-center rounded-md text-fg-muted",
            "hover:bg-fg/8 hover:text-fg",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          )}
        >
          <X className="size-3.5" />
        </Primitive.button>
      ) : null}
    </Primitive.div>
  );
}

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone?: ToastTone;
}

export interface ToastStackProps {
  items: ReadonlyArray<ToastItem>;
  onDismiss: (id: string) => void;
  dismissLabel?: string;
  className?: string;
}

export function ToastStack({ items, onDismiss, dismissLabel, className }: ToastStackProps) {
  if (items.length === 0) return null;

  return (
    <Primitive.div className={cn("flex flex-col gap-2", className)}>
      {items.map((item) => (
        <Toast
          key={item.id}
          title={item.title}
          description={item.description}
          tone={item.tone}
          closeLabel={dismissLabel}
          onClose={() => onDismiss(item.id)}
        />
      ))}
    </Primitive.div>
  );
}
