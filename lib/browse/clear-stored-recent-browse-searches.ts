import writeStoredRecentBrowseSearches from "@/lib/browse/write-stored-recent-browse-searches";

/**
 * Removes all recent browse searches from localStorage.
 */
export default function clearStoredRecentBrowseSearches(): void {
  writeStoredRecentBrowseSearches([]);
}
