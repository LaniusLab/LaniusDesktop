// 由 scripts/codegen-schema.mjs 生成，禁止手改（真源：schemas/）
/* eslint-disable */

export interface DiagnosticsExportResult {
  /** 诊断目录绝对路径（始终写出） */
  "path": string;
  /** 目录内文件合计字节数（不含可选归档本身） */
  "bytes": number;
  /** 相对诊断目录的文件名列表 */
  "filesIncluded": Array<string>;
  /** 导出完成时间（Unix 秒） */
  "createdAt": number;
  /** 是否成功打出可选归档（tar.gz / zip） */
  "archived": boolean;
  /** 归档绝对路径；未归档时为 null */
  "archivePath"?: string | null;
}
