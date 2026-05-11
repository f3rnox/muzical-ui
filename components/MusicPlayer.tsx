'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Track } from '@/types/track'
import { MOCK_PLAYLIST } from '@/lib/mock-playlist'
import { formatDuration } from '@/lib/format-duration'
import ThemeToggle from '@/components/ThemeToggle'

type MusicPlayerProps = {
  /** Swap for API-driven list when wired */
  initialPlaylist?: readonly Track[]
}

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

/**
 * Local-library player shell: queue, now playing, transport. Playback is mocked until `audioUrl` + `<audio>` wiring.
 */
export default function MusicPlayer(props: MusicPlayerProps) {
  const playlist = useMemo(
    () => [...(props.initialPlaylist ?? MOCK_PLAYLIST)],
    [props.initialPlaylist],
  )
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [positionSec, setPositionSec] = useState(0)
  const [volume, setVolume] = useState(0.85)

  const current: Track | undefined = playlist[activeIndex]

  const selectIndex = useCallback((index: number) => {
    setActiveIndex(index)
    setPositionSec(0)
    setIsPlaying(true)
  }, [])

  const goRelative = useCallback(
    (delta: number) => {
      const next = (activeIndex + delta + playlist.length) % playlist.length
      setActiveIndex(next)
      setPositionSec(0)
      setIsPlaying(true)
    },
    [activeIndex, playlist.length],
  )

  useEffect(() => {
    if (!isPlaying || !current) return undefined
    const tick = window.setInterval(() => {
      setPositionSec((prev) => {
        const cap = current.durationSec
        if (prev + 0.25 >= cap) {
          setActiveIndex((i) => (i + 1) % playlist.length)
          return 0
        }
        return prev + 0.25
      })
    }, 250)
    return () => window.clearInterval(tick)
  }, [isPlaying, current, playlist.length])

  const onSeekBarPointer = useCallback(
    (ratio: number) => {
      if (!current) return
      const next = Math.min(current.durationSec, Math.max(0, ratio * current.durationSec))
      setPositionSec(next)
    },
    [current],
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white/90 px-6 py-4 backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-950/90">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/25 dark:text-amber-400 dark:ring-amber-500/30">
            <IconQueue className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Muzical</h1>
            <p className="text-xs text-zinc-500">Local library · API pending</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-500 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-900/80 dark:text-zinc-400 dark:shadow-none">
            Mock playback
          </span>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="flex min-h-0 flex-col border-b border-zinc-200 bg-white dark:border-zinc-800/80 dark:bg-zinc-950/50 lg:border-b-0 lg:border-r">
          <div className="shrink-0 px-6 pt-5 pb-2">
            <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Queue</h2>
          </div>
          <div className="min-h-0 flex-1 overflow-auto px-2 pb-4">
            <ul className="space-y-0.5" role="listbox" aria-label="Track queue">
              {playlist.map((track, index) => {
                const selected = index === activeIndex
                return (
                  <li key={track.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => selectIndex(index)}
                      className={[
                        'flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left transition-colors',
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
                        {formatDuration(track.durationSec)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>

        <aside className="flex flex-col gap-6 bg-zinc-50 p-6 dark:bg-transparent lg:max-h-full lg:overflow-auto">
          <div className="mx-auto flex w-full max-w-[280px] flex-col gap-4">
            <div
              className="aspect-square w-full overflow-hidden rounded-2xl bg-gradient-to-br from-amber-200/90 via-zinc-100 to-zinc-200 ring-1 ring-zinc-300/70 shadow-xl shadow-zinc-400/20 dark:from-amber-900/40 dark:via-zinc-800 dark:to-zinc-900 dark:ring-zinc-700/60 dark:shadow-2xl dark:shadow-black/40"
              aria-hidden
            >
              <div className="flex h-full w-full items-center justify-center p-8">
                <span className="select-none text-6xl font-bold tracking-tighter text-amber-800/20 dark:text-zinc-700/90">
                  {current?.album.slice(0, 1) ?? '♪'}
                </span>
              </div>
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
              <span>{formatDuration(current?.durationSec ?? 0)}</span>
            </div>
            <div
              className="group relative h-2 cursor-pointer rounded-full bg-zinc-200 dark:bg-zinc-800"
              onPointerDown={(e) => {
                const el = e.currentTarget
                const rect = el.getBoundingClientRect()
                const ratio = (e.clientX - rect.left) / rect.width
                onSeekBarPointer(ratio)
                const move = (ev: PointerEvent) => {
                  const r = (ev.clientX - rect.left) / rect.width
                  onSeekBarPointer(r)
                }
                const up = () => {
                  window.removeEventListener('pointermove', move)
                  window.removeEventListener('pointerup', up)
                }
                window.addEventListener('pointermove', move)
                window.addEventListener('pointerup', up)
              }}
              role="slider"
              aria-valuemin={0}
              aria-valuemax={current?.durationSec ?? 0}
              aria-valuenow={Math.round(positionSec)}
              aria-label="Seek"
            >
              <div
                className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-600 to-amber-400"
                style={{
                  width: `${
                    current && current.durationSec > 0
                      ? (100 * positionSec) / current.durationSec
                      : 0
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
                  className="rounded-full p-2.5 text-zinc-600 transition hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                >
                  <IconSkipBack className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  onClick={() => setIsPlaying((p) => !p)}
                  className="mx-1 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500 text-zinc-950 shadow-lg shadow-amber-600/25 transition hover:bg-amber-400 dark:shadow-amber-900/30"
                >
                  {isPlaying ? <IconPause className="h-7 w-7" /> : <IconPlay className="h-7 w-7 pl-0.5" />}
                </button>
                <button
                  type="button"
                  aria-label="Next track"
                  onClick={() => goRelative(1)}
                  className="rounded-full p-2.5 text-zinc-600 transition hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
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
  )
}
