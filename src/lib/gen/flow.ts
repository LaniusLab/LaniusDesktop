// 由 scripts/codegen-schema.mjs 生成，禁止手改（真源：schemas/）
/* eslint-disable */

export interface Variable {
  "type": "string" | "number" | "boolean";
  "default"?: unknown;
}

export interface Settings {
  "timeoutMs"?: number;
  "onError"?: string;
}

export interface Target {
  "match"?: TargetMatch;
  "locate"?: Locate;
}

export interface TargetMatch {
  "exe"?: string;
  "title"?: string;
  "className"?: string;
}

export interface Locate {
  "channel"?: "a11y" | "vision";
  "source"?: "probe" | "user";
  "capture"?: "client" | "screen";
  "visionPack"?: string;
}

export interface Step {
  "id": string;
  "kind": "binding" | "mouse" | "preset" | "control";
  "type"?: string;
  "mappingId"?: string;
  "profileId"?: string;
  "keys"?: string;
  "label"?: string;
  "config"?: Record<string, unknown>;
  "disabled"?: boolean;
  /** flow.if 的则分支 */
  "then"?: Array<Step>;
  /** flow.if 的否则分支 */
  "else"?: Array<Step>;
  /** flow.loop / flow.subflow / flow.tryCatch 的主体 */
  "body"?: Array<Step>;
  /** flow.tryCatch 的捕获分支 */
  "catch"?: Array<Step>;
}

export interface Node {
  "id": string;
  "type": string;
  "nodeVersion"?: number;
  "label"?: string;
  "position"?: { "x"?: number; "y"?: number };
  "config"?: Record<string, unknown>;
  "inputs"?: Record<string, unknown>;
  "disabled"?: boolean;
}

export interface Edge {
  "id": string;
  "from": string;
  "to": string;
  "kind"?: "control";
  "branch"?: string;
}

export interface FlowFile {
  "schemaVersion": number;
  "id": string;
  "name": string;
  "description"?: string;
  /** 编排时默认使用的按键方案 id */
  "keymapProfileId"?: string;
  "target"?: Target;
  "variables"?: Record<string, Variable>;
  "settings"?: Settings;
  /** 有序步骤（schemaVersion ≥ 2 的执行真源；≥ 3 可嵌套） */
  "steps"?: Array<Step>;
  /** v1 DAG 节点；打开时迁移为 steps */
  "nodes"?: Array<Node>;
  /** v1 DAG 连线；打开时迁移为 steps 顺序 */
  "edges"?: Array<Edge>;
  "metadata"?: Record<string, unknown>;
}
