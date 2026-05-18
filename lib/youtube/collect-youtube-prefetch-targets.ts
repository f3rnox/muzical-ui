import type { Track } from '@/types/track'
import type { YoutubePrefetchTarget } from '@/lib/youtube/prefetch-youtube-video-ids'

/**
 * Builds deduped prefetch targets from tracks missing a YouTube video id.
 */
export default function collectYoutubePrefetchTargets(
  tracks: readonly Track[],
): YoutubePrefetchTarget[] {
  const seen = new Set<string>()
  const out: YoutubePrefetchTarget[] = []
  for (const track of tracks) {
    const query = track.youtubeQuery?.trim()
    if (!query || track.youtubeVideoId?.trim()) continue
    if (seen.has(track.id)) continue
    seen.add(track.id)
    out.push({ trackId: track.id, query })
  }
  return out
}
