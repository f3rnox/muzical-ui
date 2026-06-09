'use client'

import { type KeyboardEvent, type ReactNode } from 'react'
import GraphicEqualizer from '@/components/GraphicEqualizer'
import { formatDuration } from '@/lib/format-duration'
import { PLAYBACK_RATES } from '@/lib/playback/playback-rates'
import type { RepeatMode } from '@/types/repeat-mode'
import type { Track } from '@/types/track'

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

function IconRepeatLoop(props: { className?: string; dimmed?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={[props.className, props.dimmed ? 'opacity-40' : ''].filter(Boolean).join(' ')}
    >
      <path d="M17 1l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 23l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  )
}

function IconShuffle(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
      className={props.className}
    >
      <path
        d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconLyrics(props: { className?: string }) {
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
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

function IconEqualizer(props: { className?: string }) {
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
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="2" y1="14" x2="6" y2="14" />
      <line x1="10" y1="8" x2="14" y2="8" />
      <line x1="18" y1="16" x2="22" y2="16" />
    </svg>
  )
}

function IconChevronUp(props: { className?: string }) {
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
      <path d="m18 15-6-6-6 6" />
    </svg>
  )
}

type BrowserViewPlayerBarProps = {
  expanded: boolean
  onToggleExpanded: () => void
  queueLength: number
  current: Track | undefined
  coverArtUrl: string | null
  isPlaying: boolean
  canPlay: boolean
  onTogglePlay: () => void
  onPrev: () => void
  onNext: () => void
  positionSec: number
  durationSec: number
  onSeekBarPointer: (ratio: number) => void
  onSeekBarKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
  volume: number
  onVolumeChange: (volume: number) => void
  repeatMode: RepeatMode
  shuffle: boolean
  playbackRate: number
  showLyrics: boolean
  showEqualizer: boolean
  equalizerGainsDb: readonly number[]
  onCycleRepeatMode: () => void
  onToggleShuffle: () => void
  onToggleLyrics: () => void
  onToggleEqualizer: () => void
  onPlaybackRateChange: (rate: number) => void
  onEqualizerBandChange: (bandIndex: number, gainDb: number) => void
  onResetEqualizer: () => void
  queuePanel: ReactNode
}

function TrackCover({
  coverArtUrl,
  current,
  className,
}: {
  coverArtUrl: string | null
  current: Track | undefined
  className: string
}) {
  return (
    <div
      className={[
        'relative shrink-0 overflow-hidden rounded-md bg-linear-to-br from-accent-200/90 via-zinc-100 to-zinc-200 ring-1 ring-zinc-300/70 dark:from-accent-900/40 dark:via-zinc-800 dark:to-zinc-900 dark:ring-zinc-700/60',
        className,
      ].join(' ')}
      aria-hidden
    >
      {coverArtUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- blob URL or YouTube CDN thumbnail
        <img
          src={coverArtUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          decoding="async"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <span className="select-none text-lg font-bold tracking-tighter text-accent-800/25 dark:text-zinc-700/90">
            {current?.album ? current.album.charAt(0) : '♪'}
          </span>
        </div>
      )}
    </div>
  )
}

function TransportControls({
  isPlaying,
  canPlay,
  onTogglePlay,
  onPrev,
  onNext,
  size = 'md',
}: {
  isPlaying: boolean
  canPlay: boolean
  onTogglePlay: () => void
  onPrev: () => void
  onNext: () => void
  size?: 'sm' | 'md'
}) {
  const btnPad = size === 'sm' ? 'p-1.5' : 'p-2.5'
  const playSize = size === 'sm' ? 'h-9 w-9' : 'h-11 w-11'
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
  const playIconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'

  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        aria-label="Previous track"
        onClick={onPrev}
        className={`rounded-full ${btnPad} text-zinc-600 transition hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100`}
      >
        <IconSkipBack className={iconSize} />
      </button>
      <button
        type="button"
        aria-label={isPlaying ? 'Pause' : 'Play'}
        onClick={onTogglePlay}
        disabled={!canPlay}
        className={`flex ${playSize} items-center justify-center rounded-full bg-accent-500 text-zinc-950 shadow-md shadow-accent-600/20 transition hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-40 dark:shadow-accent-900/30`}
      >
        {isPlaying ? (
          <IconPause className={playIconSize} />
        ) : (
          <IconPlay className={`${playIconSize} pl-0.5`} />
        )}
      </button>
      <button
        type="button"
        aria-label="Next track"
        onClick={onNext}
        className={`rounded-full ${btnPad} text-zinc-600 transition hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100`}
      >
        <IconSkipForward className={iconSize} />
      </button>
    </div>
  )
}

function SeekBar({
  positionSec,
  durationSec,
  onSeekBarPointer,
  onSeekBarKeyDown,
}: {
  positionSec: number
  durationSec: number
  onSeekBarPointer: (ratio: number) => void
  onSeekBarKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] tabular-nums text-zinc-500">
        <span>{formatDuration(positionSec)}</span>
        <span>{durationSec > 0 ? formatDuration(durationSec) : '—'}</span>
      </div>
      <div
        className="group relative h-1.5 cursor-pointer rounded-full bg-zinc-200 dark:bg-zinc-800"
        onPointerDown={(e) => {
          const el = e.currentTarget
          const rect = el.getBoundingClientRect()
          const ratio = (e.clientX - rect.left) / Math.max(1, rect.width)
          onSeekBarPointer(ratio)
          const move = (ev: PointerEvent): void => {
            const r = (ev.clientX - rect.left) / Math.max(1, rect.width)
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
        tabIndex={0}
        onKeyDown={onSeekBarKeyDown}
        aria-valuemin={0}
        aria-valuemax={Math.round(durationSec)}
        aria-valuenow={Math.round(positionSec)}
        aria-label="Seek"
      >
        <div
          className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-accent-600 to-accent-400"
          style={{
            width: `${durationSec > 0 ? (100 * positionSec) / durationSec : 0}%`,
          }}
        />
      </div>
    </div>
  )
}

export default function BrowserViewPlayerBar({
  expanded,
  onToggleExpanded,
  queueLength,
  current,
  coverArtUrl,
  isPlaying,
  canPlay,
  onTogglePlay,
  onPrev,
  onNext,
  positionSec,
  durationSec,
  onSeekBarPointer,
  onSeekBarKeyDown,
  volume,
  onVolumeChange,
  repeatMode,
  shuffle,
  playbackRate,
  showLyrics,
  showEqualizer,
  equalizerGainsDb,
  onCycleRepeatMode,
  onToggleShuffle,
  onToggleLyrics,
  onToggleEqualizer,
  onPlaybackRateChange,
  onEqualizerBandChange,
  onResetEqualizer,
  queuePanel,
}: BrowserViewPlayerBarProps) {
  return (
    <div className="relative z-20 shrink-0 border-t border-zinc-200 bg-white/95 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95 dark:shadow-[0_-4px_24px_rgba(0,0,0,0.35)]">
      <div
        className={[
          'overflow-hidden border-b border-zinc-200 transition-[max-height] duration-300 ease-out dark:border-zinc-800',
          expanded ? 'max-h-[min(58vh,440px)]' : 'max-h-0 border-b-0',
        ].join(' ')}
        aria-hidden={!expanded}
      >
        <div className="flex max-h-[min(58vh,440px)] min-h-0 flex-col">
          <div className="shrink-0 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <div className="flex gap-3">
              <TrackCover coverArtUrl={coverArtUrl} current={current} className="h-16 w-16" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {current?.title ?? 'Nothing playing'}
                </p>
                <p className="truncate text-xs text-zinc-500">{current?.artist ?? ''}</p>
                <p className="truncate text-xs text-zinc-400">{current?.album ?? ''}</p>
              </div>
              <TransportControls
                isPlaying={isPlaying}
                canPlay={canPlay}
                onTogglePlay={onTogglePlay}
                onPrev={onPrev}
                onNext={onNext}
                size="sm"
              />
            </div>

            <div className="mt-3">
              <SeekBar
                positionSec={positionSec}
                durationSec={durationSec}
                onSeekBarPointer={onSeekBarPointer}
                onSeekBarKeyDown={onSeekBarKeyDown}
              />
            </div>

            {showEqualizer ? (
              <div className="mt-3">
                <GraphicEqualizer
                  gainsDb={equalizerGainsDb}
                  onBandChange={onEqualizerBandChange}
                  onReset={onResetEqualizer}
                  onClose={onToggleEqualizer}
                />
              </div>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <IconVolume className="h-4 w-4 shrink-0 text-zinc-500" />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => onVolumeChange(Number(e.target.value))}
                  className="h-1 w-full min-w-0 cursor-pointer accent-accent-500"
                  aria-label="Volume"
                />
              </div>
              <button
                type="button"
                onClick={onCycleRepeatMode}
                className="relative flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                aria-label={
                  repeatMode === 'off'
                    ? 'Repeat off. Click for repeat all.'
                    : repeatMode === 'all'
                      ? 'Repeat all. Click for repeat one.'
                      : 'Repeat one. Click for repeat off.'
                }
              >
                <IconRepeatLoop dimmed={repeatMode === 'off'} className="h-4 w-4" />
                {repeatMode === 'one' ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-3 min-w-3 items-center justify-center rounded bg-accent-500 px-0.5 text-[8px] font-bold leading-none text-zinc-950">
                    1
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={onToggleShuffle}
                aria-pressed={shuffle}
                aria-label={shuffle ? 'Shuffle on' : 'Shuffle off'}
                className={[
                  'flex h-8 w-8 items-center justify-center rounded-full border transition',
                  shuffle
                    ? 'border-accent-500/50 bg-accent-500/15 text-accent-800 dark:text-accent-300'
                    : 'border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300',
                ].join(' ')}
              >
                <IconShuffle className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onToggleLyrics}
                aria-pressed={showLyrics}
                aria-label={showLyrics ? 'Hide lyrics' : 'Show lyrics'}
                className={[
                  'flex h-8 w-8 items-center justify-center rounded-full border transition',
                  showLyrics
                    ? 'border-accent-500/50 bg-accent-500/15 text-accent-800 dark:text-accent-300'
                    : 'border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300',
                ].join(' ')}
              >
                <IconLyrics className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onToggleEqualizer}
                aria-pressed={showEqualizer}
                aria-label={showEqualizer ? 'Hide equalizer' : 'Show equalizer'}
                className={[
                  'flex h-8 w-8 items-center justify-center rounded-full border transition',
                  showEqualizer
                    ? 'border-accent-500/50 bg-accent-500/15 text-accent-800 dark:text-accent-300'
                    : 'border-zinc-200 bg-white text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300',
                ].join(' ')}
              >
                <IconEqualizer className="h-4 w-4" />
              </button>
              <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                <span className="sr-only">Playback speed</span>
                <span aria-hidden>Speed</span>
                <select
                  value={playbackRate}
                  onChange={(e) => onPlaybackRateChange(Number(e.target.value))}
                  className="cursor-pointer rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 text-xs font-medium text-zinc-800 outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                  aria-label="Playback speed"
                >
                  {PLAYBACK_RATES.map((r) => (
                    <option key={r} value={r}>
                      {r === 1 ? '1×' : `${r}×`}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">{queuePanel}</div>
        </div>
      </div>

      <div className="flex h-[4.25rem] items-center gap-3 px-3 sm:px-4">
        <TrackCover coverArtUrl={coverArtUrl} current={current} className="h-11 w-11" />
        <button
          type="button"
          onClick={onToggleExpanded}
          className="min-w-0 flex-1 text-left"
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse player' : 'Expand player and queue'}
        >
          <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {current?.title ?? 'Nothing playing'}
          </p>
          <p className="truncate text-xs text-zinc-500">
            {current
              ? `${current.artist}${queueLength > 0 ? ` · ${queueLength} in queue` : ''}`
              : queueLength > 0
                ? `${queueLength} in queue`
                : 'Add tracks to start playback'}
          </p>
        </button>

        {!expanded && (
          <TransportControls
            isPlaying={isPlaying}
            canPlay={canPlay}
            onTogglePlay={onTogglePlay}
            onPrev={onPrev}
            onNext={onNext}
            size="sm"
          />
        )}

        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse player' : 'Expand player and queue'}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
        >
          <IconChevronUp
            className={['h-5 w-5 transition-transform duration-300', expanded ? 'rotate-180' : ''].join(
              ' ',
            )}
          />
        </button>
      </div>
    </div>
  )
}