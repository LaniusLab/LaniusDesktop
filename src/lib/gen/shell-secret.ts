// 由 scripts/codegen-schema.mjs 生成，禁止手改（真源：schemas/）
/* eslint-disable */

export type SecretName = string;

export interface SecretSetParams {
  "key": SecretName;
  /** 明文仅经 invoke 传入，不落盘、不进日志 */
  "value": string;
}

export interface SecretGetParams {
  "key": SecretName;
}

export interface SecretDeleteParams {
  "key": SecretName;
}

export interface SecretSetResult {
  "key": SecretName;
}

export interface SecretGetResult {
  "key": SecretName;
  "found": boolean;
  /** 仅供引擎回调；UI 凭据页禁止调用后展示 */
  "value"?: string | null;
}

export interface SecretDeleteResult {
  "key": SecretName;
  "removed": boolean;
}

export interface SecretListResult {
  /** 已登记凭据名（不含 secret:// 前缀，永不含值） */
  "keys": Array<SecretName>;
}
