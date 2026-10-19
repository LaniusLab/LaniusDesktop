// 由 scripts/codegen-schema.mjs 生成，禁止手改（真源：schemas/）
/* eslint-disable */

export interface Locator {
  /** 控件 Name / title */
  "name"?: string;
  /** AutomationId */
  "automationId"?: string;
  /** 如 Button、Edit */
  "controlType"?: string;
}

export interface ElementSummary {
  "name": string;
  "automationId": string;
  "controlType": string;
}

export interface DriverElementFindParams {
  /** 窗口匹配（与 flow target.match 同构） */
  "match": { "exe"?: string; "title"?: string; "className"?: string };
  /** 定位通道；默认 a11y */
  "locate"?: { "channel"?: "a11y" | "vision"; "source"?: "probe" | "user"; "capture"?: "client" | "screen"; "visionPack"?: string };
  "locator": Locator;
}

export interface DriverElementFindResult {
  "found": boolean;
  /** 已绑定窗口句柄 */
  "handle": string;
  /** 引擎侧元素句柄（平台相关） */
  "elementId": string;
  "summary": ElementSummary;
}
