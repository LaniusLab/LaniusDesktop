import * as React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

/** 每个页面顶部的统一标题区：标题 + 描述 + 右侧操作位 */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold text-fg">{title}</h1>
        {description ? <p className="mt-0.5 text-sm text-fg-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
