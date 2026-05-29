'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useLibrary } from '@/components/LibraryProvider'
import ArtistMetadataEditor from '@/components/ArtistMetadataEditor'
import applyArtistMetadataPatch from '@/lib/track/apply-artist-metadata-patch'
import type { ArtistMetadataFields } from '@/lib/track/apply-artist-metadata-patch'
import tracksMatchingArtistName from '@/lib/library/tracks-matching-artist-name'
import { artistDisplayName } from '@/lib/library/favorite-keys'

type ArtistMetadataDialogProps = {
  artistName: string
  trackCount: number
  albumCount: number
  onClose: () => void
  onRenamed: (newArtistName: string) => void
}

/**
 * Modal to edit artist metadata for all tracks credited to an artist.
 */
export default function ArtistMetadataDialog(props: ArtistMetadataDialogProps) {
  const { artistName, trackCount, albumCount, onClose, onRenamed } = props
  const { libraryTracks, patchArtistMetadataByKey, writeLibraryTracksToFiles } = useLibrary()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const onCloseRef = useRef(onClose)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const hasYoutubeTracks = useMemo(() => {
    return libraryTracks.some(
      (t) => artistDisplayName(t.artist) === artistName && Boolean(t.youtubeQuery?.trim()),
    )
  }, [artistName, libraryTracks])

  const onSave = useCallback(
    async (fields: ArtistMetadataFields) => {
      setSaving(true)
      setSaveError(null)
      const toPatch = tracksMatchingArtistName(libraryTracks, artistName)
      const patched = toPatch.map((t) => applyArtistMetadataPatch(t, fields))
      const newName = patchArtistMetadataByKey(artistName, fields)
      if (!newName) {
        setSaving(false)
        setSaveError('Could not update artist metadata.')
        return
      }
      const fileWrite = await writeLibraryTracksToFiles(patched)
      setSaving(false)
      if (!fileWrite.ok && fileWrite.failedCount > 0) {
        const detail =
          fileWrite.writtenCount > 0
            ? ` Updated ${fileWrite.writtenCount} file${fileWrite.writtenCount === 1 ? '' : 's'}; ${fileWrite.failedCount} failed.`
            : ''
        setSaveError(`${fileWrite.reason ?? 'Could not write tags to audio files.'}${detail}`)
        onRenamed(newName)
        return
      }
      onRenamed(newName)
      onClose()
    },
    [artistName, libraryTracks, onClose, onRenamed, patchArtistMetadataByKey, writeLibraryTracksToFiles],
  )

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKeyDown)
    panelRef.current?.focus()
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

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
        className="flex max-h-[min(85vh,28rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Edit artist metadata
            </h2>
            <p className="truncate text-sm text-zinc-500">{artistName}</p>
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
          <ArtistMetadataEditor
            artist={artistName}
            trackCount={trackCount}
            albumCount={albumCount}
            hasYoutubeTracks={hasYoutubeTracks}
            saving={saving}
            saveError={saveError}
            onSave={onSave}
          />
        </div>
      </div>
    </div>
  )
}
