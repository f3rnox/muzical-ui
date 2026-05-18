'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { AlbumMetadataFields } from '@/lib/track/apply-album-metadata-patch'

const INPUT_CLASS =
  'mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-accent-500/0 transition focus:border-accent-400 focus:ring-2 focus:ring-accent-500/20 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100'

type AlbumMetadataEditorProps = {
  artist: string
  album: string
  trackCount: number
  multipleTrackArtists: boolean
  hasYoutubeTracks: boolean
  onSave: (fields: AlbumMetadataFields) => void
}

function fieldsEqual(a: AlbumMetadataFields, b: AlbumMetadataFields): boolean {
  return a.artist === b.artist && a.album === b.album
}

/**
 * Editable artist and album fields applied to every track on an album.
 */
export default function AlbumMetadataEditor(props: AlbumMetadataEditorProps) {
  const { artist, album, trackCount, multipleTrackArtists, hasYoutubeTracks, onSave } = props
  const initial: AlbumMetadataFields = { artist, album }
  const [draft, setDraft] = useState<AlbumMetadataFields>(initial)
  const [saved, setSaved] = useState<AlbumMetadataFields>(initial)

  useEffect(() => {
    const next = { artist, album }
    setDraft(next)
    setSaved(next)
  }, [artist, album])

  const isDirty = !fieldsEqual(draft, saved)
  const canSave = isDirty && draft.artist.trim() !== ''

  const onRevert = useCallback(() => {
    setDraft(saved)
  }, [saved])

  const onSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault()
      if (!canSave) return
      const fields: AlbumMetadataFields = {
        artist: draft.artist.trim(),
        album: draft.album.trim() || saved.album,
      }
      onSave(fields)
      setSaved(fields)
      setDraft(fields)
    },
    [canSave, draft, onSave, saved.album],
  )

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Updates artist and album on {trackCount} track{trackCount === 1 ? '' : 's'}. Song titles are unchanged.
      </p>
      {multipleTrackArtists ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Tracks on this album currently have different artists; saving sets the same artist on all of them.
        </p>
      ) : null}
      <label className="block">
        <span className="text-xs font-medium text-zinc-500">Artist</span>
        <input
          type="text"
          value={draft.artist}
          onChange={(e) => setDraft((prev) => ({ ...prev, artist: e.target.value }))}
          className={INPUT_CLASS}
          autoComplete="off"
          required
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-zinc-500">Album</span>
        <input
          type="text"
          value={draft.album}
          onChange={(e) => setDraft((prev) => ({ ...prev, album: e.target.value }))}
          className={INPUT_CLASS}
          autoComplete="off"
        />
      </label>
      {hasYoutubeTracks ? (
        <p className="text-xs text-zinc-500">
          Saving updates YouTube search queries and clears resolved video ids for affected tracks.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="submit"
          disabled={!canSave}
          className="rounded-full bg-accent-500 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save to all tracks
        </button>
        <button
          type="button"
          disabled={!isDirty}
          onClick={onRevert}
          className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          Revert
        </button>
      </div>
    </form>
  )
}
