/** 在 dialog 插件落地前，用同步 prompt 收集本机路径（PROTOCOL.md §8）。 */

export function askLocalPath(message: string, defaultPath = ""): string | null {
  if (typeof window === "undefined" || typeof window.prompt !== "function") {
    return null;
  }
  const raw = window.prompt(message, defaultPath);
  if (raw === null) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}
