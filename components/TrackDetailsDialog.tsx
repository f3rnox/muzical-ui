'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useLibrary } from '@/components/LibraryProvider'
import TrackMetadataEditor from '@/components/TrackMetadataEditor'
import extractExtendedAudioMetadataFromFile from '@/lib/library/extract-extended-audio-metadata-from-file'
import applyTrackMetadataPatch from '@/lib/track/apply-track-metadata-patch'
import type { TrackMetadataFields } from '@/lib/track/apply-track-metadata-patch'
import buildTrackDetailRows from '@/lib/track/build-track-detail-rows'
import type { TrackDetailRow } from '@/lib/track/track-detail-row'
import type { Track } from '@/types/track'

type TrackDetailsDialogProps = {
  track: Track | null
  onClose: () => void
}

function DetailSection(props: { title: string; rows: readonly TrackDetailRow[] }) {
  if (props.rows.length === 0) return null
  return (
    <section>
      <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">{props.title}</h3>
      <dl className="mt-2 divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {props.rows.map((row) => (
          <div
            key={`${props.title}-${row.label}`}
            className="grid gap-0.5 px-3 py-2 sm:grid-cols-[7rem_1fr] sm:gap-3"
          >
            <dt className="text-xs font-medium text-zinc-500">{row.label}</dt>
            <dd
              className={[
                'text-sm break-words text-zinc-900 dark:text-zinc-100',
                row.mono ? 'font-mono text-xs' : '',
              ].join(' ')}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/**
 * Modal showing track, file, and embedded metadata for a song.
 */
export default function TrackDetailsDialog(props: TrackDetailsDialogProps) {
  const { track, onClose } = props
  const { roots, resolveFileForTrack, patchTrackById } = useLibrary()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [fileRows, setFileRows] = useState<TrackDetailRow[]>([])
  const [fileLoading, setFileLoading] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)

  const readonlyTrackRows = useMemo(
    () => (track ? buildTrackDetailRows(track, roots, { omitEditableTags: true }) : []),
    [track, roots],
  )

  const onSaveMetadata = useCallback(
    (fields: TrackMetadataFields) => {
      if (!track) return
      patchTrackById(track.id, (t) => applyTrackMetadataPatch(t, fields))
    },
    [patchTrackById, track],
  )

  useEffect(() => {
    if (!track?.library) return undefined

    let cancelled = false
    const frameId = requestAnimationFrame(() => {
      if (cancelled) return
      setFileLoading(true)
      setFileError(null)
      setFileRows([])
    })

    void resolveFileForTrack(track)
      .then(async (file) => {
        if (cancelled) return
        if (!file) {
          setFileError('Could not open the file. Try rescanning the library folder.')
          return
        }
        const rows = await extractExtendedAudioMetadataFromFile(file)
        if (!cancelled) setFileRows(rows)
      })
      .catch(() => {
        if (!cancelled) setFileError('Failed to read file metadata.')
      })
      .finally(() => {
        if (!cancelled) setFileLoading(false)
      })

    return () => {
      cancelled = true
      cancelAnimationFrame(frameId)
    }
  }, [track, resolveFileForTrack])

  useEffect(() => {
    if (track?.library) return undefined
    const frameId = requestAnimationFrame(() => {
      setFileRows([])
      setFileLoading(false)
      setFileError(null)
    })
    return () => cancelAnimationFrame(frameId)
  }, [track?.library, track?.id])

  useEffect(() => {
    if (!track) return undefined
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    panelRef.current?.focus()
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [track, onClose])

  if (!track) return null

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
        className="flex max-h-[min(85vh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {track.title}
            </h2>
            <p className="truncate text-sm text-zinc-500">
              {track.artist} · {track.album}
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
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4">
          <TrackMetadataEditor track={track} onSave={onSaveMetadata} />
          <DetailSection title="Details" rows={readonlyTrackRows} />
          {track.library ? (
            <section>
              <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                File &amp; embedded metadata
              </h3>
              {fileLoading ? (
                <p className="mt-2 text-sm text-zinc-500">Reading file…</p>
              ) : null}
              {fileError ? (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                  {fileError}
                </p>
              ) : null}
              {!fileLoading && !fileError && fileRows.length > 0 ? (
                <dl className="mt-2 divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                  {fileRows.map((row) => (
                    <div
                      key={`file-${row.label}`}
                      className="grid gap-0.5 px-3 py-2 sm:grid-cols-[7rem_1fr] sm:gap-3"
                    >
                      <dt className="text-xs font-medium text-zinc-500">{row.label}</dt>
                      <dd
                        className={[
                          'text-sm text-zinc-900 break-words dark:text-zinc-100',
                          row.mono ? 'font-mono text-xs' : '',
                        ].join(' ')}
                      >
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}
