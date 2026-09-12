/** Align Mod+K-style bindings with KeyboardEvent; Mod = Meta on Apple, Ctrl elsewhere. */

export function isApplePlatform(): boolean {
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
}

const NAMED_EVENT_KEY: Record<string, string> = {
  enter: "Enter",
  ",": ",",
  space: " ",
  escape: "Escape",
  tab: "Tab",
  backspace: "Backspace",
  delete: "Delete",
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
  home: "Home",
  end: "End",
  pageup: "PageUp",
  pagedown: "PageDown",
  insert: "Insert",
};

const EVENT_KEY_TOKEN: Record<string, string> = {
  Enter: "Enter",
  ",": ",",
  " ": "Space",
  Escape: "Escape",
  Tab: "Tab",
  Backspace: "Backspace",
  Delete: "Delete",
  ArrowUp: "Up",
  ArrowDown: "Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
  Home: "Home",
  End: "End",
  PageUp: "PageUp",
  PageDown: "PageDown",
  Insert: "Insert",
};

function tokenFromEventKey(key: string): string | null {
  const named = EVENT_KEY_TOKEN[key];
  if (named) return named;
  if (/^F([1-9]|1[0-2])$/.test(key)) return key;
  if (key.length === 1) return key.toUpperCase();
  return null;
}

function eventKeyMatches(event: KeyboardEvent, token: string): boolean {
  const expected = NAMED_EVENT_KEY[token.toLowerCase()];
  if (expected !== undefined) return event.key === expected;
  if (/^f([1-9]|1[0-2])$/i.test(token)) return event.key.toLowerCase() === token.toLowerCase();
  return event.key.toLowerCase() === token.toLowerCase();
}

/**
 * Match a chord against a keydown event.
 * Only Mod/Shift/Alt are recognized modifiers; chord order is Mod → Alt → Shift → key.
 */
export function matchShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut.split("+");
  const key = parts[parts.length - 1] ?? "";
  const needMod = parts.includes("Mod");
  const needShift = parts.includes("Shift");
  const needAlt = parts.includes("Alt");
  const modPressed = isApplePlatform() ? event.metaKey : event.ctrlKey;
  if (needMod !== modPressed) return false;
  if (needShift !== event.shiftKey) return false;
  if (needAlt !== event.altKey) return false;
  return eventKeyMatches(event, key);
}

/**
 * Capture a binding from a keydown while recording.
 * Returns null for bare modifiers. Named keys (arrows, F1–F12, Space…) are allowed.
 */
export function eventToShortcut(event: KeyboardEvent): string | null {
  if (event.key === "Control" || event.key === "Meta" || event.key === "Shift" || event.key === "Alt") {
    return null;
  }
  const token = tokenFromEventKey(event.key);
  if (!token) return null;
  const parts: string[] = [];
  if (event.metaKey || event.ctrlKey) parts.push("Mod");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");
  parts.push(token);
  return parts.join("+");
}

/**
 * Human label for UI. Apple uses glyph concatenation (⌘K); Windows/Linux uses Ctrl+K.
 * Do not feed this string back into matchShortcut — glyphs are display-only.
 */
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
