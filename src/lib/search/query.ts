export type SearchGroup = "nav" | "run" | "app";

export interface SearchSource {
  id: string;
  title: string;
  shortcut?: string;
  enabled: boolean;
}

export interface SearchHit extends SearchSource {
  group: SearchGroup;
  score: number;
}

/** Stable group order for the palette UI (nav → tasks → app). */
export const SEARCH_GROUP_ORDER: SearchGroup[] = ["nav", "run", "app"];

/**
 * Derive group from command id prefix.
 * Gotcha: unknown prefixes land in `app` (including `app.*` and future ids).
 */
export function commandGroup(id: string): SearchGroup {
  if (id.startsWith("nav.")) return "nav";
  if (id.startsWith("flow.")) return "run";
  return "app";
}

/** Simple substring scorer: exact > prefix > mid-string (penalized by index). */
export function scoreText(haystack: string, needle: string): number {
  const query = needle.trim().toLowerCase();
  if (!query) return 1;
  const text = haystack.toLowerCase();
  if (text === query) return 100;
  if (text.startsWith(query)) return 80;
  const index = text.indexOf(query);
  if (index >= 0) return Math.max(20, 60 - index);
  return 0;
}

/**
 * Registry items → ranked hits. Empty query lists everything.
 * Always drop `app.search` so opening search cannot select itself.
 * Score is max(title, id) so English ids still match when locale titles differ.
 */
export function collectHits(query: string, items: SearchSource[]): SearchHit[] {
  return items
    .filter((item) => item.id !== "app.search")
    .map((item) => ({
      ...item,
      group: commandGroup(item.id),
      score: Math.max(scoreText(item.title, query), scoreText(item.id, query)),
    }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "zh-CN"));
}

export function groupHits(hits: SearchHit[]): Array<{ group: SearchGroup; hits: SearchHit[] }> {
  return SEARCH_GROUP_ORDER.flatMap((group) => {
    const bucket = hits.filter((hit) => hit.group === group);
    return bucket.length > 0 ? [{ group, hits: bucket }] : [];
  });
}

/** Split title into highlightable parts (first case-insensitive match only). */
export function highlightMatch(text: string, query: string): Array<{ text: string; match: boolean }> {
  const needle = query.trim();
  if (!needle) return [{ text, match: false }];
  const index = text.toLowerCase().indexOf(needle.toLowerCase());
  if (index < 0) return [{ text, match: false }];
  return [
    { text: text.slice(0, index), match: false },
    { text: text.slice(index, index + needle.length), match: true },
    { text: text.slice(index + needle.length), match: false },
  ].filter((part) => part.text.length > 0);
}
