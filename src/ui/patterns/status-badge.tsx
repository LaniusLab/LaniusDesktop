import { Badge } from "@/ui/primitives/badge";

type ExecutionState =
  | "idle"
  | "validating"
  | "running"
  | "paused"
  | "done"
  | "failed"
  | "cancelled";

const STATE_META: Record<ExecutionState, { label: string; tone: "neutral" | "accent" | "success" | "warning" | "danger" }> = {
  idle: { label: "空闲", tone: "neutral" },
  validating: { label: "校验中", tone: "accent" },
  running: { label: "运行中", tone: "accent" },
  paused: { label: "已暂停", tone: "warning" },
  done: { label: "完成", tone: "success" },
  failed: { label: "失败", tone: "danger" },
  cancelled: { label: "已取消", tone: "warning" },
};

/** 执行状态机徽章，状态定义见 docs/ENGINE.md §5.1 */
export function StatusBadge({ state }: { state: ExecutionState }) {
  const meta = STATE_META[state];
  return (
    <Badge tone={meta.tone}>
      <span className="size-1.5 rounded-full bg-current" />
      {meta.label}
    </Badge>
  );
}
