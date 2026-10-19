import { describe, expect, it } from "vitest";

import { normalizeEngineEvent } from "./engine-events";

describe("normalizeEngineEvent", () => {
  it("透传壳侧 kind 事件", () => {
    expect(normalizeEngineEvent({ kind: "status", status: "ready" })).toEqual({
      kind: "status",
      status: "ready",
    });
  });

  it("把 execution.stateChanged 映射为 phase", () => {
    expect(
      normalizeEngineEvent({
        jsonrpc: "2.0",
        method: "execution.stateChanged",
        params: { executionId: "e1", from: "idle", to: "running", traceId: "t1" },
      }),
    ).toEqual({
      kind: "execution",
      executionId: "e1",
      phase: "running",
      traceId: "t1",
    });
  });

  it("把 nodeStarted / nodeFinished / log 映射到 UI 事件", () => {
    expect(
      normalizeEngineEvent({
        method: "execution.nodeStarted",
        params: { executionId: "e1", nodeId: "n1" },
      }),
    ).toMatchObject({ kind: "execution", nodeId: "n1", nodeStatus: "running" });

    expect(
      normalizeEngineEvent({
        method: "execution.nodeFinished",
        params: { executionId: "e1", nodeId: "n1", status: "done", durationMs: 12 },
      }),
    ).toMatchObject({ kind: "execution", nodeId: "n1", nodeStatus: "done" });

    expect(
      normalizeEngineEvent({
        method: "execution.log",
        params: { executionId: "e1", message: "你好", level: "info" },
      }),
    ).toMatchObject({ kind: "log", message: "你好", executionId: "e1" });
  });

  it("未知帧返回 null", () => {
    expect(normalizeEngineEvent({ method: "nope", params: {} })).toBeNull();
    expect(normalizeEngineEvent(null)).toBeNull();
  });
});
