#!/usr/bin/env node
/*
 * 版本号同步：根 package.json 是唯一真源（docs/ARCHITECTURE.md §5.4）。
 * 用法：node scripts/sync-version.mjs [--check]
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;

/** 替换 TOML 指定 section 内的 version 字段，返回新内容 */
function setTomlVersion(content, section, next) {
  const lines = content.split("\n");
  let inSection = false;
  let replaced = false;
  const out = lines.map((line) => {
    const sectionMatch = line.match(/^\[(.+)\]/);
    if (sectionMatch) {
      inSection = sectionMatch[1] === section;
      return line;
    }
    if (inSection && !replaced && line.startsWith('version = "')) {
      replaced = true;
      return `version = "${next}"`;
    }
    return line;
  });
  if (!replaced) throw new Error(`未找到 [${section}] 的 version 字段`);
  return out.join("\n");
}

const targets = [
  {
    path: "src-tauri/tauri.conf.json",
    read: () => JSON.parse(readFileSync(join(root, "src-tauri/tauri.conf.json"), "utf8")).version,
    write: (next) => {
      const confPath = join(root, "src-tauri/tauri.conf.json");
      const conf = JSON.parse(readFileSync(confPath, "utf8"));
      conf.version = next;
      writeFileSync(confPath, JSON.stringify(conf, null, 2) + "\n");
    },
  },
  {
    path: "src-tauri/Cargo.toml",
    read: () =>
      /\[package\][^[]*?^version = "([^"]+)"/ms.exec(
        readFileSync(join(root, "src-tauri/Cargo.toml"), "utf8"),
      )?.[1],
    write: (next) => {
      const cargoPath = join(root, "src-tauri/Cargo.toml");
      writeFileSync(cargoPath, setTomlVersion(readFileSync(cargoPath, "utf8"), "package", next));
    },
  },
  {
    path: "engine/pyproject.toml",
    read: () =>
      /\[project\][^[]*?^version = "([^"]+)"/ms.exec(
        readFileSync(join(root, "engine/pyproject.toml"), "utf8"),
      )?.[1],
    write: (next) => {
      const pyPath = join(root, "engine/pyproject.toml");
      writeFileSync(pyPath, setTomlVersion(readFileSync(pyPath, "utf8"), "project", next));
    },
  },
];

let drift = false;
for (const target of targets) {
  const current = target.read();
  if (current !== version) {
    drift = true;
    if (checkOnly) {
      console.error(`✗ ${target.path}: ${current} ≠ ${version}`);
    } else {
      target.write(version);
      console.log(`✓ ${target.path}: ${current} → ${version}`);
    }
  } else {
    console.log(`· ${target.path}: 已同步 (${version})`);
  }
}

if (checkOnly && drift) {
  console.error("\n版本号漂移：请运行 pnpm version:sync");
  process.exit(1);
}
