import { CircleAlert } from "lucide-react";

import { useT } from "@/stores/ui";

import { Button } from "../primitives/button";

interface ErrorStateProps {
  title: string;
  description?: string;
  traceId?: string;
  onRetry?: () => void;
}

/** 页面级错误态；traceId 供排障复制，见 docs/PROTOCOL.md §5 */
export function ErrorState({ title, description, traceId, onRetry }: ErrorStateProps) {
  const t = useT();
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 p-8 text-center animate-pop">
      <div className="flex size-12 items-center justify-center rounded-full bg-danger/10 text-danger">
        <CircleAlert className="size-6" />
      </div>
      <div>
        <p className="text-sm font-medium text-fg">{title}</p>
        {description ? <p className="mt-1 max-w-sm text-sm text-fg-muted">{description}</p> : null}
        {traceId ? (
          <p className="mt-2 font-mono text-xs text-fg-faint select-all">traceId: {traceId}</p>
        ) : null}
      </div>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {t("common.retry")}
        </Button>
      ) : null}
    </div>
  );
}
