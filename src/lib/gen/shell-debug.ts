// 由 scripts/codegen-schema.mjs 生成，禁止手改（真源：schemas/）
/* eslint-disable */

export interface ShellDebugInfo {
  /** 应用版本 */
  "appVersion": string;
  /** 操作系统标识 */
  "os": string;
  /** CPU 架构 */
  "arch": string;
  /** unix / windows */
  "family": string;
  /** 当前平台是否支持写入开机自启 */
  "autostartSupported": boolean;
  "paths": { "configDir": string; "dataDir": string; "logDir": string; "logFile": string; "exePath": string };
}
