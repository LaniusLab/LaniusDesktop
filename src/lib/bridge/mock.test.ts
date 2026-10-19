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
    await expect(bridge.flowPause("x")).resolves.toBeUndefined();
    await expect(bridge.flowResume("x")).resolves.toBeUndefined();
    const sample = {
      schemaVersion: 2 as const,
      id: "file-1",
      name: "磁盘流程",
      steps: [{ id: "a", kind: "preset" as const, type: "core.log", label: "记", config: { message: "x" } }],
    };
    await expect(bridge.flowSave("/tmp/demo.flow.json", sample)).resolves.toEqual({
      path: "/tmp/demo.flow.json",
    });
    await expect(bridge.flowOpen("/tmp/demo.flow.json")).resolves.toMatchObject({
      path: "/tmp/demo.flow.json",
      flow: { schemaVersion: 3, id: "file-1" },
      migratedFrom: 2,
      migratedTo: 3,
    });
    await expect(bridge.flowOpen("")).rejects.toThrow(/path/);
    await expect(
      bridge.flowValidate({
        schemaVersion: 3,
        id: "bad",
        name: "bad",
        steps: [{ id: "k", kind: "binding", type: "keyboard.press", label: "空", keys: "" }],
      }),
    ).resolves.toMatchObject({
      ok: false,
      issues: [expect.objectContaining({ nodeId: "k", code: "engine.flow.validationFailed" })],
    });
    const prefs = await bridge.prefsGet();
    await expect(bridge.prefsSet(prefs)).resolves.toMatchObject({ theme: prefs.theme });
    await expect(bridge.debugInfo()).resolves.toMatchObject({ appVersion: expect.any(String) });
    await expect(bridge.logsTail()).resolves.toEqual(expect.any(String));
    await expect(bridge.updaterList()).resolves.toMatchObject({
      draftsOmitted: true,
      releases: expect.arrayContaining([expect.objectContaining({ tag: "v0.2.0" })]),
    });
    await expect(bridge.updaterCheck()).resolves.toMatchObject({ status: "upToDate" });
    await expect(bridge.updaterDownload("v0.2.0")).resolves.toMatchObject({
      tag: "v0.2.0",
      kind: "setupExe",
    });
    await expect(bridge.updaterInstall("/tmp/x.exe")).resolves.toMatchObject({
      mode: "interactiveInstaller",
    });
    await expect(bridge.updaterApply("v0.2.0")).resolves.toMatchObject({
      tag: "v0.2.0",
      launched: false,
      installSkippedReason: "unsupportedPlatform",
    });
    const offProgress = bridge.onUpdaterProgress(() => {});
    offProgress();
    await expect(bridge.windowMinimize()).resolves.toBeUndefined();
    await expect(bridge.windowToggleMaximize()).resolves.toBeUndefined();
    await expect(bridge.windowIsMaximized()).resolves.toBe(false);
    await expect(bridge.windowClose()).resolves.toBeUndefined();
    const off = bridge.onEngineEvent(() => {});
    off();
  });
});
