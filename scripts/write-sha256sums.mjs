#!/usr/bin/env node
/*
 * 为发布产物写 GNU 风格 SHA256SUMS.txt（`<hex>  <basename>`）。
 * 供 release.yml 在 Windows 打包后上传；无签名密钥时的校验过渡。
 *
 * 用法：node scripts/write-sha256sums.mjs --out SHA256SUMS.txt <file...>
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { basename } from "node:path";

function parseArgs(argv) {
  const outIdx = argv.indexOf("--out");
  let outPath = "SHA256SUMS.txt";
  const rest = [...argv];
  if (outIdx >= 0) {
    outPath = rest[outIdx + 1];
    if (!outPath) throw new Error("--out 需要路径");
    rest.splice(outIdx, 2);
  }
  return { outPath, files: rest };
}

export function sha256File(path) {
  const hash = createHash("sha256");
  hash.update(readFileSync(path));
  return hash.digest("hex");
}

/** @param {string[]} files */
export function formatSha256Sums(files) {
  const lines = [];
  for (const file of files) {
    if (!existsSync(file) || !statSync(file).isFile()) {
      throw new Error(`不是可读文件: ${file}`);
    }
    lines.push(`${sha256File(file)}  ${basename(file)}`);
  }
  lines.sort((a, b) => a.split(/\s+/, 2)[1].localeCompare(b.split(/\s+/, 2)[1]));
  return `${lines.join("\n")}\n`;
}

function main() {
  const { outPath, files } = parseArgs(process.argv.slice(2));
  if (files.length === 0) {
    console.error("用法: node scripts/write-sha256sums.mjs --out SHA256SUMS.txt <file...>");
    process.exit(2);
  }
  const body = formatSha256Sums(files);
  writeFileSync(outPath, body, "utf8");
  console.log(`wrote ${outPath} (${files.length} file(s))`);
}

const isMain = process.argv[1] && basename(process.argv[1]) === "write-sha256sums.mjs";
if (isMain) {
  main();
}
