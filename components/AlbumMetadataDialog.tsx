'use client'

import { useCallback, useEffect, useId, useMemo, useRef } from 'react'
import { useLibrary } from '@/components/LibraryProvider'
import AlbumMetadataEditor from '@/components/AlbumMetadataEditor'
import type { AlbumMetadataFields } from '@/lib/track/apply-album-metadata-patch'
import { albumCompositeKey } from '@/lib/library/favorite-keys'

type AlbumMetadataDialogProps = {
  albumKey: string
  albumTitle: string
  artistName: string
  trackCount: number
  multipleTrackArtists: boolean
  onClose: () => void
  onSaved: (newAlbumKey: string) => void
}

/**
 * Modal to edit artist and album metadata for all tracks on an album.
 */
export default function AlbumMetadataDialog(props: AlbumMetadataDialogProps) {
  const {
    albumKey,
    albumTitle,
    artistName,
    trackCount,
    multipleTrackArtists,
    onClose,
    onSaved,
  } = props
  const { libraryTracks, patchAlbumMetadataByKey } = useLibrary()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement | null>(null)

  const hasYoutubeTracks = useMemo(() => {
    return libraryTracks.some(
      (t) => albumCompositeKey(t.album, t.artist) === albumKey && Boolean(t.youtubeQuery?.trim()),
    )
  }, [albumKey, libraryTracks])

  const onSave = useCallback(
    (fields: AlbumMetadataFields) => {
      const newKey = patchAlbumMetadataByKey(albumKey, fields)
      if (newKey) onSaved(newKey)
      onClose()
    },
    [albumKey, onClose, onSaved, patchAlbumMetadataByKey],
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    panelRef.current?.focus()
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/50 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="flex max-h-[min(85vh,32rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Edit album metadata
            </h2>
            <p className="truncate text-sm text-zinc-500">
              {albumTitle} · {artistName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 cursor-pointer rounded-lg px-2 py-1 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Close
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          <AlbumMetadataEditor
            artist={artistName}
            album={albumTitle}
            trackCount={trackCount}
            multipleTrackArtists={multipleTrackArtists}
            hasYoutubeTracks={hasYoutubeTracks}
            onSave={onSave}
          />
        </div>
      </div>
    </div>
  )
}
