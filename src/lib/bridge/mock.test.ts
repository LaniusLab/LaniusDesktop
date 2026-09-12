import { describe, expect, it } from "vitest";

import { createMockBridge } from "./mock";

describe("mockBridge", () => {
  it("覆盖 M0 常用 invoke 面", async () => {
    const bridge = createMockBridge();
    await expect(bridge.engineInfo()).resolves.toMatchObject({ protocolVersion: "0.1.0" });
    await expect(bridge.flowRun("run")).resolves.toMatchObject({ executionId: expect.any(String) });
    await expect(bridge.flowRun("dryRun")).resolves.toMatchObject({ executionId: expect.any(String) });
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
