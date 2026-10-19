import { describe, expect, it, vi } from "vitest";

import type { Bridge } from "@/lib/bridge";
import type { FlowFile } from "@/lib/gen/flow";
import { DEFAULT_PREFS } from "@/lib/prefs";

import { gateFlowRun } from "./trust-gate";

const flow = {
  schemaVersion: 3,
  id: "flow_t",
  name: "t",
  steps: [],
} as FlowFile;

function bridgeStub(partial: Partial<Bridge>): Bridge {
  return partial as Bridge;
}

describe("gateFlowRun", () => {
  it("可信或无危险步骤时放行", async () => {
    const bridge = bridgeStub({
      flowInspect: vi.fn().mockResolvedValue({
        flowId: "flow_t",
        contentHash: "a".repeat(64),
        dangerousSteps: [],
      }),
      trustCheck: vi.fn().mockResolvedValue({
        flowId: "flow_t",
        contentHash: "a".repeat(64),
        trusted: false,
        trustedAt: null,
      }),
    });
    const decision = await gateFlowRun(bridge, flow, DEFAULT_PREFS, () => false);
    expect(decision.ok).toBe(true);
  });

  it("全局禁止 destructive 时阻断", async () => {
    const bridge = bridgeStub({
      flowInspect: vi.fn().mockResolvedValue({
        flowId: "flow_t",
        contentHash: "a".repeat(64),
        dangerousSteps: [
          { nodeId: "w", type: "fs.writeText", dangerLevel: "destructive", label: "写" },
        ],
      }),
      trustCheck: vi.fn(),
    });
    const decision = await gateFlowRun(
      bridge,
      flow,
      { ...DEFAULT_PREFS, blockAllDestructive: true },
      () => true,
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.reason).toBe("blocked");
  });

  it("未信任且有 destructive 时需确认", async () => {
    const bridge = bridgeStub({
      flowInspect: vi.fn().mockResolvedValue({
        flowId: "flow_t",
        contentHash: "a".repeat(64),
        dangerousSteps: [
          { nodeId: "w", type: "fs.writeText", dangerLevel: "destructive", label: "写" },
        ],
      }),
      trustCheck: vi.fn().mockResolvedValue({
        flowId: "flow_t",
        contentHash: "a".repeat(64),
        trusted: false,
        trustedAt: null,
      }),
    });
    const cancelled = await gateFlowRun(bridge, flow, DEFAULT_PREFS, () => false);
    expect(cancelled.ok).toBe(false);
    if (!cancelled.ok) expect(cancelled.reason).toBe("cancelled");

    const ok = await gateFlowRun(bridge, flow, DEFAULT_PREFS, () => true);
    expect(ok.ok).toBe(true);
  });
});
