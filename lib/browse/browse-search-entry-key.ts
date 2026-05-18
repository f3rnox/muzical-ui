import type { RecentBrowseSearch } from "@/types/browse-search";

/**
 * Stable dedupe key for a browse search entry.
 */
export default function browseSearchEntryKey(
  entry: RecentBrowseSearch,
): string {
  return `${entry.source}\u0000${entry.query.trim().toLowerCase()}`;
}
