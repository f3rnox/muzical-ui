'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLibrary } from '@/components/LibraryProvider'
import useSyncBrowseSearchFromUrl from '@/lib/browse/use-sync-browse-search-from-url'
import RecentBrowseSearchSuggestions from '@/components/RecentBrowseSearchSuggestions'
import MusicBrainzTrackRow from '@/components/MusicBrainzTrackRow'
import searchYoutubeTracks from '@/lib/youtube/search-youtube-tracks'
import useYoutubeApiKeyReady from '@/lib/youtube/use-youtube-api-key-ready'
import { YOUTUBE_SEARCH_DEBOUNCE_MS } from '@/lib/youtube/youtube-search-constants'
import type { Track } from '@/types/track'

/**
 * Search YouTube and add results to the queue or library.
 */
export default function YouTubeSearchBrowser() {
  const { libraryTracks, addToLibrary, addToQueue, compactLists, recordRecentBrowseSearch } = useLibrary()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Track[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<number | null>(null)
  const { checked: apiKeyChecked, blocked: apiBlocked, hasKey: hasYoutubeApiKey } = useYoutubeApiKeyReady()
  const [searchSource, setSearchSource] = useState<'api' | 'scrape' | null>(null)
  const canSearch = apiKeyChecked
  const compact = compactLists
  const ulSpaceYClass = compact ? 'space-y-0.25' : 'space-y-0.5'

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
    setSearchSource(null)
  }, [])

  const onQueryChange = useCallback(
    (value: string) => {
      setQuery(value)
      const q = value.trim()
      if (q.length < 2) {
        resetSearch()
        return
      }
      if (!canSearch) {
        setError(null)
        setResults([])
        return
      }
      setLoading(true)
      setError(null)
    },
    [canSearch, resetSearch],
  )

  useSyncBrowseSearchFromUrl(searchParams, onQueryChange)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2 || !canSearch) return undefined

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
      setLoading(true)
      void searchYoutubeTracks(q, controller.signal)
        .then((res) => {
          setResults(res.tracks)
          setSearchSource(res.source)
          setError(null)
          recordRecentBrowseSearch('youtube', q)
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === 'AbortError') return
          if (typeof err === 'object' && err !== null && 'name' in err && err.name === 'AbortError') return
          setSearchSource(null)
          setError(err instanceof Error ? err.message : 'YouTube search failed')
          setResults([])
        })
        .finally(() => setLoading(false))
    }, YOUTUBE_SEARCH_DEBOUNCE_MS)

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
  }, [query, canSearch, recordRecentBrowseSearch])

  const onQueue = useCallback((t: Track) => addToQueue(t), [addToQueue])
  const onSave = useCallback((t: Track) => addToLibrary(t), [addToLibrary])
  const onSaveMany = useCallback(
    (list: readonly Track[]) => {
      const unsaved = list.filter((t) => !isSaved(t.id))
      if (unsaved.length > 0) addToLibrary(unsaved)
    },
    [addToLibrary, isSaved],
  )
  const onAddMany = useCallback(
    (list: readonly Track[]) => {
      if (list.length === 0) return
      addToQueue(list)
    },
    [addToQueue],
  )

  const trimmed = query.trim()
  const queryTooShort = trimmed.length > 0 && trimmed.length < 2
  const hasResults = results.length > 0

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/30 lg:border-b-0 lg:border-r">
      <div className="shrink-0 space-y-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div>
          <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">YouTube</h2>
          <p className="mt-1 text-xs text-zinc-400">
            Search YouTube and add videos to your queue or library. A Data API key in{' '}
            <Link href="/settings/youtube" className="font-medium text-accent-700 hover:underline dark:text-accent-400">
              Settings → YouTube
            </Link>{' '}
            improves results; if quota runs out, search falls back automatically.
          </p>
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search YouTube…"
          disabled={!canSearch}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none ring-accent-500/0 transition focus:border-accent-400 focus:ring-2 focus:ring-accent-500/20 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-accent-500/60"
          aria-label="Search YouTube"
        />
        <RecentBrowseSearchSuggestions source="youtube" onSelect={onQueryChange} />
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-2 py-2">
        {canSearch && error ? (
          <p className="px-2 py-4 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}
        {canSearch && !hasYoutubeApiKey && searchSource === 'scrape' && (apiBlocked || trimmed.length >= 2) ? (
          <p className="px-2 pb-2 text-center text-xs text-zinc-500">
            Using fallback search (API quota exceeded or unavailable). Durations may be missing.
            {apiBlocked ? (
              <>
                {' '}
                Save your key again in{' '}
                <Link href="/settings/youtube" className="font-medium text-accent-700 hover:underline dark:text-accent-400">
                  Settings → YouTube
                </Link>{' '}
                to retry the Data API.
              </>
            ) : null}
          </p>
        ) : null}
        {canSearch && loading ? (
          <p className="px-2 py-6 text-center text-sm text-zinc-500">Searching YouTube…</p>
        ) : null}
        {canSearch && queryTooShort ? (
          <p className="px-2 py-6 text-center text-sm text-zinc-500">Type at least 2 characters to search.</p>
        ) : null}
        {canSearch && trimmed.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-zinc-500">
            Search YouTube to find videos to queue or save to your library.
          </p>
        ) : null}
        {canSearch && !loading && trimmed.length >= 2 && !hasResults && !error ? (
          <p className="px-2 py-6 text-center text-sm text-zinc-500">No YouTube results for that query.</p>
        ) : null}
        {canSearch && hasResults ? (
          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-2">
              <p className="text-xs text-zinc-500">
                {results.length} video{results.length === 1 ? '' : 's'}
              </p>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => onAddMany(results)}
                  className="cursor-pointer rounded-full border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Add all to queue
                </button>
                <button
                  type="button"
                  onClick={() => onSaveMany(results)}
                  disabled={results.every((t) => isSaved(t.id))}
                  className="cursor-pointer rounded-full border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Save all to library
                </button>
              </div>
            </div>
            <ul className={ulSpaceYClass}>
              {results.map((t) => (
                <li key={t.id}>
                  <MusicBrainzTrackRow
                    track={t}
                    alreadySaved={isSaved(t.id)}
                    compact={compact}
                    onQueue={onQueue}
                    onSave={onSave}
                    subtitle={t.artist}
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  )
}
