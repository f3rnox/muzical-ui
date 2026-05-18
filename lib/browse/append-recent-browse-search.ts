import browseSearchEntryKey from "@/lib/browse/browse-search-entry-key";
import type { RecentBrowseSearch } from "@/types/browse-search";

/**
 * Prepend a browse search, dedupe by source + query, and cap list length.
 */
export default function appendRecentBrowseSearch(
  prev: readonly RecentBrowseSearch[],
  entry: RecentBrowseSearch,
  limit: number,
): RecentBrowseSearch[] {
  const query = entry.query.trim();
  if (!query) return [...prev];
  const normalized: RecentBrowseSearch = { source: entry.source, query };
  const key = browseSearchEntryKey(normalized);
  const filtered = prev.filter((item) => browseSearchEntryKey(item) !== key);
  return [normalized, ...filtered].slice(0, limit);
}
