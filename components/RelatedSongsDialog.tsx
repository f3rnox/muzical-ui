'use client'

import Link from 'next/link'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useLibrary } from '@/components/LibraryProvider'
import MusicBrainzTrackRow from '@/components/MusicBrainzTrackRow'
import fetchLastfmTrackGetSimilar from '@/lib/lastfm/fetch-lastfm-track-get-similar'
import lastfmSimilarTrackToAppTrack from '@/lib/lastfm/lastfm-similar-track-to-app-track'
import parseMusicbrainzIdFromTrackId from '@/lib/lastfm/parse-musicbrainz-id-from-track-id'
import readStoredLastfmApiKey from '@/lib/lastfm/read-stored-lastfm-api-key'
import isPersistedLibraryTrack from '@/lib/library/is-persisted-library-track'
import type { Track } from '@/types/track'

type RelatedSongsDialogProps = {
  seedTrack: Track | null
  onClose: () => void
}

/**
 * Modal listing tracks similar to a seed song (Last.fm `track.getSimilar`).
 */
export default function RelatedSongsDialog(props: RelatedSongsDialogProps) {
  const { seedTrack, onClose } = props
  const { libraryTracks, addToQueue, addToLibrary, compactLists } = useLibrary()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [similarTracks, setSimilarTracks] = useState<Track[]>([])

  const savedIdSet = useMemo(
    () => new Set(libraryTracks.map((t) => t.id)),
    [libraryTracks],
  )

  useEffect(() => {
    if (!seedTrack) return undefined
    if (!readStoredLastfmApiKey()) {
      setLoading(false)
      setError(null)
      setSimilarTracks([])
      return undefined
    }
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    setSimilarTracks([])

    const mbid = parseMusicbrainzIdFromTrackId(seedTrack.id)
    void fetchLastfmTrackGetSimilar(
      {
        artist: seedTrack.artist,
        track: seedTrack.title,
        mbid: mbid ?? undefined,
        limit: 25,
      },
      controller.signal,
    )
      .then((items) => {
        setSimilarTracks(items.map(lastfmSimilarTrackToAppTrack))
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : 'Failed to load related songs')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [seedTrack])

  useEffect(() => {
    if (!seedTrack) return undefined
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [seedTrack, onClose])

  const onAddAll = useCallback(() => {
    if (similarTracks.length === 0) return
    addToQueue(similarTracks)
  }, [addToQueue, similarTracks])

  if (!seedTrack) return null

  const hasApiKey = readStoredLastfmApiKey().length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/50 p-4 sm:items-center"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[min(85vh,36rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Related songs
            </h2>
            <p className="mt-0.5 truncate text-sm text-zinc-600 dark:text-zinc-400">
              {seedTrack.title} · {seedTrack.artist}
            </p>
            <p className="mt-1 text-xs text-zinc-500">Via Last.fm listening similarity</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full px-2 py-1 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3">
          {!hasApiKey ? (
            <p className="px-2 py-4 text-sm text-zinc-600 dark:text-zinc-400">
              Add a Last.fm API key in{' '}
              <Link
                href="/settings/lastfm"
                className="font-medium text-accent-700 underline-offset-2 hover:underline dark:text-accent-400"
                onClick={onClose}
              >
                Settings → Last.fm
              </Link>
              .
            </p>
          ) : null}

          {loading ? (
            <p className="px-2 py-6 text-center text-sm text-zinc-500">Loading related songs…</p>
          ) : null}

          {error ? (
            <p className="px-2 py-4 text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : null}

          {!loading && !error && hasApiKey && similarTracks.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-zinc-500">No similar tracks found.</p>
          ) : null}

          {!loading && similarTracks.length > 0 ? (
            <ul className="space-y-0.5">
              {similarTracks.map((t) => (
                <li key={t.id}>
                  <MusicBrainzTrackRow
                    track={t}
                    compact={compactLists}
                    alreadySaved={savedIdSet.has(t.id) || isPersistedLibraryTrack(t)}
                    onQueue={addToQueue}
                    onSave={addToLibrary}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {similarTracks.length > 0 ? (
          <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <button
              type="button"
              onClick={onAddAll}
              className="w-full rounded-full bg-accent-500 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-accent-400"
            >
              Add all to queue ({similarTracks.length})
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
