#!/usr/bin/env node
/**
 * 将 Python 引擎打成 Tauri externalBin 所需的 sidecar。
 *
 * 产物：src-tauri/binaries/lanius-engine-<rust-target-triple>[.exe]
 * 安装后由 Tauri 重命名为与主 exe 同目录的 lanius-engine[.exe]。
 *
 * 用法：pnpm engine:pack
 * 依赖：已安装 engine[pack]（含 pyinstaller），且 rustc 可用（解析 host triple）。
 */

import { execFileSync, execSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const engineDir = join(root, "engine");
const binariesDir = join(root, "src-tauri", "binaries");
const distDir = join(engineDir, "dist");
const workDir = join(engineDir, "build", "pyinstaller");

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

function pythonBin() {
  if (process.env.LANIUS_PYTHON?.trim()) return process.env.LANIUS_PYTHON.trim();
  if (process.platform === "win32") return "python";
  return "python3";
}

function main() {
  const triple = rustHostTriple();
  const isWindows = triple.includes("windows");
  const stagedName = isWindows ? "lanius-engine.exe" : "lanius-engine";
  const finalName = isWindows
    ? `lanius-engine-${triple}.exe`
    : `lanius-engine-${triple}`;

  mkdirSync(binariesDir, { recursive: true });
  mkdirSync(workDir, { recursive: true });
  rmSync(distDir, { recursive: true, force: true });

  const py = pythonBin();
  const entry = join(engineDir, "src", "lanius_engine", "__main__.py");
  const args = [
    "-m",
    "PyInstaller",
    "--noconfirm",
    "--clean",
    "--onefile",
    "--name",
    "lanius-engine",
    "--paths",
    join(engineDir, "src"),
    "--distpath",
    distDir,
    "--workpath",
    workDir,
    "--specpath",
    workDir,
    // sidecar 通过 stdin/stdout 通信；控制台子系统保留 stdio
    ...(isWindows ? ["--console"] : []),
    entry,
  ];

  console.log(`[pack-engine] python=${py} triple=${triple}`);
  execFileSync(py, args, { cwd: engineDir, stdio: "inherit" });

  const staged = join(distDir, stagedName);
  if (!existsSync(staged)) {
    throw new Error(`PyInstaller 未产出预期文件: ${staged}`);
  }

  const dest = join(binariesDir, finalName);
  rmSync(dest, { force: true });
  renameSync(staged, dest);
  console.log(`[pack-engine] wrote ${dest}`);
}

try {
  main();
} catch (err) {
  console.error("[pack-engine] failed:", err instanceof Error ? err.message : err);
  process.exit(1);
}
