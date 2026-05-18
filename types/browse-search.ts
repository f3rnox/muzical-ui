/** Source tab for a saved browse search query. */
export type BrowseSearchSource = "musicbrainz" | "youtube";

/** One recent MusicBrainz or YouTube search. */
export type RecentBrowseSearch = {
  source: BrowseSearchSource;
  query: string;
};
