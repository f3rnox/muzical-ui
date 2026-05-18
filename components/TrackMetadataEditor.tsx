'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import applyTrackMetadataPatch from '@/lib/track/apply-track-metadata-patch'
import type { TrackMetadataFields } from '@/lib/track/apply-track-metadata-patch'
import type { Track } from '@/types/track'

const INPUT_CLASS =
  'mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-accent-500/0 transition focus:border-accent-400 focus:ring-2 focus:ring-accent-500/20 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100'

type TrackMetadataEditorProps = {
  track: Track
  canWriteToFile: boolean
  saving: boolean
  saveError: string | null
  onSave: (fields: TrackMetadataFields) => Promise<void>
}

function fieldsFromTrack(track: Track): TrackMetadataFields {
  return {
    title: track.title,
    artist: track.artist,
    album: track.album,
  }
}

function fieldsEqual(a: TrackMetadataFields, b: TrackMetadataFields): boolean {
  return a.title === b.title && a.artist === b.artist && a.album === b.album
}

/**
 * Editable title, artist, and album fields for the track details dialog.
 */
export default function TrackMetadataEditor(props: TrackMetadataEditorProps) {
  const { track, canWriteToFile, saving, saveError, onSave } = props
  const [draft, setDraft] = useState<TrackMetadataFields>(() => fieldsFromTrack(track))
  const [saved, setSaved] = useState<TrackMetadataFields>(() => fieldsFromTrack(track))

  useEffect(() => {
    const next = fieldsFromTrack(track)
    setDraft(next)
    setSaved(next)
  }, [track.id, track.title, track.artist, track.album])

  const isDirty = !fieldsEqual(draft, saved)
  const canSave = isDirty && draft.title.trim() !== '' && draft.artist.trim() !== ''

  const onRevert = useCallback(() => {
    setDraft(saved)
  }, [saved])

  const onSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()
      if (!canSave || saving) return
      const normalized = applyTrackMetadataPatch(track, draft)
      const fields: TrackMetadataFields = {
        title: normalized.title,
        artist: normalized.artist,
        album: normalized.album,
      }
      await onSave(fields)
      setSaved(fields)
      setDraft(fields)
    },
    [canSave, draft, onSave, saving, track],
  )

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Metadata</h3>
      <label className="block">
        <span className="text-xs font-medium text-zinc-500">Title</span>
        <input
          type="text"
          value={draft.title}
          onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
          className={INPUT_CLASS}
          autoComplete="off"
          required
        />
      </label>
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
      {canWriteToFile ? (
        <p className="text-xs text-zinc-500">
          Saving also writes ID3 tags to MP3 files when the library folder allows write access.
        </p>
      ) : null}
      {track.youtubeQuery?.trim() ? (
        <p className="text-xs text-zinc-500">
          Saving updates the YouTube search query and clears any resolved video id for this track.
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
          {saving ? 'Saving…' : 'Save'}
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
