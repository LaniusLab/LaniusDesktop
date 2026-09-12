// 由 scripts/codegen-schema.mjs 生成，禁止手改（真源：schemas/）
/* eslint-disable */

export interface ShellPrefs {
  /** 颜色主题 */
  "theme": "light" | "dark" | "system";
  /** 强调色 */
  "accent": "terracotta" | "ink" | "moss" | "dusk";
  /** 字体预设 */
  "font": "song" | "hei" | "mixed";
  /** 动效强度 */
  "motion": "normal" | "reduce";
  /** 界面语言 */
  "locale": "zh-CN" | "en";
  /** 关闭窗口时的行为 */
  "closeBehavior": "quit" | "minimize";
  /** 登录后自动启动 */
  "autostart": boolean;
  /** 启动时检查更新 */
  "autoUpdate": boolean;
  /** 可改的应用内快捷键 */
  "shortcuts": { "palette": string; "run": string };
}
