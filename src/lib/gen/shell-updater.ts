// 由 scripts/codegen-schema.mjs 生成，禁止手改（真源：schemas/）
/* eslint-disable */

export type UpdaterAssetKind = "setupExe" | "msi" | "other";

export type UpdaterStatus = "idle" | "checking" | "upToDate" | "available" | "unavailable";

export type UpdaterChecksumStatus = "verified" | "unavailable";

export interface UpdaterReleaseAsset {
  "name": string;
  /** browser_download_url */
  "url": string;
  "size": number;
  "kind": UpdaterAssetKind;
}

export interface UpdaterRelease {
  /** GitHub release tag，如 v0.2.0 */
  "tag": string;
  /** Release 标题 */
  "name": string;
  /** Release 正文（changelog） */
  "body"?: string | null;
  "prerelease": boolean;
  "publishedAt"?: string | null;
  "htmlUrl": string;
  "windowsAssets": Array<UpdaterReleaseAsset>;
  /** 优先 setup.exe，其次 msi；无 Windows 包时省略或为 null */
  "preferredAsset"?: UpdaterReleaseAsset | null;
}

export interface UpdaterCheckResult {
  "status": UpdaterStatus;
  "currentVersion": string;
  "latestTag"?: string | null;
  "latestVersion"?: string | null;
  /** 机器可读提示键或短说明 */
  "message": string;
  "preferredAsset"?: UpdaterReleaseAsset | null;
}

export interface UpdaterDownloadResult {
  "tag": string;
  "fileName": string;
  /** 本机已下载路径 */
  "path": string;
  "bytes": number;
  "kind": UpdaterAssetKind;
  "checksumStatus": UpdaterChecksumStatus;
}

export interface UpdaterInstallResult {
  "path": string;
  "launched": boolean;
  /** 当前仅交互式启动安装器；签名静默属 M5 */
  "mode": "interactiveInstaller";
}

export interface UpdaterApplyResult {
  "tag": string;
  "fileName": string;
  "path": string;
  "bytes": number;
  "kind": UpdaterAssetKind;
  /** 是否已启动安装器 */
  "launched": boolean;
  /** 已启动时为 interactiveInstaller；跳过安装时为 null */
  "mode"?: "interactiveInstaller" | null;
  /** 未启动安装时的原因，如 unsupportedPlatform */
  "installSkippedReason"?: string | null;
  "checksumStatus": UpdaterChecksumStatus;
}

export interface UpdaterProgress {
  /** 进度阶段 */
  "phase": "fetching" | "downloading" | "done";
  "tag"?: string | null;
  "downloaded": number;
  "total"?: number | null;
  "percent"?: number | null;
}

export interface UpdaterListResult {
  /** 当前应用版本（无 v 前缀） */
  "currentVersion": string;
  /** 按发布时间倒序的 published release */
  "releases": Array<UpdaterRelease>;
  /** 仓库 Releases 页 URL */
  "releasesPageUrl": string;
  /** true 表示未请求 draft（公开 API 默认不可见） */
  "draftsOmitted": boolean;
  /** 当前平台是否支持启动 Windows 安装器（仅 Windows 为 true） */
  "installSupported": boolean;
}
