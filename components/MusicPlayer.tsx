'use client'

import Link from 'next/link'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import LibraryBrowser from '@/components/LibraryBrowser'
import { useLibrary } from '@/components/LibraryProvider'
import type { Track } from '@/types/track'
import { formatDuration } from '@/lib/format-duration'
import { extractCoverObjectUrlFromAudioFile } from '@/lib/library/extract-cover-object-url-from-audio-file'
import ThemeToggle from '@/components/ThemeToggle'

function IconPlay(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={props.className}>
      <path d="M8 5v14l11-7L8 5z" />
    </svg>
  )
}

function IconPause(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={props.className}>
      <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
    </svg>
  )
}

function IconSkipBack(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={props.className}>
      <path d="M6 6h2v12H6V6zm3.5 6 8.5 6V6l-8.5 6z" />
    </svg>
  )
}

function IconSkipForward(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={props.className}>
      <path d="M16 18h2V6h-2v12zM6 18l8.5-6L6 6v12z" />
    </svg>
  )
}

function IconVolume(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={props.className}>
      <path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  )
}

function IconQueue(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={props.className}>
      <path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h10v2H4v-2zm12 1v6l5-3-5-3z" />
    </svg>
  )
}

function IconSettings(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={props.className}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

/**
 * Local-library player: queue from scanned folders, `<audio>` playback via object URLs.
 */
export default function MusicPlayer() {
  const { queue, libraryTracks, isScanning, resolveFileForTrack, bumpTrackDuration, removeFromQueue, clearQueue } =
    useLibrary()
  const [activeQueueId, setActiveQueueId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [positionSec, setPositionSec] = useState(0)
  const [mediaDuration, setMediaDuration] = useState(0)
  const [volume, setVolume] = useState(0.85)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [coverArtUrl, setCoverArtUrl] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const coverObjectUrlRef = useRef<string | null>(null)
  const isPlayingRef = useRef(isPlaying)

  useLayoutEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  const activeIndex = useMemo(() => {
    if (queue.length === 0) return -1
    if (activeQueueId) {
      const i = queue.findIndex((q) => q.queueId === activeQueueId)
      if (i >= 0) return i
    }
    return 0
  }, [queue, activeQueueId])

  const current: Track | undefined = activeIndex >= 0 ? queue[activeIndex]?.track : undefined

  const durationSec = useMemo(() => {
    const fromTrack = current?.durationSec ?? 0
    const fromMedia = Number.isFinite(mediaDuration) && mediaDuration > 0 ? mediaDuration : 0
    return Math.max(fromTrack, fromMedia)
  }, [current?.durationSec, mediaDuration])

  const selectIndex = useCallback(
    (index: number) => {
      setActiveQueueId(queue[index]?.queueId ?? null)
      setPositionSec(0)
      setLoadError(null)
      setIsPlaying(true)
    },
    [queue],
  )

  const goRelative = useCallback(
    (delta: number) => {
      if (queue.length === 0) return
      const idx = activeIndex >= 0 ? activeIndex : 0
      const next = (idx + delta + queue.length) % queue.length
      setActiveQueueId(queue[next]?.queueId ?? null)
      setPositionSec(0)
      setLoadError(null)
      setIsPlaying(true)
    },
    [activeIndex, queue],
  )

  useEffect(() => {
    const el = audioRef.current
    if (!el) return undefined
    el.volume = volume
  }, [volume])

  useEffect(() => {
    if (coverObjectUrlRef.current) {
      URL.revokeObjectURL(coverObjectUrlRef.current)
      coverObjectUrlRef.current = null
    }
    void Promise.resolve().then(() => {
      setCoverArtUrl(null)
    })

    if (!current || !current.library) {
      const el = audioRef.current
      if (el) {
        el.pause()
        el.removeAttribute('src')
        el.load()
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
      return undefined
    }
    let cancelled = false
    const rid = requestAnimationFrame(() => {
      setMediaDuration(0)
      setPositionSec(0)
    })
    void (async (): Promise<void> => {
      setLoadError(null)
      const file = await resolveFileForTrack(current)
      if (cancelled) return
      if (!file) {
        setLoadError('Could not read this file from the library.')
        return
      }
      const coverPromise = extractCoverObjectUrlFromAudioFile(file)
      const url = URL.createObjectURL(file)
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }
      objectUrlRef.current = url
      const coverUrl = await coverPromise
      if (cancelled) {
        if (coverUrl) URL.revokeObjectURL(coverUrl)
        return
      }
      if (coverUrl) {
        coverObjectUrlRef.current = coverUrl
        setCoverArtUrl(coverUrl)
      }
      const el = audioRef.current
      if (!el || cancelled) {
        return
      }
      el.src = url
      el.load()
      if (isPlayingRef.current) {
        void el.play().catch((e: unknown) => {
          setLoadError(e instanceof Error ? e.message : 'Playback failed')
          setIsPlaying(false)
        })
      }
    })()
    return (): void => {
      cancelled = true
      cancelAnimationFrame(rid)
      if (coverObjectUrlRef.current) {
        URL.revokeObjectURL(coverObjectUrlRef.current)
        coverObjectUrlRef.current = null
      }
    }
  }, [current, resolveFileForTrack])

  useEffect(() => {
    const el = audioRef.current
    if (!el) return undefined
    if (!el.src) return undefined
    if (isPlaying) {
      void el.play().catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : 'Playback failed')
        setIsPlaying(false)
      })
    } else {
      el.pause()
    }
  }, [isPlaying])

  useEffect(() => {
    const el = audioRef.current
    if (!el || !current) return undefined
    const onTime = (): void => {
      setPositionSec(el.currentTime)
    }
    const onMeta = (): void => {
      if (Number.isFinite(el.duration) && el.duration > 0) {
        setMediaDuration(el.duration)
        bumpTrackDuration(current.id, el.duration)
      }
    }
    const onEnded = (): void => {
      goRelative(1)
    }
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('loadedmetadata', onMeta)
    el.addEventListener('ended', onEnded)
    return (): void => {
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('loadedmetadata', onMeta)
      el.removeEventListener('ended', onEnded)
    }
  }, [current, bumpTrackDuration, goRelative])

  useEffect(() => {
    return (): void => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
      if (coverObjectUrlRef.current) {
        URL.revokeObjectURL(coverObjectUrlRef.current)
        coverObjectUrlRef.current = null
      }
    }
  }, [])

  const onSeekBarPointer = useCallback(
    (ratio: number) => {
      const el = audioRef.current
      if (!el || !Number.isFinite(el.duration) || el.duration <= 0) {
        if (durationSec > 0) {
          setPositionSec(ratio * durationSec)
          if (el) el.currentTime = ratio * durationSec
        }
        return
      }
      const next = Math.min(el.duration, Math.max(0, ratio * el.duration))
      el.currentTime = next
      setPositionSec(next)
    },
    [durationSec],
  )

  const statusLabel = isScanning
    ? 'Scanning…'
    : `${libraryTracks.length} in library · ${queue.length} in queue`

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <audio ref={audioRef} className="hidden" preload="metadata" />

      <header className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white/90 px-6 py-4 backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-950/90">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/25 dark:text-amber-400 dark:ring-amber-500/30">
            <IconQueue className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Muzical</h1>
            <p className="text-xs text-zinc-500">Local library · browser playback</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-50"
            aria-label="Library settings"
          >
            <IconSettings className="h-[18px] w-[18px]" />
          </Link>
          <ThemeToggle />
          <span className="hidden rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-500 shadow-sm sm:inline dark:border-zinc-700/80 dark:bg-zinc-900/80 dark:text-zinc-400 dark:shadow-none">
            {statusLabel}
          </span>
        </div>
      </header>

      {loadError ? (
        <p
          className="shrink-0 border-b border-red-200 bg-red-50 px-6 py-2 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
          role="alert"
        >
          {loadError}
        </p>
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-b border-zinc-200 dark:border-zinc-800 lg:h-full lg:w-[min(100%,280px)] lg:flex-none lg:shrink-0 lg:border-b-0 lg:border-r xl:w-[300px]">
          <LibraryBrowser />
        </div>
        <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] overflow-hidden xl:grid-cols-[minmax(0,1fr)_380px] xl:grid-rows-1 xl:divide-x xl:divide-zinc-200 dark:xl:divide-zinc-800">
          <section className="flex min-h-0 min-w-0 flex-col overflow-hidden border-b border-zinc-200 bg-white dark:border-zinc-800/80 dark:bg-zinc-950/50 xl:border-b-0">
            <div className="flex shrink-0 items-center justify-between gap-2 px-6 pt-5 pb-2">
              <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Queue</h2>
              {queue.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    clearQueue()
                    setActiveQueueId(null)
                    setIsPlaying(false)
                    setPositionSec(0)
                  }}
                  className="text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:hover:text-zinc-300"
                >
                  Clear
                </button>
              ) : null}
            </div>
            <div className="min-h-0 flex-1 overflow-auto px-2 pb-4">
              {queue.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-zinc-600 dark:text-zinc-400">
                  <p>Queue is empty. Pick tracks from the library browser and use Add.</p>
                  <Link
                    href="/settings"
                    className="mt-3 inline-block font-medium text-amber-700 underline-offset-2 hover:underline dark:text-amber-400"
                  >
                    Library folders
                  </Link>
                </div>
              ) : (
                <ul className="space-y-0.5" role="listbox" aria-label="Track queue">
                  {queue.map((row, index) => {
                    const track = row.track
                    const selected = index === activeIndex
                    return (
                      <li key={row.queueId} className="group/row flex items-stretch gap-1">
                        <button
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onClick={() => selectIndex(index)}
                          className={[
                            'flex min-w-0 flex-1 items-center gap-4 rounded-lg px-4 py-3 text-left transition-colors',
                            selected
                              ? 'bg-amber-50 ring-1 ring-amber-200/80 dark:bg-white/[0.04] dark:ring-1 dark:ring-white/[0.06]'
                              : 'hover:bg-zinc-100 dark:hover:bg-zinc-900/80',
                          ].join(' ')}
                        >
                          <span className="w-6 shrink-0 text-center text-xs tabular-nums text-zinc-500">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                              {track.title}
                            </p>
                            <p className="truncate text-xs text-zinc-500">
                              {track.artist} · {track.album}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                            {track.durationSec > 0 ? formatDuration(track.durationSec) : '—'}
                          </span>
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${track.title} from queue`}
                          onClick={() => {
                            const isCurrent = activeQueueId === row.queueId
                            const nextId = isCurrent
                              ? (queue[index + 1]?.queueId ?? queue[index - 1]?.queueId ?? null)
                              : activeQueueId
                            removeFromQueue(row.queueId)
                            setActiveQueueId(nextId)
                            if (isCurrent && !nextId) {
                              setIsPlaying(false)
                              setPositionSec(0)
                            }
                          }}
                          className="shrink-0 self-center rounded px-1.5 py-1 text-[11px] text-zinc-500 opacity-70 transition hover:bg-zinc-200 hover:text-zinc-900 sm:opacity-0 sm:group-hover/row:opacity-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                        >
                          Remove
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </section>

          <aside className="flex min-h-0 min-w-0 flex-col gap-6 overflow-y-auto overflow-x-hidden bg-zinc-50 p-6 dark:bg-transparent">
          <div className="mx-auto flex w-full max-w-[280px] flex-col gap-4">
            <div
              className="relative aspect-square w-full overflow-hidden rounded-2xl bg-gradient-to-br from-amber-200/90 via-zinc-100 to-zinc-200 ring-1 ring-zinc-300/70 shadow-xl shadow-zinc-400/20 dark:from-amber-900/40 dark:via-zinc-800 dark:to-zinc-900 dark:ring-zinc-700/60 dark:shadow-2xl dark:shadow-black/40"
              aria-hidden
            >
              {coverArtUrl ? (
                // Blob object URLs are not supported by next/image without a custom loader.
                // eslint-disable-next-line @next/next/no-img-element -- local object URL from tags
                <img
                  src={coverArtUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  decoding="async"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center p-8">
                  <span className="select-none text-6xl font-bold tracking-tighter text-amber-800/20 dark:text-zinc-700/90">
                    {current?.album ? current.album.charAt(0) : '♪'}
                  </span>
                </div>
              )}
            </div>
            <div className="text-center">
              <p className="truncate text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                {current?.title ?? '—'}
              </p>
              <p className="mt-1 truncate text-sm text-zinc-600 dark:text-zinc-400">{current?.artist ?? ''}</p>
              <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-600">{current?.album ?? ''}</p>
            </div>
          </div>

          <div className="mt-auto space-y-3">
            <div className="flex items-center justify-between text-xs tabular-nums text-zinc-500">
              <span>{formatDuration(positionSec)}</span>
              <span>{durationSec > 0 ? formatDuration(durationSec) : '—'}</span>
            </div>
            <div
              className="group relative h-2 cursor-pointer rounded-full bg-zinc-200 dark:bg-zinc-800"
              onPointerDown={(e) => {
                const el = e.currentTarget
                const rect = el.getBoundingClientRect()
                const ratio = (e.clientX - rect.left) / rect.width
                onSeekBarPointer(ratio)
                const move = (ev: PointerEvent): void => {
                  const r = (ev.clientX - rect.left) / rect.width
                  onSeekBarPointer(r)
                }
                const up = (): void => {
                  window.removeEventListener('pointermove', move)
                  window.removeEventListener('pointerup', up)
                }
                window.addEventListener('pointermove', move)
                window.addEventListener('pointerup', up)
              }}
              role="slider"
              aria-valuemin={0}
              aria-valuemax={Math.round(durationSec)}
              aria-valuenow={Math.round(positionSec)}
              aria-label="Seek"
            >
              <div
                className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-600 to-amber-400"
                style={{
                  width: `${
                    durationSec > 0 ? (100 * positionSec) / durationSec : 0
                  }%`,
                }}
              />
            </div>

            <div className="flex items-center justify-between gap-4 pt-1">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Previous track"
                  onClick={() => goRelative(-1)}
                  disabled={queue.length === 0}
                  className="rounded-full p-2.5 text-zinc-600 transition hover:bg-zinc-200 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                >
                  <IconSkipBack className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  onClick={() => setIsPlaying((p) => !p)}
                  disabled={queue.length === 0 || !current}
                  className="mx-1 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500 text-zinc-950 shadow-lg shadow-amber-600/25 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40 dark:shadow-amber-900/30"
                >
                  {isPlaying ? <IconPause className="h-7 w-7" /> : <IconPlay className="h-7 w-7 pl-0.5" />}
                </button>
                <button
                  type="button"
                  aria-label="Next track"
                  onClick={() => goRelative(1)}
                  disabled={queue.length === 0}
                  className="rounded-full p-2.5 text-zinc-600 transition hover:bg-zinc-200 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                >
                  <IconSkipForward className="h-6 w-6" />
                </button>
              </div>

              <div className="flex min-w-0 flex-1 items-center gap-2">
                <IconVolume className="h-5 w-5 shrink-0 text-zinc-500" />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="h-1 w-full min-w-0 cursor-pointer accent-amber-500"
                  aria-label="Volume"
                />
              </div>
            </div>
          </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
