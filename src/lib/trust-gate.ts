import type { Bridge, FlowInspectResult } from "@/lib/bridge";
import type { FlowFile } from "@/lib/gen/flow";
import type { ShellPrefs } from "@/lib/gen/shell-prefs";

export type TrustGateDecision =
  | { ok: true; inspect: FlowInspectResult; trusted: boolean }
  | { ok: false; reason: "blocked" | "cancelled"; message: string; inspect: FlowInspectResult };

/**
 * 运行前信任门闩：blockAllDestructive / 未信任 destructive 确认（SECURITY.md §4–§5）。
 * confirmFn 可注入以便单测。
 */
export async function gateFlowRun(
  bridge: Bridge,
  flow: FlowFile,
  prefs: ShellPrefs,
  confirmFn: (message: string) => boolean = (message) =>
    typeof window !== "undefined" ? window.confirm(message) : false,
): Promise<TrustGateDecision> {
  const inspect = await bridge.flowInspect(flow);
  const destructive = inspect.dangerousSteps.filter((s) => s.dangerLevel === "destructive");

  if (prefs.blockAllDestructive && destructive.length > 0) {
    return {
      ok: false,
      reason: "blocked",
      message: `已禁止 destructive 节点：${destructive.map((s) => s.label).join("、")}`,
      inspect,
    };
  }

  const check = await bridge.trustCheck(inspect.flowId, inspect.contentHash);
  if (check.trusted || destructive.length === 0) {
    return { ok: true, inspect, trusted: check.trusted };
  }

  const lines = destructive.map((s) => `· ${s.label}（${s.type}）`).join("\n");
  const message =
    `此流程未标记为可信，且包含危险步骤：\n${lines}\n\n确认仍要运行？`;
  if (!confirmFn(message)) {
    return {
      ok: false,
      reason: "cancelled",
      message: "已取消运行",
      inspect,
    };
  }
  return { ok: true, inspect, trusted: false };
}
