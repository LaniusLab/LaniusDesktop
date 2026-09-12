import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SettingRowProps {
  label: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/** Horizontal label/description + control row used by Settings behavior/shortcuts tabs. */
export function SettingRow({ label, description, children, className }: SettingRowProps) {
  return (
    <div
      className={cn(
        "glass-card flex items-start justify-between gap-4 rounded-xl px-4 py-3",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-sm text-fg">{label}</p>
        {description ? <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">{description}</p> : null}
      </div>
      <div className="flex shrink-0 items-center">{children}</div>
    </div>
  );
}
