'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { ArtistMetadataFields } from '@/lib/track/apply-artist-metadata-patch'

const INPUT_CLASS =
  'mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-accent-500/0 transition focus:border-accent-400 focus:ring-2 focus:ring-accent-500/20 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100'

type ArtistMetadataEditorProps = {
  artist: string
  trackCount: number
  albumCount: number
  hasYoutubeTracks: boolean
  saving: boolean
  saveError: string | null
  onSave: (fields: ArtistMetadataFields) => Promise<void>
}

/**
 * Editable artist field applied to every track credited to this artist.
 */
export default function ArtistMetadataEditor(props: ArtistMetadataEditorProps) {
  const { artist, trackCount, albumCount, hasYoutubeTracks, saving, saveError, onSave } = props
  const [draft, setDraft] = useState(artist)
  const [saved, setSaved] = useState(artist)

  useEffect(() => {
    setDraft(artist)
    setSaved(artist)
  }, [artist])

  const isDirty = draft !== saved
  const canSave = isDirty && draft.trim() !== ''

  const onRevert = useCallback(() => {
    setDraft(saved)
  }, [saved])

  const onSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()
      if (!canSave || saving) return
      const fields: ArtistMetadataFields = { artist: draft.trim() }
      await onSave(fields)
      setSaved(fields.artist)
      setDraft(fields.artist)
    },
    [canSave, draft, onSave, saving],
  )

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Updates the artist on {trackCount} track{trackCount === 1 ? '' : 's'} across{' '}
        {albumCount} album{albumCount === 1 ? '' : 's'}. Song titles and album names are unchanged.
        Saving also writes ID3 tags to each local MP3 file when write access is allowed.
      </p>
      <label className="block">
        <span className="text-xs font-medium text-zinc-500">Artist</span>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className={INPUT_CLASS}
          autoComplete="off"
          required
        />
      </label>
      {hasYoutubeTracks ? (
        <p className="text-xs text-zinc-500">
          Saving updates YouTube search queries and clears resolved video ids for affected tracks.
        </p>
      ) : null}
      {saveError ? (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          {saveError}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="submit"
          disabled={!canSave || saving}
          className="rounded-full bg-accent-500 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save to all tracks'}
        </button>
        <button
          type="button"
          disabled={!isDirty || saving}
          onClick={onRevert}
          className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          Revert
        </button>
      </div>
    </form>
  )
}
