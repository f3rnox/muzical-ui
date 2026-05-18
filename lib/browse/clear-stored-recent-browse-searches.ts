import writeStoredRecentBrowseSearches from "@/lib/browse/write-stored-recent-browse-searches";

/**
 * Removes all recent MusicBrainz / YouTube searches from localStorage.
 */
export default function clearStoredRecentBrowseSearches(): void {
  writeStoredRecentBrowseSearches([]);
}
