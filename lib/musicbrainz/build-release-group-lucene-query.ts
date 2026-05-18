import { escapeLuceneTerm } from '@/lib/musicbrainz/escape-lucene-term'
import type { MusicBrainzSearchHints } from '@/lib/musicbrainz/build-musicbrainz-lucene-queries'

/**
 * Build a release-group Lucene query from search hints.
 */
export function buildReleaseGroupLuceneQuery(
  raw: string,
  hints: MusicBrainzSearchHints,
): string {
  const trimmed = raw.trim()
  if (hints.artist && hints.album) {
    const artist = escapeLuceneTerm(hints.artist)
    const album = escapeLuceneTerm(hints.album)
    return `artist:${artist} AND releasegroup:${album}`
  }
  return trimmed
}
