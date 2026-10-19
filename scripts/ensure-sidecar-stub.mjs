#!/usr/bin/env node
/**
 * 为 `cargo check` / `tauri-build` 准备 externalBin 占位文件。
 *
 * Tauri 在编译期要求 `src-tauri/binaries/lanius-engine-<triple>[.exe]` 存在；
 * 真正可运行的 sidecar 由 `pnpm engine:pack`（PyInstaller）生成。
 * 本脚本只在缺失时写入空文件，供 shell CI 与本地 verify:shell 使用。
 */

import { execSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const binariesDir = join(root, "src-tauri", "binaries");

function rustHostTriple() {
  const fromEnv =
    process.env.TAURI_ENV_TARGET_TRIPLE?.trim() ||
    process.env.CARGO_BUILD_TARGET?.trim();
  if (fromEnv) return fromEnv;

  const out = execSync("rustc -vV", { encoding: "utf8" });
  const match = /^host:\s+(\S+)/m.exec(out);
  if (!match) {
    throw new Error("无法从 rustc -vV 解析 host target triple");
  }
  return match[1];
}

function main() {
  const triple = rustHostTriple();
  const isWindows = triple.includes("windows");
  const name = isWindows
    ? `lanius-engine-${triple}.exe`
    : `lanius-engine-${triple}`;
  mkdirSync(binariesDir, { recursive: true });
  const dest = join(binariesDir, name);
  if (existsSync(dest)) {
    console.log(`[ensure-sidecar-stub] present ${dest}`);
    return;
  }
  writeFileSync(dest, "");
  if (!isWindows) {
    chmodSync(dest, 0o755);
  }
  console.log(`[ensure-sidecar-stub] created stub ${dest}`);
}

try {
  main();
} catch (err) {
  console.error(
    "[ensure-sidecar-stub] failed:",
    err instanceof Error ? err.message : err,
  );
  process.exit(1);
}
