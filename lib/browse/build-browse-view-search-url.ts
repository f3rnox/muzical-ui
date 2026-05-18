import type { RecentBrowseSearch } from "@/types/browse-search";

/**
 * Home URL that opens a browse tab with a pre-filled search query.
 */
export default function buildBrowseViewSearchUrl(
  entry: RecentBrowseSearch,
): string {
  const params = new URLSearchParams();
  params.set("view", entry.source === "youtube" ? "youtube" : "musicbrainz");
  params.set("q", entry.query);
  return `/?${params.toString()}`;
}
