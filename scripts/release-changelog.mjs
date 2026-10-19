#!/usr/bin/env node
/**
 * 从根目录 CHANGELOG.md 提取指定版本的发布说明，供 Release workflow 写入 GitHub Release。
 * 无第三方依赖。若找不到对应章节，则回退为自上一 tag 以来的 git log。
 *
 * Usage:
 *   node scripts/release-changelog.mjs [--version 0.2.0] [--out release-notes.md]
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv) {
  let version = null;
  let out = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--version") {
      version = argv[i + 1] ?? null;
      i += 1;
    } else if (arg === "--out") {
      out = argv[i + 1] ?? null;
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      process.stdout.write(
        "Usage: node scripts/release-changelog.mjs [--version X.Y.Z] [--out file]\n",
      );
      process.exit(0);
    }
  }
  return { version, out };
}

function readPackageVersion() {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  if (typeof pkg.version !== "string" || pkg.version.length === 0) {
    throw new Error("package.json version missing");
  }
  return pkg.version;
}

/**
 * Keep a Changelog：匹配 `## [0.2.0] - 2026-10-19` 或 `## [0.2.0]`，取到下一 `## [` 之前。
 */
function extractChangelogSection(markdown, version) {
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `^## \\[${escaped}\\](?:\\s+-\\s+\\S+)?\\s*$`,
    "m",
  );
  const match = re.exec(markdown);
  if (!match || match.index === undefined) {
    return null;
  }
  const start = match.index;
  const afterHeading = markdown.slice(start);
  const next = afterHeading.slice(match[0].length).search(/^## \[/m);
  const section =
    next === -1
      ? afterHeading.trim()
      : afterHeading.slice(0, match[0].length + next).trim();
  return section.length > 0 ? section : null;
}

function gitLogFallback(version) {
  let range = "HEAD";
  try {
    const tags = execFileSync("git", ["tag", "--list", "v*", "--sort=-v:refname"], {
      cwd: root,
      encoding: "utf8",
    })
      .trim()
      .split("\n")
      .filter(Boolean);
    const current = `v${version}`;
    const previous = tags.find((t) => t !== current);
    if (previous) {
      range = `${previous}..HEAD`;
    }
  } catch {
    // ignore — fall through to HEAD-only log
  }

  let log = "";
  try {
    log = execFileSync(
      "git",
      ["log", range, "--pretty=format:- %s (%h)", "--no-merges"],
      { cwd: root, encoding: "utf8" },
    ).trim();
  } catch {
    log = "";
  }

  const lines = [
    `## ${version}`,
    "",
    "> 未在 CHANGELOG.md 找到对应章节；以下为自上一版本 tag 以来的提交摘要。",
    "",
  ];
  if (log.length > 0) {
    lines.push(log);
  } else {
    lines.push("- （无可用提交摘要）");
  }
  return lines.join("\n");
}

function main() {
  const { version: versionArg, out } = parseArgs(process.argv.slice(2));
  const version = versionArg ?? readPackageVersion();

  let body;
  try {
    const changelogPath = join(root, "CHANGELOG.md");
    const markdown = readFileSync(changelogPath, "utf8");
    body = extractChangelogSection(markdown, version);
  } catch {
    body = null;
  }

  if (!body) {
    body = gitLogFallback(version);
  }

  const text = `${body.trim()}\n`;
  if (out) {
    writeFileSync(out.startsWith("/") ? out : join(process.cwd(), out), text, "utf8");
  } else {
    process.stdout.write(text);
  }
}

main();
