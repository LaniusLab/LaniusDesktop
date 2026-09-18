import { describe, expect, it } from "vitest";

import { createMockBridge } from "./mock";

describe("mockBridge", () => {
  it("覆盖 M0 常用 invoke 面", async () => {
    const bridge = createMockBridge();
    await expect(bridge.engineInfo()).resolves.toMatchObject({ protocolVersion: "0.1.0" });
    await expect(bridge.flowRun({ schemaVersion: 2, id: "t", name: "t", steps: [] }, "run")).resolves.toMatchObject({
      executionId: expect.any(String),
      finalState: "done",
      nodeRuns: [],
    });
    await expect(
      bridge.flowRun(
        {
          schemaVersion: 2,
          id: "t",
          name: "t",
          steps: [
            { id: "a", kind: "preset", type: "core.log", label: "记下", config: { message: "x" } },
            { id: "b", kind: "preset", type: "core.wait", label: "等", disabled: true, config: { ms: 1 } },
          ],
        },
        "dryRun",
      ),
    ).resolves.toMatchObject({
      executionId: expect.any(String),
      finalState: "done",
      mode: "dryRun",
      nodeRuns: [
        { nodeId: "a", status: "done", label: "记下" },
        { nodeId: "b", status: "skipped", label: "等" },
      ],
    });
    await expect(bridge.flowCancel("x")).resolves.toBeUndefined();
    const prefs = await bridge.prefsGet();
    await expect(bridge.prefsSet(prefs)).resolves.toMatchObject({ theme: prefs.theme });
    await expect(bridge.debugInfo()).resolves.toMatchObject({ appVersion: expect.any(String) });
    await expect(bridge.logsTail()).resolves.toEqual(expect.any(String));
    await expect(bridge.updaterCheck()).resolves.toMatchObject({ status: "unavailable" });
    await expect(bridge.windowMinimize()).resolves.toBeUndefined();
    await expect(bridge.windowToggleMaximize()).resolves.toBeUndefined();
    await expect(bridge.windowIsMaximized()).resolves.toBe(false);
    await expect(bridge.windowClose()).resolves.toBeUndefined();
    const off = bridge.onEngineEvent(() => {});
    off();
  });
});
