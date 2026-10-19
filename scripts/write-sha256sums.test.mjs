import { createHash } from "node:crypto";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, afterEach } from "vitest";

import { formatSha256Sums, sha256File } from "./write-sha256sums.mjs";

describe("write-sha256sums", () => {
  const dirs = [];

  afterEach(() => {
    for (const d of dirs.splice(0)) {
      rmSync(d, { recursive: true, force: true });
    }
  });

  it("hashes file contents and sorts by basename", () => {
    const dir = mkdtempSync(join(tmpdir(), "lanius-sums-"));
    dirs.push(dir);
    const a = join(dir, "b-setup.exe");
    const b = join(dir, "a-app.msi");
    writeFileSync(a, "alpha");
    writeFileSync(b, "beta");
    const body = formatSha256Sums([a, b]);
    const expectA = createHash("sha256").update("beta").digest("hex");
    const expectB = createHash("sha256").update("alpha").digest("hex");
    expect(body).toBe(`${expectA}  a-app.msi\n${expectB}  b-setup.exe\n`);
    expect(sha256File(a)).toBe(expectB);
  });
});
