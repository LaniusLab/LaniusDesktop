// 由 scripts/codegen-schema.mjs 生成，禁止手改（真源：schemas/）
/* eslint-disable */

export interface EngineError {
  /** 层.领域.原因，如 engine.flow.validationFailed */
  "code": string;
  /** 面向用户的消息，可本地化 */
  "message": string;
  "severity": "info" | "warning" | "error" | "fatal";
  "source": "ui" | "shell" | "engine";
  /** 关联的流程节点 */
  "nodeId"?: string;
  /** 三层贯穿的追踪 id（ULID） */
  "traceId": string;
  /** 结构化上下文 */
  "details"?: Record<string, unknown>;
  "retryable"?: boolean;
}
