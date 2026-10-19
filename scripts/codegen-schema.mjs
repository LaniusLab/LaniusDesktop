#!/usr/bin/env node
/*
 * schema codegen：schemas/（JSON Schema 真源）→ src/lib/gen/（TS 类型）。
 * 见 ADR-0005 与 docs/PROTOCOL.md §7。生成器刻意小而笨，只支持本项目
 * schema 用到的子集；产物入库，CI 以 --check 校验同步。
 *
 * 用法：node scripts/codegen-schema.mjs [--check]
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const HEADER = `// 由 scripts/codegen-schema.mjs 生成，禁止手改（真源：schemas/）
/* eslint-disable */
`;

/** 把 #/$defs/foo 形式的本地引用解析为目标子 schema */
function resolveRef(rootSchema, ref) {
  const prefix = "#/$defs/";
  if (!ref.startsWith(prefix)) throw new Error(`不支持的引用: ${ref}`);
  const name = ref.slice(prefix.length);
  const target = rootSchema.$defs?.[name];
  if (!target) throw new Error(`引用不存在: ${ref}`);
  return { schema: target, name };
}

function pascalCase(name) {
  return name.replace(/(^|[-_])(\w)/g, (_m, _p, c) => c.toUpperCase());
}

function tsType(rootSchema, schema, nameHint) {
  if (schema === true) return "unknown";
  if (schema.$ref) {
    const { name } = resolveRef(rootSchema, schema.$ref);
    return pascalCase(name);
  }
  if (schema.oneOf) {
    return schema.oneOf.map((branch) => tsType(rootSchema, branch, nameHint)).join(" | ");
  }
  if (schema.enum) {
    return schema.enum.map((v) => JSON.stringify(v)).join(" | ");
  }
  if (Array.isArray(schema.type)) {
    return schema.type
      .map((t) => (t === "null" ? "null" : tsType(rootSchema, { ...schema, type: t }, nameHint)))
      .join(" | ");
  }
  switch (schema.type) {
    case "string":
      return "string";
    case "number":
    case "integer":
      return "number";
    case "boolean":
      return "boolean";
    case "null":
      return "null";
    case "array":
      return `Array<${tsType(rootSchema, schema.items ?? true, nameHint)}>`;
    case "object": {
      const ap = schema.additionalProperties;
      if (ap && typeof ap === "object") {
        return `Record<string, ${tsType(rootSchema, ap, nameHint)}>`;
      }
      if (!schema.properties) return "Record<string, unknown>";
      return null; // 具名对象：由 emitInterface 展开
    }
    default:
      return "unknown";
  }
}

function emitInterface(rootSchema, name, schema) {
  const required = new Set(schema.required ?? []);
  const lines = [`export interface ${name} {`];
  for (const [prop, propSchema] of Object.entries(schema.properties ?? {})) {
    if (propSchema.description) lines.push(`  /** ${propSchema.description} */`);
    const optional = required.has(prop) ? "" : "?";
    const inline =
      propSchema.type === "object" && propSchema.properties && !propSchema.oneOf
        ? emitInlineObject(rootSchema, propSchema)
        : tsType(rootSchema, propSchema, prop);
    lines.push(`  ${JSON.stringify(prop)}${optional}: ${inline};`);
  }
  lines.push("}");
  return lines.join("\n");
}

/** 为 schema 中非 root 的 $defs 对象生成具名类型；enum/$ref 已由 tsType 内联 */
function emitDefAliases(rootSchema) {
  const parts = [];
  for (const [defName, defSchema] of Object.entries(rootSchema.$defs ?? {})) {
    if (defSchema.type === "object" && defSchema.properties) continue;
    if (defSchema.enum || defSchema.oneOf || Array.isArray(defSchema.type) || defSchema.type) {
      parts.push(`export type ${pascalCase(defName)} = ${tsType(rootSchema, defSchema, defName)};`, "");
    }
  }
  return parts;
}

function emitInlineObject(rootSchema, schema) {
  const required = new Set(schema.required ?? []);
  const props = Object.entries(schema.properties ?? {}).map(([prop, propSchema]) => {
    const optional = required.has(prop) ? "" : "?";
    return `${JSON.stringify(prop)}${optional}: ${tsType(rootSchema, propSchema, prop)}`;
  });
  return `{ ${props.join("; ")} }`;
}

function generate(schemaPath, outName, rootTypeName) {
  const schema = JSON.parse(readFileSync(join(root, schemaPath), "utf8"));
  const parts = [HEADER];

  parts.push(...emitDefAliases(schema));
  for (const [defName, defSchema] of Object.entries(schema.$defs ?? {})) {
    if (defSchema.type === "object" && defSchema.properties) {
      parts.push(emitInterface(schema, pascalCase(defName), defSchema), "");
    }
  }
  parts.push(emitInterface(schema, rootTypeName, schema), "");
  return { outPath: join(root, "src/lib/gen", outName), content: parts.join("\n") };
}

const outputs = [
  generate("schemas/error.schema.json", "error.ts", "EngineError"),
  generate("schemas/flow.schema.json", "flow.ts", "FlowFile"),
  generate("schemas/shell-prefs.schema.json", "shell-prefs.ts", "ShellPrefs"),
  generate("schemas/shell-debug.schema.json", "shell-debug.ts", "ShellDebugInfo"),
  generate("schemas/shell-updater.schema.json", "shell-updater.ts", "UpdaterListResult"),
  generate("schemas/shell-secret.schema.json", "shell-secret.ts", "SecretListResult"),
  generate("schemas/element-locator.schema.json", "element-locator.ts", "DriverElementFindResult"),
  generate("schemas/shell-trust.schema.json", "shell-trust.ts", "TrustCheckResult"),
];

mkdirSync(join(root, "src/lib/gen"), { recursive: true });

let drift = false;
for (const { outPath, content } of outputs) {
  const current = existsSync(outPath) ? readFileSync(outPath, "utf8") : null;
  if (current !== content) {
    drift = true;
    if (checkOnly) {
      console.error(`✗ ${outPath} 与 schema 不同步`);
    } else {
      writeFileSync(outPath, content);
      console.log(`✓ 生成 ${outPath}`);
    }
  } else {
    console.log(`· ${outPath} 已是最新`);
  }
}

if (checkOnly && drift) {
  console.error("\nschema 产物漂移：请运行 pnpm codegen");
  process.exit(1);
}
