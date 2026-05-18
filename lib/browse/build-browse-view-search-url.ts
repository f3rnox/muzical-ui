import type { RecentBrowseSearch } from "@/types/browse-search";

/**
 * Home URL that opens a browse tab with a pre-filled search query.
 */
export default function buildBrowseViewSearchUrl(
  entry: RecentBrowseSearch,
): string {
  const params = new URLSearchParams();
  if (entry.source === "youtube") {
    params.set("view", "youtube");
  } else if (entry.source === "musicbrainz") {
    params.set("view", "musicbrainz");
  }
  params.set("q", entry.query);
  return `/?${params.toString()}`;
}
