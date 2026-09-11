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
  "variables"?: Record<string, Variable>;
  "settings"?: Settings;
  "nodes": Array<Node>;
  "edges": Array<Edge>;
  "metadata"?: Record<string, unknown>;
}
