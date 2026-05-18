import { buildMusicBrainzLuceneQueries } from '@/lib/musicbrainz/build-musicbrainz-lucene-queries'
import { buildReleaseGroupLuceneQuery } from '@/lib/musicbrainz/build-release-group-lucene-query'
import { fetchReleaseTracks } from '@/lib/musicbrainz/fetch-release-tracks'
import { mergeTracksById } from '@/lib/musicbrainz/merge-tracks-by-id'
import { pickReleaseGroupReleaseId } from '@/lib/musicbrainz/pick-release-group-release-id'
import { releaseGroupArtistName } from '@/lib/musicbrainz/release-group-artist-name'
import { searchMusicBrainzRecordingsQuery } from '@/lib/musicbrainz/search-musicbrainz-recordings'
import { searchMusicBrainzReleaseGroups } from '@/lib/musicbrainz/search-musicbrainz-release-groups'
import type { Track } from '@/types/track'

export type MusicBrainzSearchMode = 'artist' | 'album' | 'song'

const MAX_RECORDING_RESULTS = 40
const MAX_RECORDING_QUERIES = 2
const MAX_RELEASE_GROUP_EXPAND = 3

/**
 * Search MusicBrainz across recordings and release groups; returns deduped tracks.
 */
export async function searchMusicBrainz(
  query: string,
  signal?: AbortSignal,
  mode: MusicBrainzSearchMode = 'song',
): Promise<Track[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const { queries, hints } = buildMusicBrainzLuceneQueries(trimmed)
  const merged: Track[] = []

  const recordingQueries =
    mode === 'album'
      ? queries.slice(0, 1)
      : queries.slice(0, MAX_RECORDING_QUERIES)

  for (const luceneQuery of recordingQueries) {
    if (signal?.aborted) return merged
    const batch = await searchMusicBrainzRecordingsQuery(
      luceneQuery,
      hints,
      signal,
      25,
    )
    mergeTracksById(merged, batch)
    if (merged.length >= MAX_RECORDING_RESULTS) break
  }

  const releaseGroupQuery = buildReleaseGroupLuceneQuery(trimmed, hints)
  const groups = await searchMusicBrainzReleaseGroups(releaseGroupQuery, signal, 10)
  const albumHint = hints.album?.trim().toLowerCase() ?? ''
  const prioritized = [...groups].sort((a, b) => {
    if (!albumHint) return 0
    const aTitle = a.title?.trim().toLowerCase() ?? ''
    const bTitle = b.title?.trim().toLowerCase() ?? ''
    const aScore = aTitle === albumHint ? 2 : aTitle.includes(albumHint) ? 1 : 0
    const bScore = bTitle === albumHint ? 2 : bTitle.includes(albumHint) ? 1 : 0
    return bScore - aScore
  })

  const expandLimit = mode === 'album' ? MAX_RELEASE_GROUP_EXPAND : 2
  let expanded = 0
  for (const group of prioritized) {
    if (signal?.aborted) break
    if (expanded >= expandLimit) break
    const releaseId = pickReleaseGroupReleaseId(group)
    if (!releaseId) continue
    const artist = releaseGroupArtistName(group)
    const album = group.title?.trim() || 'Unknown album'
    const tracks = await fetchReleaseTracks(releaseId, album, artist, signal)
    mergeTracksById(merged, tracks)
    expanded += 1
  }

  return merged
}
