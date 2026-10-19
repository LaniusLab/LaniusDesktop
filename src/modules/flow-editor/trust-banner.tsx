import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { bridge } from "@/lib/bridge";
import { editorToFlowFile, useEditorStore } from "@/stores/editor";
import { useT } from "@/stores/ui";
import { Button } from "@/ui";

/**
 * 未信任流程提示（SECURITY.md §4）：打开即可见；可显式标记可信。
 * 关闭仅本会话隐藏；内容变更后哈希失配会再次出现。
 */
export function TrustBanner() {
  const t = useT();
  const queryClient = useQueryClient();
  const dirty = useEditorStore((s) => s.dirty);
  const flowId = useEditorStore((s) => s.flowId);
  const steps = useEditorStore((s) => s.steps);
  const processId = useEditorStore((s) => s.processId);
  const [dismissedHash, setDismissedHash] = useState<string | null>(null);

  const inspectQuery = useQuery({
    queryKey: ["flowInspect", flowId, dirty, steps, processId],
    queryFn: () => bridge.flowInspect(editorToFlowFile()),
  });

  const contentHash = inspectQuery.data?.contentHash;
  const trustQuery = useQuery({
    queryKey: ["trustCheck", flowId, contentHash],
    enabled: Boolean(contentHash),
    queryFn: () => {
      if (!contentHash) {
        throw new Error("missing contentHash");
      }
      return bridge.trustCheck(flowId, contentHash);
    },
  });

  useEffect(() => {
    setDismissedHash(null);
  }, [contentHash]);

  const mark = useMutation({
    mutationFn: async () => {
      if (!contentHash) {
        throw new Error("missing contentHash");
      }
      return bridge.trustMark(flowId, contentHash);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["trustCheck"] });
    },
  });

  if (inspectQuery.isPending || trustQuery.isPending) return null;
  if (!inspectQuery.data || !trustQuery.data) return null;
  if (trustQuery.data.trusted) return null;
  if (dismissedHash === contentHash) return null;

  const destructive = inspectQuery.data.dangerousSteps.filter(
    (s) => s.dangerLevel === "destructive",
  ).length;

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 border-b border-warning/40 bg-warning/10 px-3 py-2 text-xs text-fg"
      role="status"
    >
      <span>
        {destructive > 0
          ? t("trust.banner.untrustedDanger", { n: destructive })
          : t("trust.banner.untrusted")}
      </span>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={mark.isPending || !contentHash}
          onClick={() => mark.mutate()}
        >
          {t("trust.banner.mark")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (contentHash) setDismissedHash(contentHash);
          }}
        >
          {t("trust.banner.dismiss")}
        </Button>
      </div>
    </div>
  );
}
