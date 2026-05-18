import type { MusicBrainzSearchHints } from "@/lib/musicbrainz/build-musicbrainz-lucene-queries";
import type { MusicBrainzSearchMode } from "@/lib/musicbrainz/search-musicbrainz";
import type { MusicBrainzReleaseGroup } from "@/lib/musicbrainz/types";
import type { Track } from "@/types/track";

/** Pagination cursor for MusicBrainz browse search. */
export type MusicBrainzSearchCursor = {
  query: string;
  mode: MusicBrainzSearchMode;
  hints: MusicBrainzSearchHints;
  recordingQueries: readonly string[];
  recordingQueryIndex: number;
  recordingOffset: number;
  releaseGroupQuery: string;
  releaseGroupOffset: number;
  releaseGroups: readonly MusicBrainzReleaseGroup[] | null;
  releaseGroupExpandIndex: number;
};

export type MusicBrainzSearchPageResult = {
  tracks: Track[];
  cursor: MusicBrainzSearchCursor;
  hasMore: boolean;
};
