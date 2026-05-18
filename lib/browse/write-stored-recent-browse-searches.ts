import { RECENT_BROWSE_SEARCHES_STORAGE_KEY } from "@/lib/browse/browse-search-constants";
import type { RecentBrowseSearch } from "@/types/browse-search";

/**
 * Persist recent MusicBrainz / YouTube searches to localStorage.
 */
export default function writeStoredRecentBrowseSearches(
  list: readonly RecentBrowseSearch[],
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      RECENT_BROWSE_SEARCHES_STORAGE_KEY,
      JSON.stringify(list),
    );
  } catch {
    /* ignore */
  }
}
