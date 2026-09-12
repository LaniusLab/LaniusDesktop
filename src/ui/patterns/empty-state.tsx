import { Inbox } from "lucide-react";
import * as React from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

/** 列表/页面无数据时的标准空态 */
export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 p-8 text-center animate-pop">
      <div className="flex size-12 items-center justify-center rounded-full bg-surface-raised text-fg-faint">
        {icon ?? <Inbox className="size-6" />}
      </div>
      <div>
        <p className="text-sm font-medium text-fg">{title}</p>
        {description ? <p className="mt-1 max-w-sm text-sm text-fg-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
