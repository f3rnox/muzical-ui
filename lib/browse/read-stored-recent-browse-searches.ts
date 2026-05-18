import { RECENT_BROWSE_SEARCHES_STORAGE_KEY } from "@/lib/browse/browse-search-constants";
import type {
  BrowseSearchSource,
  RecentBrowseSearch,
} from "@/types/browse-search";

function isBrowseSearchSource(value: unknown): value is BrowseSearchSource {
  return value === "musicbrainz" || value === "youtube";
}

function parseEntry(value: unknown): RecentBrowseSearch | null {
  if (typeof value !== "object" || value === null) return null;
  const row = value as { source?: unknown; query?: unknown };
  if (!isBrowseSearchSource(row.source)) return null;
  if (typeof row.query !== "string") return null;
  const query = row.query.trim();
  if (!query) return null;
  return { source: row.source, query };
}

/**
 * Load recent MusicBrainz / YouTube searches from localStorage.
 */
export default function readStoredRecentBrowseSearches(): RecentBrowseSearch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_BROWSE_SEARCHES_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: RecentBrowseSearch[] = [];
    for (const item of parsed) {
      const entry = parseEntry(item);
      if (entry) out.push(entry);
    }
    return out;
  } catch {
    return [];
  }
}
