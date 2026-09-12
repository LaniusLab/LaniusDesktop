/** 把 Mod+K 这类绑定和键盘事件对齐；Mod 在 macOS 为 Meta，其余为 Ctrl。 */

export function isApplePlatform(): boolean {
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
}

export function matchShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut.split("+");
  const key = parts[parts.length - 1]?.toLowerCase() ?? "";
  const needMod = parts.includes("Mod");
  const needShift = parts.includes("Shift");
  const needAlt = parts.includes("Alt");
  const modPressed = isApplePlatform() ? event.metaKey : event.ctrlKey;
  if (needMod !== modPressed) return false;
  if (needShift !== event.shiftKey) return false;
  if (needAlt !== event.altKey) return false;
  if (key === "enter") return event.key === "Enter";
  if (key === ",") return event.key === ",";
  return event.key.toLowerCase() === key;
}

export function eventToShortcut(event: KeyboardEvent): string | null {
  if (event.key === "Control" || event.key === "Meta" || event.key === "Shift" || event.key === "Alt") {
    return null;
  }
  const parts: string[] = [];
  if (event.metaKey || event.ctrlKey) parts.push("Mod");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");
  if (event.key === "Enter") parts.push("Enter");
  else if (event.key === ",") parts.push(",");
  else if (event.key.length === 1) parts.push(event.key.toUpperCase());
  else return null;
  return parts.join("+");
}

export function formatShortcut(shortcut: string): string {
  const mod = isApplePlatform() ? "⌘" : "Ctrl";
  return shortcut
    .split("+")
    .map((part) => {
      if (part === "Mod") return mod;
      if (part === "Shift") return isApplePlatform() ? "⇧" : "Shift";
      if (part === "Alt") return isApplePlatform() ? "⌥" : "Alt";
      if (part === "Enter") return isApplePlatform() ? "⏎" : "Enter";
      return part;
    })
    .join(isApplePlatform() ? "" : "+");
}
