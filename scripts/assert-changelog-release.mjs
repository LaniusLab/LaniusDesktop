#!/usr/bin/env node
/**
 * 本地/CI 共用：检查 package.json version 是否在 CHANGELOG.md 有对应章节，
 * 以及（默认）是否含 `<!-- release:publish -->` 发布意图标记。
 * 对齐 Lexcubia/Minecraft-Utilities desktop-release detect 逻辑。
 *
 * Usage:
 *   node scripts/assert-changelog-release.mjs [--require-marker] [--json]
 * Exit 0 + prints release=true|false（默认不因「未发布」而失败；加 --strict 则未就绪时 exit 1）
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const MARKER = "<!-- release:publish -->";

function parseArgs(argv) {
  return {
    requireMarker: argv.includes("--require-marker") || !argv.includes("--no-marker"),
    strict: argv.includes("--strict"),
    json: argv.includes("--json"),
  };
}

function sectionBody(markdown, version) {
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^## \\[${escaped}\\](?:\\s+-\\s+\\S+)?\\s*$`, "m");
  const match = re.exec(markdown);
  if (!match || match.index === undefined) {
    return null;
  }
  const after = markdown.slice(match.index + match[0].length);
  const next = after.search(/^## \[/m);
  return (next === -1 ? after : after.slice(0, next)).trim();
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const version = pkg.version;
  let changelog;
  try {
    changelog = readFileSync(join(root, "CHANGELOG.md"), "utf8");
  } catch {
    fail(`CHANGELOG.md missing`, opts, version);
    return;
  }
  const body = sectionBody(changelog, version);
  if (body === null) {
    fail(`no ## [${version}] section`, opts, version);
    return;
  }
  if (opts.requireMarker && !body.includes(MARKER)) {
    fail(`section ## [${version}] lacks ${MARKER}`, opts, version);
    return;
  }
  ok(version, opts);
}

function ok(version, opts) {
  const payload = { release: true, version, reason: "ready" };
  if (opts.json) {
    process.stdout.write(`${JSON.stringify(payload)}\n`);
  } else {
    process.stdout.write(`release=true version=${version}\n`);
  }
}

function fail(reason, opts, version) {
  const payload = { release: false, version, reason };
  if (opts.json) {
    process.stdout.write(`${JSON.stringify(payload)}\n`);
  } else {
    process.stdout.write(`release=false version=${version} reason=${reason}\n`);
  }
  if (opts.strict) {
    process.exit(1);
  }
}

main();
