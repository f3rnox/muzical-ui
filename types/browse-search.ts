/** Source tab for a saved browse search query. */
export type BrowseSearchSource = "library" | "musicbrainz" | "youtube";

/** One recent browse search query. */
export type RecentBrowseSearch = {
  source: BrowseSearchSource;
  query: string;
};
