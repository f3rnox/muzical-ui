'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLibrary } from '@/components/LibraryProvider'
import MusicBrainzTrackRow from '@/components/MusicBrainzTrackRow'
import { groupTracksByAlbum } from '@/lib/musicbrainz/group-tracks-by-album'
import { groupTracksByArtist } from '@/lib/musicbrainz/group-tracks-by-artist'
import { searchMusicBrainz } from '@/lib/musicbrainz'
import collectYoutubePrefetchTargets from '@/lib/youtube/collect-youtube-prefetch-targets'
import prefetchYoutubeVideoIds from '@/lib/youtube/prefetch-youtube-video-ids'
import readYoutubeDataApiBlocked from '@/lib/youtube/read-youtube-data-api-blocked'
import type { Track } from '@/types/track'

type MusicBrainzBrowseMode = 'artist' | 'album' | 'song'

const BROWSE_MODES: readonly MusicBrainzBrowseMode[] = ['artist', 'album', 'song']

/**
 * Search MusicBrainz recordings and browse results by artist, album, or song.
 */
export default function MusicBrainzBrowser() {
  const { libraryTracks, addToLibrary, addToQueue, compactLists } = useLibrary()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Track[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<MusicBrainzBrowseMode>('song')
  const [artistPick, setArtistPick] = useState<string | null>(null)
  const [albumPick, setAlbumPick] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<number | null>(null)

  const compact = compactLists
  const ulSpaceYClass = compact ? 'space-y-0.25' : 'space-y-0.5'
  const rowPadLgClass = compact ? 'px-2 py-2' : 'px-3 py-2.5'
  const rowGapLgClass = compact ? 'gap-2' : 'gap-3'

  const isSaved = useCallback(
    (trackId: string) => libraryTracks.some((x) => x.id === trackId),
    [libraryTracks],
  )

  const resetSearch = useCallback(() => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    setResults([])
    setLoading(false)
    setError(null)
    setArtistPick(null)
    setAlbumPick(null)
  }, [])

  const goMode = useCallback((m: MusicBrainzBrowseMode) => {
    setMode(m)
    setArtistPick(null)
    setAlbumPick(null)
  }, [])

  const onQueryChange = useCallback(
    (value: string) => {
      setQuery(value)
      setArtistPick(null)
      setAlbumPick(null)
      const q = value.trim()
      if (q.length < 3) {
        resetSearch()
        return
      }
      setLoading(true)
      setError(null)
    },
    [resetSearch],
  )

  useEffect(() => {
    const q = query.trim()
    if (q.length < 3) return undefined

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }

    const controller = new AbortController()
    abortRef.current = controller

    debounceRef.current = window.setTimeout(() => {
      void searchMusicBrainz(q, controller.signal, mode)
        .then((res) => {
          setResults(res)
          setError(null)
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === 'AbortError') return
          if (typeof err === 'object' && err !== null && 'name' in err && err.name === 'AbortError') return
          setError(err instanceof Error ? err.message : 'MusicBrainz search failed')
          setResults([])
        })
        .finally(() => setLoading(false))
    }, 300)

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      if (abortRef.current) {
        abortRef.current.abort()
        abortRef.current = null
      }
    }
  }, [query, mode])

  useEffect(() => {
    if (readYoutubeDataApiBlocked() || results.length === 0) return undefined
    const targets = collectYoutubePrefetchTargets(results).slice(0, 12)
    if (targets.length === 0) return undefined
    const controller = new AbortController()
    void prefetchYoutubeVideoIds(
      targets,
      (trackId, videoId) => {
        setResults((prev) =>
          prev.map((t) => (t.id === trackId ? { ...t, youtubeVideoId: videoId } : t)),
        )
      },
      { signal: controller.signal },
    )
    return (): void => {
      controller.abort()
    }
  }, [results])

  const onQueue = useCallback((t: Track) => addToQueue(t), [addToQueue])
  const onSave = useCallback((t: Track) => addToLibrary(t), [addToLibrary])
  const onAddMany = useCallback(
    (list: readonly Track[]) => {
      if (list.length === 0) return
      addToQueue(list)
    },
    [addToQueue],
  )

  const artistMap = useMemo(() => groupTracksByArtist(results), [results])
  const albumMap = useMemo(() => groupTracksByAlbum(results), [results])

  const artistNames = useMemo(
    () => [...artistMap.keys()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    [artistMap],
  )

  const albumKeys = useMemo(
    () =>
      [...albumMap.keys()].sort((a, b) => {
        const [albumA, artistA] = a.split('\u0000')
        const [albumB, artistB] = b.split('\u0000')
        const c = albumA.localeCompare(albumB, undefined, { sensitivity: 'base' })
        return c !== 0 ? c : artistA.localeCompare(artistB, undefined, { sensitivity: 'base' })
      }),
    [albumMap],
  )

  const trimmed = query.trim()
  const queryTooShort = trimmed.length > 0 && trimmed.length < 3
  const hasResults = results.length > 0

  const renderTrackList = (tracks: readonly Track[], subtitleFor?: (t: Track) => string) => (
    <ul className={ulSpaceYClass}>
      {tracks.map((t) => (
        <li key={t.id}>
          <MusicBrainzTrackRow
            track={t}
            alreadySaved={isSaved(t.id)}
            compact={compact}
            onQueue={onQueue}
            onSave={onSave}
            subtitle={subtitleFor?.(t)}
          />
        </li>
      ))}
    </ul>
  )

  const renderResultsBody = () => {
    if (mode === 'song') {
      return renderTrackList(results)
    }

    if (mode === 'artist') {
      if (artistPick === null) {
        return (
          <ul className={ulSpaceYClass}>
            {artistNames.map((name) => {
              const n = artistMap.get(name)?.length ?? 0
              return (
                <li key={name} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setArtistPick(name)}
                    className={`flex min-w-0 flex-1 cursor-pointer items-center justify-between rounded-lg ${rowPadLgClass} text-left text-sm text-zinc-800 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800/80`}
                  >
                    <span className="truncate font-medium">{name}</span>
                    <span className="shrink-0 text-xs tabular-nums text-zinc-500">{n}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onAddMany(artistMap.get(name) ?? [])}
                    disabled={n === 0}
                    className="shrink-0 cursor-pointer self-center rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-500/25 transition hover:bg-amber-500/25 disabled:opacity-40 dark:text-amber-300 dark:ring-amber-500/40"
                  >
                    Add all
                  </button>
                </li>
              )
            })}
          </ul>
        )
      }

      const tracks = artistMap.get(artistPick) ?? []
      return (
        <div>
          <button
            type="button"
            onClick={() => setArtistPick(null)}
            className="mb-2 cursor-pointer px-2 text-xs font-medium text-amber-700 hover:underline dark:text-amber-400"
          >
            ← Artists
          </button>
          <div className="mb-2 px-2">
            <button
              type="button"
              onClick={() => onAddMany(tracks)}
              disabled={tracks.length === 0}
              className="cursor-pointer rounded-full border border-zinc-200 bg-white px-2 py-1 text-xs font-medium dark:border-zinc-700 dark:bg-zinc-900"
            >
              Add all
            </button>
          </div>
          {renderTrackList(tracks, (t) => t.album)}
        </div>
      )
    }

    if (albumPick === null) {
      return (
        <ul className={ulSpaceYClass}>
          {albumKeys.map((key) => {
            const [album, artist] = key.split('\u0000')
            const n = albumMap.get(key)?.length ?? 0
            return (
              <li key={key} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setAlbumPick(key)}
                  className={`flex min-w-0 flex-1 cursor-pointer items-center ${rowGapLgClass} rounded-lg ${rowPadLgClass} text-left transition hover:bg-zinc-100 dark:hover:bg-zinc-800/80`}
                >
                  <div className="flex min-w-0 flex-1 flex-col items-start">
                    <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{album}</span>
                    <span className="truncate text-xs text-zinc-500">{artist}</span>
                    <span className="mt-0.5 text-xs text-zinc-400">
                      {n} track{n === 1 ? '' : 's'}
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onAddMany(albumMap.get(key) ?? [])}
                  disabled={n === 0}
                  className="shrink-0 cursor-pointer self-center rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-500/25 transition hover:bg-amber-500/25 disabled:opacity-40 dark:text-amber-300 dark:ring-amber-500/40"
                >
                  Add all
                </button>
              </li>
            )
          })}
        </ul>
      )
    }

    const tracks = albumMap.get(albumPick) ?? []
    return (
      <div>
        <button
          type="button"
          onClick={() => setAlbumPick(null)}
          className="mb-2 cursor-pointer px-2 text-xs font-medium text-amber-700 hover:underline dark:text-amber-400"
        >
          ← Albums
        </button>
        <div className="mb-2 px-2">
          <button
            type="button"
            onClick={() => onAddMany(tracks)}
            disabled={tracks.length === 0}
            className="cursor-pointer rounded-full border border-zinc-200 bg-white px-2 py-1 text-xs font-medium dark:border-zinc-700 dark:bg-zinc-900"
          >
            Add all
          </button>
        </div>
        {renderTrackList(tracks, (t) => t.artist)}
      </div>
    )
  }

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/30 lg:border-b-0 lg:border-r">
      <div className="shrink-0 space-y-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div>
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">MusicBrainz</h2>
          <p className="mt-1 text-xs text-zinc-400">
            Discover recordings via MusicBrainz; streams via YouTube in the background (Settings → YouTube).
          </p>
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Songs, artists, or releases…"
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-amber-500/0 transition focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-amber-500/60"
          aria-label="Search MusicBrainz"
        />
        <div className="flex flex-wrap gap-1">
          {BROWSE_MODES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => goMode(m)}
              className={[
                'cursor-pointer rounded-full px-3 py-1 text-xs font-medium capitalize transition',
                mode === m
                  ? 'bg-amber-500 text-zinc-950'
                  : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700',
              ].join(' ')}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-2 py-2">
        {error ? (
          <p className="px-2 py-4 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : loading ? (
          <p className="px-2 py-6 text-center text-sm text-zinc-500">Searching MusicBrainz…</p>
        ) : queryTooShort ? (
          <p className="px-2 py-6 text-center text-sm text-zinc-500">Type at least 3 characters to search.</p>
        ) : trimmed.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-zinc-500">
            Search MusicBrainz to find recordings to queue or save to your library.
          </p>
        ) : !hasResults ? (
          <p className="px-2 py-6 text-center text-sm text-zinc-500">No MusicBrainz results for that query.</p>
        ) : (
          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-2">
              <p className="text-xs text-zinc-500">
                {results.length} recording{results.length === 1 ? '' : 's'}
                {mode === 'artist' && artistNames.length > 0
                  ? ` · ${artistNames.length} artist${artistNames.length === 1 ? '' : 's'}`
                  : ''}
                {mode === 'album' && albumKeys.length > 0
                  ? ` · ${albumKeys.length} album${albumKeys.length === 1 ? '' : 's'}`
                  : ''}
              </p>
              <button
                type="button"
                onClick={() => onAddMany(results)}
                className="cursor-pointer rounded-full border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Add all to queue
              </button>
            </div>
            {renderResultsBody()}
          </div>
        )}
      </div>
    </section>
  )
}
