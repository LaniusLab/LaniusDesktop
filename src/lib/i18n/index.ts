import type { ShellPrefs } from "@/lib/gen/shell-prefs";

import { en } from "./en";
import { zhCN } from "./zh-CN";

const TABLES: Record<ShellPrefs["locale"], Record<string, string>> = {
  "zh-CN": zhCN,
  en,
};

/**
 * Lookup UI copy by dotted key.
 * Fallback chain: requested locale → zh-CN → raw key (so missing keys are visible in EN).
 * Vars replace `{name}` tokens; unknown tokens are left as-is.
 * Command titles use `cmd.${id}` — keep en/zh-CN key sets identical (see i18n.test).
 */
export function translate(
  locale: ShellPrefs["locale"],
  key: string,
  vars?: Record<string, string | number>,
): string {
  const table = TABLES[locale] ?? zhCN;
  let text = table[key] ?? TABLES["zh-CN"][key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}
