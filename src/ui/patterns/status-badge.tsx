import { useT } from "@/stores/ui";
import { Badge } from "../primitives/badge";

type ExecutionState =
  | "idle"
  | "validating"
  | "running"
  | "paused"
  | "done"
  | "failed"
  | "cancelled";

const STATE_TONE: Record<ExecutionState, "neutral" | "accent" | "success" | "warning" | "danger"> = {
  idle: "neutral",
  validating: "accent",
  running: "accent",
  paused: "warning",
  done: "success",
  failed: "danger",
  cancelled: "warning",
};

/** 执行状态机徽章，状态定义见 docs/ENGINE.md §5.1 */
export function StatusBadge({ state }: { state: ExecutionState }) {
  const t = useT();
  return (
    <Badge tone={STATE_TONE[state]}>
      <span className="size-1.5 rounded-full bg-current" />
      {t(`status.${state}`)}
    </Badge>
  );
}
