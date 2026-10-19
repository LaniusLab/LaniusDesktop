// 由 scripts/codegen-schema.mjs 生成，禁止手改（真源：schemas/）
/* eslint-disable */

export interface TrustRecord {
  "flowId": string;
  /** SHA-256 hex（引擎 flow.inspect） */
  "contentHash": string;
  "trustedAt": number;
}

export interface TrustListResult {
  "records": Array<TrustRecord>;
}

export interface TrustCheckParams {
  "flowId": string;
  "contentHash": string;
}

export interface TrustCheckResult {
  "flowId": string;
  "contentHash": string;
  "trusted": boolean;
  "trustedAt"?: number | null;
}

export interface TrustMarkParams {
  "flowId": string;
  "contentHash": string;
}

export interface TrustMarkResult {
  "flowId": string;
  "contentHash": string;
  "trustedAt": number;
}

export interface TrustRevokeParams {
  "flowId": string;
  /** 省略则撤销该 flow 全部哈希 */
  "contentHash"?: string;
}

export interface TrustRevokeResult {
  "flowId": string;
  "removed": number;
}

export interface TrustCheckResult {
  "flowId": string;
  "contentHash": string;
  "trusted": boolean;
  "trustedAt"?: number | null;
}
