import { Primitive } from "@radix-ui/react-primitive";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type AlertTone = "info" | "success" | "warning" | "danger";

const TONE: Record<AlertTone, { wrap: string; icon: typeof Info }> = {
  info: { wrap: "border-info/30 bg-info/8 text-fg", icon: Info },
  success: { wrap: "border-success/30 bg-success/8 text-fg", icon: CircleCheck },
  warning: { wrap: "border-warning/30 bg-warning/10 text-fg", icon: TriangleAlert },
  danger: { wrap: "border-danger/30 bg-danger/8 text-fg", icon: CircleAlert },
};

const ICON_TONE: Record<AlertTone, string> = {
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

export interface AlertProps {
  tone?: AlertTone;
  title: string;
  children?: ReactNode;
  className?: string;
}

export function Alert({ tone = "info", title, children, className }: AlertProps) {
  const Icon = TONE[tone].icon;
  return (
    <Primitive.div
      role="status"
      className={cn("flex gap-3 rounded-xl border px-4 py-3 backdrop-blur-sm", TONE[tone].wrap, className)}
    >
      <Icon className={cn("mt-0.5 size-4 shrink-0", ICON_TONE[tone])} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-fg">{title}</p>
        {children ? <div className="mt-1 text-xs leading-relaxed text-fg-muted">{children}</div> : null}
      </div>
    </Primitive.div>
  );
}
