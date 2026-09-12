import type { ShellPrefs } from "@/lib/gen/shell-prefs";

import { en } from "./en";
import { zhCN } from "./zh-CN";

const TABLES: Record<ShellPrefs["locale"], Record<string, string>> = {
  "zh-CN": zhCN,
  en,
};

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
