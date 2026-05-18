import type {
  BrowseSearchSource,
  RecentBrowseSearch,
} from "@/types/browse-search";

/**
 * Returns recent searches for one browse tab, newest first.
 */
export default function filterRecentBrowseSearchesBySource(
  list: readonly RecentBrowseSearch[],
  source: BrowseSearchSource,
  limit: number,
): RecentBrowseSearch[] {
  const cap = Math.max(0, Math.floor(limit));
  if (cap === 0) return [];
  return list.filter((entry) => entry.source === source).slice(0, cap);
}
