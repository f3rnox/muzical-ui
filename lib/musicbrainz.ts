import type { Track } from '@/types/track'

export type MusicBrainzRecording = {
  id: string
  title: string
  length?: number
  'artist-credit'?: Array<{ name?: string }>
  releases?: Array<{ title?: string }>
}

export async function searchMusicBrainzRecordings(query: string, signal?: AbortSignal): Promise<Track[]> {
  const trimmed = query.trim()
  if (!trimmed) return []
  const url = new URL('https://musicbrainz.org/ws/2/recording')
  url.searchParams.set('query', trimmed)
  url.searchParams.set('fmt', 'json')
  url.searchParams.set('limit', '12')
  url.searchParams.set('inc', 'artist-credits+releases')

  const isDev = process.env.NODE_ENV === 'development'
  if (isDev) {
    console.log('[MusicBrainz] Request:', {
      query: trimmed,
      url: url.toString(),
    })
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'User-Agent': 'MuzicalUI/1.0 (https://github.com/f3rnox/muzical-ui)',
    },
    signal,
  })

  if (isDev) {
    console.log('[MusicBrainz] Response:', {
      status: response.status,
      ok: response.ok,
    })
  }

  if (!response.ok) {
    throw new Error(`MusicBrainz search failed (${response.status})`)
  }

  const body = (await response.json()) as { recordings?: MusicBrainzRecording[] }

  if (isDev) {
    console.log('[MusicBrainz] Full response body:', body)
  }

  const recordings = Array.isArray(body.recordings) ? body.recordings : []

  if (isDev) {
    console.log('[MusicBrainz] Parsed results:', {
      count: recordings.length,
      hasRecordingsField: 'recordings' in body,
      recordingsType: typeof body.recordings,
      isArray: Array.isArray(body.recordings),
      recordings: recordings.slice(0, 3).map((r) => ({
        id: r.id,
        title: r.title,
        artist: r['artist-credit']?.map((c) => c.name).join(' & '),
      })),
    })
  }

  return recordings.map((recording) => {
    const artist = recording['artist-credit']
      ?.map((credit) => credit.name?.trim())
      .filter(Boolean)
      .join(' & ') ?? 'Unknown artist'
    const release = recording.releases?.[0]?.title?.trim() ?? 'Unknown album'
    const youtubeQuery = `${recording.title ?? 'Unknown title'} ${artist}`.trim()

    return {
      id: `musicbrainz:${recording.id}`,
      title: recording.title ?? 'Unknown title',
      artist,
      album: release,
      durationSec: recording.length && Number.isFinite(recording.length)
        ? Math.round(recording.length / 1000)
        : 0,
      audioUrl: `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(youtubeQuery)}&autoplay=1&controls=1&rel=0&modestbranding=1`,
      source: 'youtube',
      youtubeQuery,
    }
  })
}
