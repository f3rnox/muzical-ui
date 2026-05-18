import type { BrowseSearchSource } from "@/types/browse-search";

/**
 * Short label for a browse search source tab.
 */
export default function browseSearchSourceLabel(
  source: BrowseSearchSource,
): string {
  if (source === "youtube") return "YouTube";
  if (source === "musicbrainz") return "MusicBrainz";
  return "Library";
}
