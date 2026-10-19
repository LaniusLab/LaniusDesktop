import { describe, expect, it } from "vitest";

import { compareTrajectories, pickLatestDryAndRun } from "./run-compare";

describe("compareTrajectories", () => {
  it("同构且 status 一致时 structureMatch + statusMatch", () => {
    const dry = [
      { nodeId: "a", status: "done" as const, durationMs: 1, label: "A" },
      { nodeId: "b", status: "skipped" as const, durationMs: 0, label: "B" },
    ];
    const real = [
      { nodeId: "a", status: "done" as const, durationMs: 2, label: "A" },
      { nodeId: "b", status: "skipped" as const, durationMs: 0, label: "B" },
    ];
    const result = compareTrajectories(dry, real);
    expect(result.structureMatch).toBe(true);
    expect(result.statusMatch).toBe(true);
    expect(result.rows).toHaveLength(2);
    expect(result.rows.every((row) => row.match)).toBe(true);
  });

  it("顺序一致但 status 不同时仅 structureMatch", () => {
    const result = compareTrajectories(
      [{ nodeId: "a", status: "done", durationMs: 1 }],
      [{ nodeId: "a", status: "failed", durationMs: 1 }],
    );
    expect(result.structureMatch).toBe(true);
    expect(result.statusMatch).toBe(false);
    expect(result.rows[0]?.match).toBe(false);
  });

  it("步骤序列不同时 structureMatch 为 false", () => {
    const result = compareTrajectories(
      [
        { nodeId: "a", status: "done", durationMs: 1 },
        { nodeId: "b", status: "done", durationMs: 1 },
      ],
      [{ nodeId: "a", status: "done", durationMs: 1 }],
    );
    expect(result.structureMatch).toBe(false);
    expect(result.statusMatch).toBe(false);
    expect(result.rows).toHaveLength(2);
  });
});

describe("pickLatestDryAndRun", () => {
  it("按新→旧取最近预演与试一次", () => {
    const { dry, real } = pickLatestDryAndRun([
      { mode: "run" as const, id: "r2" },
      { mode: "dryRun" as const, id: "d1" },
      { mode: "run" as const, id: "r1" },
    ]);
    expect(dry?.id).toBe("d1");
    expect(real?.id).toBe("r2");
  });
});
