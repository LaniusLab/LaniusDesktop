import { describe, expect, it } from "vitest";

import { normalizeEngineEvent } from "./normalize-engine-event";

describe("normalizeEngineEvent", () => {
  it("passes through shell status frames", () => {
    expect(normalizeEngineEvent({ kind: "status", status: "stopped" })).toEqual({
      kind: "status",
      status: "stopped",
    });
  });

  it("maps execution.stateChanged notify", () => {
    expect(
      normalizeEngineEvent({
        jsonrpc: "2.0",
        method: "execution.stateChanged",
        params: { executionId: "e1", from: "validating", to: "running", traceId: "t1" },
      }),
    ).toEqual({
      kind: "execution",
      executionId: "e1",
      phase: "running",
      traceId: "t1",
    });
  });

  it("maps nodeStarted / nodeFinished / log", () => {
    expect(
      normalizeEngineEvent({
        method: "execution.nodeStarted",
        params: { executionId: "e1", nodeId: "n1", traceId: "t1" },
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
        params: { executionId: "e1", level: "info", message: "hello", traceId: "t1" },
      }),
    ).toEqual({
      kind: "log",
      executionId: "e1",
      traceId: "t1",
      nodeId: undefined,
      message: "hello",
    });
  });

  it("returns null for unknown shapes", () => {
    expect(normalizeEngineEvent(null)).toBeNull();
    expect(normalizeEngineEvent({ method: "no.such" })).toBeNull();
  });
});
