import { buildMusicBrainzLuceneQueries } from "@/lib/musicbrainz/build-musicbrainz-lucene-queries";
import { buildReleaseGroupLuceneQuery } from "@/lib/musicbrainz/build-release-group-lucene-query";
import { fetchReleaseTracks } from "@/lib/musicbrainz/fetch-release-tracks";
import { mergeTracksById } from "@/lib/musicbrainz/merge-tracks-by-id";
import { pickReleaseGroupReleaseId } from "@/lib/musicbrainz/pick-release-group-release-id";
import prioritizeMusicBrainzReleaseGroups from "@/lib/musicbrainz/prioritize-musicbrainz-release-groups";
import { releaseGroupArtistName } from "@/lib/musicbrainz/release-group-artist-name";
import type { MusicBrainzSearchMode } from "@/lib/musicbrainz/search-musicbrainz";
import { searchMusicBrainzRecordingsQuery } from "@/lib/musicbrainz/search-musicbrainz-recordings";
import { searchMusicBrainzReleaseGroups } from "@/lib/musicbrainz/search-musicbrainz-release-groups";
import type {
  MusicBrainzSearchCursor,
  MusicBrainzSearchPageResult,
} from "@/types/musicbrainz-search-page";
import type { Track } from "@/types/track";

const RECORDING_BATCH = 25;
const RELEASE_GROUP_BATCH = 10;
const EXPAND_PER_PAGE = 2;
const PAGE_TARGET = 20;

function createInitialCursor(
  query: string,
  mode: MusicBrainzSearchMode,
): MusicBrainzSearchCursor {
  const { queries, hints } = buildMusicBrainzLuceneQueries(query);
  const recordingQueries = mode === "album" ? queries.slice(0, 1) : queries;
  return {
    query,
    mode,
    hints,
    recordingQueries,
    recordingQueryIndex: 0,
    recordingOffset: 0,
    releaseGroupQuery: buildReleaseGroupLuceneQuery(query, hints),
    releaseGroupOffset: 0,
    releaseGroups: null,
    releaseGroupExpandIndex: 0,
  };
}

function computeHasMore(cursor: MusicBrainzSearchCursor): boolean {
  if (cursor.recordingQueryIndex < cursor.recordingQueries.length) return true;
  if (!cursor.releaseGroupQuery.trim()) return false;
  if (cursor.releaseGroups === null) return true;
  return cursor.releaseGroupExpandIndex < cursor.releaseGroups.length;
}

/**
 * Fetch the next page of MusicBrainz search results.
 */
export default async function searchMusicBrainzPage(
  query: string,
  signal?: AbortSignal,
  mode: MusicBrainzSearchMode = "song",
  cursor?: MusicBrainzSearchCursor | null,
): Promise<MusicBrainzSearchPageResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    const empty = createInitialCursor("", mode);
    return { tracks: [], cursor: empty, hasMore: false };
  }

  let state = cursor ?? createInitialCursor(trimmed, mode);
  const pageTracks: Track[] = [];

  while (
    pageTracks.length < PAGE_TARGET &&
    state.recordingQueryIndex < state.recordingQueries.length
  ) {
    if (signal?.aborted) break;
    const luceneQuery = state.recordingQueries[state.recordingQueryIndex];
    if (!luceneQuery) break;

    const batch = await searchMusicBrainzRecordingsQuery(
      luceneQuery,
      state.hints,
      signal,
      RECORDING_BATCH,
      state.recordingOffset,
    );
    mergeTracksById(pageTracks, batch);

    if (batch.length < RECORDING_BATCH) {
      state = {
        ...state,
        recordingQueryIndex: state.recordingQueryIndex + 1,
        recordingOffset: 0,
      };
    } else {
      state = {
        ...state,
        recordingOffset: state.recordingOffset + RECORDING_BATCH,
      };
    }

    if (
      batch.length === 0 &&
      state.recordingQueryIndex >= state.recordingQueries.length
    ) {
      break;
    }
  }

  if (pageTracks.length < PAGE_TARGET && state.releaseGroupQuery.trim()) {
    let groups = state.releaseGroups;
    if (!groups) {
      const fetched = await searchMusicBrainzReleaseGroups(
        state.releaseGroupQuery,
        signal,
        RELEASE_GROUP_BATCH,
        state.releaseGroupOffset,
      );
      groups = prioritizeMusicBrainzReleaseGroups(fetched, state.hints);
      state = {
        ...state,
        releaseGroups: groups,
        releaseGroupOffset: state.releaseGroupOffset + fetched.length,
      };
    }

    let expanded = 0;
    while (
      pageTracks.length < PAGE_TARGET &&
      expanded < EXPAND_PER_PAGE &&
      state.releaseGroupExpandIndex < groups.length
    ) {
      if (signal?.aborted) break;
      const group = groups[state.releaseGroupExpandIndex];
      state = {
        ...state,
        releaseGroupExpandIndex: state.releaseGroupExpandIndex + 1,
      };
      expanded += 1;

      const releaseId = pickReleaseGroupReleaseId(group);
      if (!releaseId) continue;
      const artist = releaseGroupArtistName(group);
      const album = group.title?.trim() || "Unknown album";
      const tracks = await fetchReleaseTracks(releaseId, album, artist, signal);
      mergeTracksById(pageTracks, tracks);
    }

    if (
      pageTracks.length < PAGE_TARGET &&
      state.releaseGroupExpandIndex >= groups.length &&
      groups.length >= RELEASE_GROUP_BATCH
    ) {
      const fetched = await searchMusicBrainzReleaseGroups(
        state.releaseGroupQuery,
        signal,
        RELEASE_GROUP_BATCH,
        state.releaseGroupOffset,
      );
      if (fetched.length > 0) {
        const merged = prioritizeMusicBrainzReleaseGroups(
          [...groups, ...fetched],
          state.hints,
        );
        state = {
          ...state,
          releaseGroups: merged,
          releaseGroupOffset: state.releaseGroupOffset + fetched.length,
        };
      }
    }
  }

  const hasMore = computeHasMore(state);

  return { tracks: pageTracks, cursor: state, hasMore };
}
