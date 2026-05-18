'use client'

import Link from 'next/link'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import BrowsePanel from '@/components/BrowsePanel'
import HiddenYoutubePlayer, {
  type HiddenYoutubePlayerHandle,
} from '@/components/HiddenYoutubePlayer'
import { useLibrary } from '@/components/LibraryProvider'
import type { Track } from '@/types/track'
import { formatDuration } from '@/lib/format-duration'
import { getCoverBytesForTrack } from '@/lib/library/cover-bytes-cache'
import ThemeToggle from '@/components/ThemeToggle'
import FavoriteStarButton from '@/components/FavoriteStarButton'
import PanelResizeHandle from '@/components/PanelResizeHandle'
import QueueLoadingSpinner from '@/components/QueueLoadingSpinner'
import YouTubeStreamNotification from '@/components/YouTubeStreamNotification'
import resolveYoutubeVideoId from '@/lib/youtube/resolve-youtube-video-id'
import youtubeVideoThumbnailUrl from '@/lib/youtube/youtube-video-thumbnail-url'

const STORAGE_LIBRARY_PANEL_PX = 'muzical.panelWidth.library'
const STORAGE_QUEUE_PANEL_PX = 'muzical.panelWidth.queue'
const STORAGE_REPEAT_MODE = 'muzical.repeatMode'
const STORAGE_SHUFFLE = 'muzical.shuffle'
const STORAGE_PLAYBACK_RATE = 'muzical.playbackRate'

type RepeatMode = 'off' | 'all' | 'one'

const PLAYBACK_RATES: readonly number[] = [0.5, 0.75, 1, 1.25, 1.5, 2]

function readStoredRepeatMode(): RepeatMode {
  if (typeof window === 'undefined') return 'all'
  const v = window.localStorage.getItem(STORAGE_REPEAT_MODE)
  if (v === 'off' || v === 'all' || v === 'one') return v
  return 'all'
}

function readStoredShuffle(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(STORAGE_SHUFFLE) === '1'
  } catch {
    return false
  }
}

function readStoredPlaybackRate(): number {
  if (typeof window === 'undefined') return 1
  const v = Number.parseFloat(window.localStorage.getItem(STORAGE_PLAYBACK_RATE) ?? '')
  if (!Number.isFinite(v)) return 1
  return PLAYBACK_RATES.includes(v) ? v : 1
}

function persistRepeatMode(mode: RepeatMode): void {
  try {
    window.localStorage.setItem(STORAGE_REPEAT_MODE, mode)
  } catch {
    /* ignore */
  }
}

function persistShuffle(on: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_SHUFFLE, on ? '1' : '0')
  } catch {
    /* ignore */
  }
}

function persistPlaybackRate(rate: number): void {
  try {
    window.localStorage.setItem(STORAGE_PLAYBACK_RATE, String(rate))
  } catch {
    /* ignore */
  }
}
const LIBRARY_PANEL_MIN = 300
const LIBRARY_PANEL_MAX = 960
const QUEUE_PANEL_MIN = 420
// Minimum width for the player panel (aside). Used to clamp resizes.
const PLAYER_PANEL_MIN = 350

function clampPanelPx(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

function readStoredPanelPx(key: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback
  const v = Number.parseInt(window.localStorage.getItem(key) ?? '', 10)
  return Number.isFinite(v) ? v : fallback
}

function clampLibraryQueueWidths(
  rowWidthPx: number,
  libraryPx: number,
  queuePx: number,
): { libraryPx: number; queuePx: number } {
  if (rowWidthPx <= 0) return { libraryPx, queuePx }
  const maxSum = Math.max(
    LIBRARY_PANEL_MIN + QUEUE_PANEL_MIN,
    rowWidthPx - PLAYER_PANEL_MIN,
  )
  let L = clampPanelPx(libraryPx, LIBRARY_PANEL_MIN, LIBRARY_PANEL_MAX)
  // Intentionally no hard `QUEUE_PANEL_MAX` cap: the player panel minimum width is
  // enforced via `maxSum` below, and we don't want queue width to prevent it.
  let Q = Math.max(QUEUE_PANEL_MIN, queuePx)
  if (L + Q > maxSum) {
    const over = L + Q - maxSum
    const takeFromL = Math.min(over, L - LIBRARY_PANEL_MIN)
    L -= takeFromL
    let r = over - takeFromL
    const takeFromQ = Math.min(r, Q - QUEUE_PANEL_MIN)
    Q -= takeFromQ
    r -= takeFromQ
    if (r > 0) L = Math.max(LIBRARY_PANEL_MIN, L - r)
  }
  return { libraryPx: L, queuePx: Q }
}

function clampQueuePanelWidth(rowWidthPx: number, libraryPx: number, queuePx: number): number {
  const maxQ = rowWidthPx - libraryPx - PLAYER_PANEL_MIN
  return clampPanelPx(queuePx, QUEUE_PANEL_MIN, Math.max(QUEUE_PANEL_MIN, maxQ))
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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className={props.className}>
      <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Local-library player: queue from scanned folders, `<audio>` playback via object URLs.
 */
export default function MusicPlayer() {
  const {
    queue,
    libraryTracks,
    isScanning,
    resolveFileForTrack,
    bumpTrackDuration,
    removeFromQueue,
    clearQueue,
    compactLists,
    reorderQueueItems,
    recentlyPlayedTrackIds,
    recordRecentlyPlayedTrack,
    isFavoriteSong,
    toggleFavoriteTrack,
    addToQueue,
    favoriteSongIds,
    playbackRestore,
    consumePlaybackRestore,
    reportPlayback,
    isQueueReady,
    patchTrackById,
  } = useLibrary()
  const [activeQueueId, setActiveQueueId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [positionSec, setPositionSec] = useState(0)
  const [mediaDuration, setMediaDuration] = useState(0)
  const [volume, setVolume] = useState(0.85)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [streamResolving, setStreamResolving] = useState(false)
  const [coverArtUrl, setCoverArtUrl] = useState<string | null>(null)
  const [layoutLg, setLayoutLg] = useState(false)
  const [libraryPanelPx, setLibraryPanelPx] = useState(440)
  const [queuePanelPx, setQueuePanelPx] = useState(300)
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('all')
  const [shuffle, setShuffle] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)

  const mainRowRef = useRef<HTMLDivElement>(null)
  const shuffleHistoryRef = useRef<number[]>([])
  const pendingRestorePositionRef = useRef<number | null>(null)
  const activeQueueIdRef = useRef<string | null>(null)
  const lastPlaybackReportMsRef = useRef(0)
  const libraryPanelPxRef = useRef(440)
  const queuePanelPxRef = useRef(300)
  const [dragOverQueueId, setDragOverQueueId] = useState<string | null>(null)
  const [draggingQueueId, setDraggingQueueId] = useState<string | null>(null)
  const panelResizeSessionRef = useRef<
    | { kind: 'library-queue'; startLib: number; startQ: number }
    | { kind: 'queue-player'; startQ: number }
    | null
  >(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const coverObjectUrlRef = useRef<string | null>(null)
  const hiddenYoutubeRef = useRef<HiddenYoutubePlayerHandle | null>(null)
  const isPlayingRef = useRef(isPlaying)
  const playbackRateRef = useRef(playbackRate)

  useLayoutEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  useLayoutEffect(() => {
    playbackRateRef.current = playbackRate
  }, [playbackRate])

  useLayoutEffect(() => {
    libraryPanelPxRef.current = libraryPanelPx
    queuePanelPxRef.current = queuePanelPx
  }, [libraryPanelPx, queuePanelPx])

  useEffect(() => {
    queueMicrotask(() => {
      setLibraryPanelPx(readStoredPanelPx(STORAGE_LIBRARY_PANEL_PX, 440))
      setQueuePanelPx(readStoredPanelPx(STORAGE_QUEUE_PANEL_PX, 300))
      setRepeatMode(readStoredRepeatMode())
      setShuffle(readStoredShuffle())
      setPlaybackRate(readStoredPlaybackRate())
    })
  }, [])

  useEffect(() => {
    if (!shuffle) shuffleHistoryRef.current = []
  }, [shuffle])

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(min-width: 1024px)')
    const apply = (): void => {
      setLayoutLg(mq.matches)
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    activeQueueIdRef.current = activeQueueId
  }, [activeQueueId])

  useEffect(() => {
    if (!playbackRestore) return
    const { activeQueueId: nextActiveId, positionSec: nextPos } = playbackRestore
    pendingRestorePositionRef.current = nextPos
    consumePlaybackRestore()
    void Promise.resolve().then(() => {
      setActiveQueueId(nextActiveId)
      setPositionSec(nextPos)
      setIsPlaying(false)
    })
  }, [playbackRestore, consumePlaybackRestore])

  useEffect(() => {
    const el = audioRef.current
    const pos = el && Number.isFinite(el.currentTime) ? el.currentTime : 0
    reportPlayback(activeQueueId, pos)
  }, [activeQueueId, reportPlayback])

  const activeIndex = useMemo(() => {
    if (queue.length === 0) return -1
    if (activeQueueId) {
      const i = queue.findIndex((q) => q.queueId === activeQueueId)
      if (i >= 0) return i
    }
    return 0
  }, [queue, activeQueueId])

  const current: Track | undefined = activeIndex >= 0 ? queue[activeIndex]?.track : undefined
  const lastRecordedTrackIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isPlaying) return
    const id = current?.id ?? ''
    if (!id) return
    if (lastRecordedTrackIdRef.current === id) return
    lastRecordedTrackIdRef.current = id
    recordRecentlyPlayedTrack(id)
  }, [current?.id, isPlaying, recordRecentlyPlayedTrack])

  const recentlyPlayedTracks = useMemo(() => {
    if (recentlyPlayedTrackIds.length === 0) return []
    const byId = new Map<string, Track>()
    for (const t of libraryTracks) byId.set(t.id, t)
    const out: Track[] = []
    for (const id of recentlyPlayedTrackIds) {
      const t = byId.get(id)
      if (t) out.push(t)
      if (out.length >= 8) break
    }
    return out
  }, [recentlyPlayedTrackIds, libraryTracks])

  const suggestedTracks = useMemo(() => {
    if (libraryTracks.length === 0) return []
    const byId = new Map<string, Track>()
    for (const t of libraryTracks) byId.set(t.id, t)

    const seen = new Set<string>()
    const out: Track[] = []

    for (const t of recentlyPlayedTracks) {
      seen.add(t.id)
    }

    for (const id of favoriteSongIds) {
      const t = byId.get(id)
      if (!t) continue
      if (seen.has(t.id)) continue
      seen.add(t.id)
      out.push(t)
      if (out.length >= 12) return out
    }

    for (let i = 0; i < libraryTracks.length; i++) {
      const t = libraryTracks[i]
      if (seen.has(t.id)) continue
      seen.add(t.id)
      out.push(t)
      if (out.length >= 12) break
    }
    return out
  }, [libraryTracks, favoriteSongIds, recentlyPlayedTracks])

  const durationSec = useMemo(() => {
    const fromTrack = current?.durationSec ?? 0
    const fromMedia = Number.isFinite(mediaDuration) && mediaDuration > 0 ? mediaDuration : 0
    return Math.max(fromTrack, fromMedia)
  }, [current?.durationSec, mediaDuration])

  const selectIndex = useCallback(
    (index: number) => {
      shuffleHistoryRef.current = []
      setActiveQueueId(queue[index]?.queueId ?? null)
      setPositionSec(0)
      setLoadError(null)
      setIsPlaying(true)
    },
    [queue],
  )

  const goNext = useCallback((): void => {
    if (queue.length === 0) return
    const idx = activeIndex >= 0 ? activeIndex : 0

    if (shuffle && queue.length > 1) {
      shuffleHistoryRef.current.push(idx)
      let j = idx
      for (let n = 0; n < 48 && j === idx; n++) {
        j = Math.floor(Math.random() * queue.length)
      }
      setActiveQueueId(queue[j]?.queueId ?? null)
      setPositionSec(0)
      setLoadError(null)
      setIsPlaying(true)
      return
    }

    if (idx < queue.length - 1) {
      setActiveQueueId(queue[idx + 1]?.queueId ?? null)
      setPositionSec(0)
      setLoadError(null)
      setIsPlaying(true)
      return
    }
    if (repeatMode === 'all') {
      setActiveQueueId(queue[0]?.queueId ?? null)
      setPositionSec(0)
      setLoadError(null)
      setIsPlaying(true)
      return
    }
    setIsPlaying(false)
  }, [activeIndex, queue, repeatMode, shuffle])

  const goPrev = useCallback((): void => {
    if (queue.length === 0) return
    const idx = activeIndex >= 0 ? activeIndex : 0

    if (shuffle && shuffleHistoryRef.current.length > 0) {
      const prevIdx = shuffleHistoryRef.current.pop()
      if (prevIdx !== undefined && prevIdx >= 0 && prevIdx < queue.length) {
        setActiveQueueId(queue[prevIdx]?.queueId ?? null)
        setPositionSec(0)
        setLoadError(null)
        setIsPlaying(true)
        return
      }
    }

    if (idx > 0) {
      setActiveQueueId(queue[idx - 1]?.queueId ?? null)
      setPositionSec(0)
      setLoadError(null)
      setIsPlaying(true)
      return
    }
    if (repeatMode === 'all') {
      setActiveQueueId(queue[queue.length - 1]?.queueId ?? null)
      setPositionSec(0)
      setLoadError(null)
      setIsPlaying(true)
    }
  }, [activeIndex, queue, repeatMode, shuffle])

  const cycleRepeatMode = useCallback((): void => {
    setRepeatMode((m) => {
      const next: RepeatMode = m === 'off' ? 'all' : m === 'all' ? 'one' : 'off'
      persistRepeatMode(next)
      return next
    })
  }, [])

  const toggleShuffle = useCallback((): void => {
    setShuffle((s) => {
      const next = !s
      persistShuffle(next)
      return next
    })
  }, [])

  const clampPanelsToRow = useCallback((): void => {
    const rowW = mainRowRef.current?.getBoundingClientRect().width ?? 0
    if (rowW <= 0) return
    const { libraryPx, queuePx } = clampLibraryQueueWidths(
      rowW,
      libraryPanelPxRef.current,
      queuePanelPxRef.current,
    )
    setLibraryPanelPx(libraryPx)
    setQueuePanelPx(queuePx)
  }, [])

  const persistPanelWidths = useCallback((): void => {
    try {
      window.localStorage.setItem(STORAGE_LIBRARY_PANEL_PX, String(libraryPanelPxRef.current))
      window.localStorage.setItem(STORAGE_QUEUE_PANEL_PX, String(queuePanelPxRef.current))
    } catch {
      /* ignore */
    }
  }, [])

  const onLibraryQueueResizeStart = useCallback((): void => {
    panelResizeSessionRef.current = {
      kind: 'library-queue',
      startLib: libraryPanelPxRef.current,
      startQ: queuePanelPxRef.current,
    }
  }, [])

  const onLibraryQueueResizeMove = useCallback((dx: number): void => {
    const s = panelResizeSessionRef.current
    if (!s || s.kind !== 'library-queue') return
    const rowW = mainRowRef.current?.getBoundingClientRect().width ?? 0
    const next = clampLibraryQueueWidths(rowW, s.startLib + dx, s.startQ - dx)
    setLibraryPanelPx(next.libraryPx)
    setQueuePanelPx(next.queuePx)
  }, [])

  const onQueuePlayerResizeStart = useCallback((): void => {
    panelResizeSessionRef.current = { kind: 'queue-player', startQ: queuePanelPxRef.current }
  }, [])

  const onQueuePlayerResizeMove = useCallback((dx: number): void => {
    const s = panelResizeSessionRef.current
    if (!s || s.kind !== 'queue-player') return
    const rowW = mainRowRef.current?.getBoundingClientRect().width ?? 0
    const nextQ = clampQueuePanelWidth(rowW, libraryPanelPxRef.current, s.startQ + dx)
    setQueuePanelPx(nextQ)
  }, [])

  const onPanelResizeEnd = useCallback((): void => {
    panelResizeSessionRef.current = null
    persistPanelWidths()
  }, [persistPanelWidths])

  useEffect(() => {
    if (!layoutLg) return undefined
    const onResize = (): void => {
      clampPanelsToRow()
    }
    window.addEventListener('resize', onResize)
    clampPanelsToRow()
    return () => window.removeEventListener('resize', onResize)
  }, [layoutLg, clampPanelsToRow])

  useEffect(() => {
    const el = audioRef.current
    if (!el) return undefined
    el.volume = volume
  }, [volume])

  useEffect(() => {
    const el = audioRef.current
    if (!el) return undefined
    el.playbackRate = playbackRate
  }, [playbackRate])

  useEffect(() => {
    if (coverObjectUrlRef.current) {
      URL.revokeObjectURL(coverObjectUrlRef.current)
      coverObjectUrlRef.current = null
    }
    setCoverArtUrl(null)

    if (!current || (!current.library && !current.youtubeQuery && !current.audioUrl)) {
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

    const youtubeVideoId = current.youtubeVideoId?.trim()
    if (!current.library && youtubeVideoId) {
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
      setCoverArtUrl(youtubeVideoThumbnailUrl(youtubeVideoId))
      return undefined
    }

    if (!current.library) {
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
    const pendingPos = pendingRestorePositionRef.current
    const rid = requestAnimationFrame(() => {
      setMediaDuration(0)
      setPositionSec(pendingPos ?? 0)
    })
    void (async (): Promise<void> => {
      setLoadError(null)
      const file = await resolveFileForTrack(current)
      if (cancelled) return
      if (!file) {
        setLoadError('Could not read this file from the library.')
        return
      }
      const coverBytesPromise = getCoverBytesForTrack(current.id, file)
      const url = URL.createObjectURL(file)
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
      }
      objectUrlRef.current = url
      if (cancelled) {
        return
      }
      const coverBytes = await coverBytesPromise
      if (cancelled) return
      if (coverBytes) {
        const coverUrl = URL.createObjectURL(new Blob([coverBytes.data], { type: coverBytes.mime }))
        coverObjectUrlRef.current = coverUrl
        setCoverArtUrl(coverUrl)
      }
      const el = audioRef.current
      if (!el || cancelled) {
        return
      }
      el.src = url
      el.load()
      el.playbackRate = playbackRateRef.current
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

  const playbackYoutubeVideoId = current?.youtubeVideoId?.trim() || null

  useEffect(() => {
    if (!playbackYoutubeVideoId || current?.library) return undefined
    setCoverArtUrl(youtubeVideoThumbnailUrl(playbackYoutubeVideoId))
    return undefined
  }, [playbackYoutubeVideoId, current?.library, current?.id])
  const youtubeStreamActive = Boolean(playbackYoutubeVideoId)
  const needsYoutubeResolve = Boolean(current?.youtubeQuery?.trim() && !playbackYoutubeVideoId)

  useEffect(() => {
    const query = current?.youtubeQuery?.trim()
    if (!query || current?.youtubeVideoId?.trim()) {
      queueMicrotask(() => setStreamResolving(false))
      return undefined
    }

    const controller = new AbortController()
    queueMicrotask(() => setStreamResolving(true))

    void resolveYoutubeVideoId(query, controller.signal)
      .then((videoId) => {
        if (controller.signal.aborted) return
        if (videoId && current?.id) {
          patchTrackById(current.id, (t) => ({ ...t, youtubeVideoId: videoId }))
          setLoadError(null)
        } else if (!videoId) {
          setLoadError('Could not find a YouTube video for this track.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setStreamResolving(false)
      })

    return (): void => {
      controller.abort()
    }
  }, [current?.id, current?.youtubeQuery, current?.youtubeVideoId, patchTrackById])

  const onYoutubeDuration = useCallback(
    (seconds: number) => {
      setMediaDuration(seconds)
      if (current?.id) bumpTrackDuration(current.id, seconds)
    },
    [bumpTrackDuration, current?.id],
  )

  useEffect(() => {
    if (!youtubeStreamActive) return undefined
    const tick = (): void => {
      const t = hiddenYoutubeRef.current?.getCurrentTime() ?? 0
      if (Number.isFinite(t) && t >= 0) {
        setPositionSec(t)
        reportPlayback(activeQueueIdRef.current, t)
      }
      const d = hiddenYoutubeRef.current?.getDuration() ?? 0
      if (Number.isFinite(d) && d > 0) setMediaDuration(d)
    }
    tick()
    const id = window.setInterval(tick, 500)
    return (): void => {
      window.clearInterval(id)
    }
  }, [youtubeStreamActive, reportPlayback])

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
      const now = Date.now()
      if (now - lastPlaybackReportMsRef.current >= 2000) {
        lastPlaybackReportMsRef.current = now
        reportPlayback(activeQueueIdRef.current, el.currentTime)
      }
    }
    const onMeta = (): void => {
      if (Number.isFinite(el.duration) && el.duration > 0) {
        setMediaDuration(el.duration)
        bumpTrackDuration(current.id, el.duration)
      }
      const pending = pendingRestorePositionRef.current
      if (pending != null && pending > 0) {
        const seekTo = Math.min(pending, el.duration > 0 ? el.duration : pending)
        el.currentTime = seekTo
        setPositionSec(seekTo)
        pendingRestorePositionRef.current = null
        reportPlayback(activeQueueIdRef.current, seekTo)
      }
    }
    const onEnded = (): void => {
      if (repeatMode === 'one') {
        el.currentTime = 0
        setPositionSec(0)
        void el.play().catch((e: unknown) => {
          setLoadError(e instanceof Error ? e.message : 'Playback failed')
          setIsPlaying(false)
        })
        return
      }
      goNext()
    }
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('loadedmetadata', onMeta)
    el.addEventListener('ended', onEnded)
    return (): void => {
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('loadedmetadata', onMeta)
      el.removeEventListener('ended', onEnded)
    }
  }, [current, bumpTrackDuration, goNext, repeatMode, reportPlayback])

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
      const r = Math.min(1, Math.max(0, ratio))
      if (youtubeStreamActive && hiddenYoutubeRef.current) {
        const total =
          durationSec > 0
            ? durationSec
            : hiddenYoutubeRef.current.getDuration()
        if (total > 0) {
          const next = r * total
          hiddenYoutubeRef.current.seekTo(next)
          setPositionSec(next)
          reportPlayback(activeQueueIdRef.current, next)
        }
        return
      }
      const el = audioRef.current
      if (!el || !Number.isFinite(el.duration) || el.duration <= 0) {
        if (durationSec > 0) {
          setPositionSec(r * durationSec)
          if (el) el.currentTime = r * durationSec
        }
        return
      }
      const next = Math.min(el.duration, Math.max(0, r * el.duration))
      el.currentTime = next
      setPositionSec(next)
      reportPlayback(activeQueueIdRef.current, next)
    },
    [youtubeStreamActive, durationSec, reportPlayback],
  )

  const onSeekBarKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>): void => {
      if (durationSec <= 0) return

      const stepSmallSec = 5
      const stepLargeSec = 30
      let nextTime: number | null = null

      if (e.key === 'ArrowLeft') nextTime = positionSec - stepSmallSec
      else if (e.key === 'ArrowRight') nextTime = positionSec + stepSmallSec
      else if (e.key === 'PageDown') nextTime = positionSec - stepLargeSec
      else if (e.key === 'PageUp') nextTime = positionSec + stepLargeSec
      else if (e.key === 'Home') nextTime = 0
      else if (e.key === 'End') nextTime = durationSec
      else return

      e.preventDefault()
      const clamped = Math.min(durationSec, Math.max(0, nextTime))
      onSeekBarPointer(clamped / durationSec)
    },
    [durationSec, onSeekBarPointer, positionSec],
  )

  const statusLabel = isScanning
    ? 'Scanning…'
    : `${libraryTracks.length} in library · ${queue.length} in queue`

  const queueRowGapClass = compactLists ? 'gap-2' : 'gap-3'
  const queueRowPadClass = compactLists ? 'px-3 py-2' : 'px-4 py-2.5'
  const queueRemoveButtonPadClass = compactLists ? 'px-1.5 py-1.5' : 'px-2 py-2'
  const emptyQueueCardGapClass = compactLists ? 'gap-2' : 'gap-3'
  const emptyQueueCardPadClass = compactLists ? 'p-2' : 'p-3'

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <YouTubeStreamNotification
        visible={streamResolving || (needsYoutubeResolve && isPlaying)}
        trackTitle={current?.title}
      />
      <audio ref={audioRef} className="hidden" preload="metadata" />
      <HiddenYoutubePlayer
        ref={hiddenYoutubeRef}
        videoId={playbackYoutubeVideoId}
        isPlaying={isPlaying && youtubeStreamActive}
        volume={volume}
        onReady={() => setLoadError(null)}
        onEnded={goNext}
        onDuration={onYoutubeDuration}
        onError={(message) => setLoadError(message)}
      />

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
          <span className="hidden rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-500 shadow-sm sm:inline dark:border-zinc-700/80 dark:bg-zinc-900/80 dark:text-zinc-400 dark:shadow-none">
            {statusLabel}
          </span>
          <Link
            href="/settings"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-50"
            aria-label="Library settings"
          >
            <IconSettings className="h-[18px] w-[18px]" />
          </Link>
          <ThemeToggle />
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

      <div
        ref={mainRowRef}
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row"
      >
        <div
          className="flex min-h-0 min-w-0 flex-col overflow-hidden max-lg:flex-2 max-lg:w-full lg:h-full lg:min-w-0 lg:shrink-0"
          style={layoutLg ? { width: libraryPanelPx, flex: '0 0 auto' } : undefined}
        >
          <BrowsePanel />
        </div>
        <PanelResizeHandle
          aria-label="Resize library and queue panels"
          onSessionStart={onLibraryQueueResizeStart}
          onSessionMove={onLibraryQueueResizeMove}
          onSessionEnd={onPanelResizeEnd}
        />
        <section
          className="flex min-h-0 min-w-0 flex-col overflow-hidden border-b border-zinc-200 bg-white dark:border-zinc-800/80 dark:bg-zinc-950/50 max-lg:flex-1 max-lg:w-full lg:h-full lg:shrink-0 lg:border-b-0 lg:border-r lg:border-zinc-200 lg:dark:border-zinc-800"
          style={layoutLg ? { width: queuePanelPx, flex: '0 0 auto' } : undefined}
        >
          {!isQueueReady ? (
            <QueueLoadingSpinner />
          ) : (
            <>
          <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-zinc-200 bg-white/80 px-3 dark:border-zinc-800 dark:bg-zinc-950/80">
            <h2 className="text-xs font-medium uppercase leading-none tracking-wider text-zinc-500">Queue</h2>
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
          <div className="min-h-0 flex-1 overflow-auto pb-2">
            {queue.length === 0 ? (
              <div className="px-4 py-6">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Queue is empty</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Add something to start playback.
                  <Link
                    href="/settings"
                    className="ml-2 font-medium text-amber-700 underline-offset-2 hover:underline dark:text-amber-400"
                  >
                    Library folders
                  </Link>
                </p>

                {recentlyPlayedTracks.length > 0 ? (
                  <div className="mt-5">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">Recently played</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {recentlyPlayedTracks.map((t) => (
                        <div
                          key={t.id}
                          className={`flex min-w-0 items-center ${emptyQueueCardGapClass} rounded-xl border border-zinc-200 bg-white ${emptyQueueCardPadClass} shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40 dark:shadow-none`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{t.title}</p>
                            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                              {t.artist} · {t.album}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">
                              {t.durationSec > 0 ? formatDuration(t.durationSec) : '—'}
                            </span>
                            <FavoriteStarButton
                              className="rounded-full"
                              filled={isFavoriteSong(t.id)}
                              onPress={() => toggleFavoriteTrack(t)}
                              label={isFavoriteSong(t.id) ? 'Remove song from favorites' : 'Add song to favorites'}
                            />
                            <button
                              type="button"
                              onClick={() => addToQueue(t)}
                              className="shrink-0 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-500/25 transition hover:bg-amber-500/25 dark:text-amber-300 dark:ring-amber-500/40"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {suggestedTracks.length > 0 ? (
                  <div className="mt-6">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">Suggestions</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {suggestedTracks.map((t) => (
                        <div
                          key={t.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => addToQueue(t)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              addToQueue(t)
                            }
                          }}
                          aria-label={`Add ${t.title} to queue`}
                          className={`flex w-full min-w-0 cursor-pointer items-center text-left ${emptyQueueCardGapClass} rounded-xl border border-zinc-200 bg-white ${emptyQueueCardPadClass} shadow-sm transition hover:border-amber-400/50 hover:bg-amber-50/50 dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:border-amber-500/30 dark:hover:bg-amber-950/20 dark:shadow-none`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{t.title}</p>
                            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                              {t.artist} · {t.album}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">
                              {t.durationSec > 0 ? formatDuration(t.durationSec) : '—'}
                            </span>
                            <FavoriteStarButton
                              className="rounded-full"
                              filled={isFavoriteSong(t.id)}
                              onPress={() => toggleFavoriteTrack(t)}
                              label={isFavoriteSong(t.id) ? 'Remove song from favorites' : 'Add song to favorites'}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <ul className="divide-y divide-zinc-200 dark:divide-zinc-800" role="listbox" aria-label="Track queue">
                {queue.map((row, index) => {
                  const track = row.track
                  const selected = index === activeIndex
                  const isDropTarget = dragOverQueueId === row.queueId && draggingQueueId !== row.queueId
                  return (
                    <li
                      key={row.queueId}
                      className={[
                        'group/row flex items-center gap-0',
                        selected ? 'bg-amber-50/90 dark:bg-white/6' : '',
                        isDropTarget ? 'ring-1 ring-amber-400/30' : '',
                      ].join(' ')}
                      onDragOver={(e) => {
                        if (!draggingQueueId) return
                        e.preventDefault()
                        if (dragOverQueueId !== row.queueId) setDragOverQueueId(row.queueId)
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        const fromQueueId = draggingQueueId
                        setDraggingQueueId(null)
                        setDragOverQueueId(null)
                        if (!fromQueueId) return
                        if (fromQueueId === row.queueId) return
                        const fromIndex = queue.findIndex((q) => q.queueId === fromQueueId)
                        if (fromIndex < 0) return

                        const rect = (e.currentTarget as HTMLLIElement).getBoundingClientRect()
                        const insertAfter = e.clientY > rect.top + rect.height / 2
                        // Desired insertion index in the original list (before any splice shifting).
                        const desiredInsertIndex = insertAfter ? index + 1 : index
                        // Convert to insertion index after removal of the dragged item.
                        const adjustedToIndex = fromIndex < desiredInsertIndex ? desiredInsertIndex - 1 : desiredInsertIndex
                        reorderQueueItems(fromIndex, adjustedToIndex)
                      }}
                    >
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => selectIndex(index)}
                        draggable
                        onDragStart={(e) => {
                          setDraggingQueueId(row.queueId)
                          setDragOverQueueId(row.queueId)
                          e.dataTransfer.effectAllowed = 'move'
                          e.dataTransfer.setData('text/plain', row.queueId)
                        }}
                        onDragEnd={() => {
                          setDraggingQueueId(null)
                          setDragOverQueueId(null)
                        }}
                        className={[
                          `flex min-w-0 flex-1 items-center ${queueRowGapClass} border-l-2 border-transparent ${queueRowPadClass} text-left transition-colors`,
                          selected
                            ? 'border-amber-500 dark:border-amber-400'
                            : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/60',
                          'cursor-grab active:cursor-grabbing',
                          isDropTarget ? 'border-amber-500/20 dark:border-amber-400/20' : '',
                        ].join(' ')}
                      >
                        <span className="w-5 shrink-0 text-right text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">
                            {track.title}
                          </p>
                          <p className="truncate text-xs leading-snug text-zinc-500 dark:text-zinc-400">
                            {track.artist} · {track.album}
                          </p>
                        </div>
                        <span className="shrink-0 text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">
                          {track.durationSec > 0 ? formatDuration(track.durationSec) : '—'}
                        </span>
                      </button>
                      <div
                        className={[
                          'flex shrink-0 items-center border-l pr-1 pl-0.5',
                          selected
                            ? 'border-amber-200/80 dark:border-white/8'
                            : 'border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/40',
                        ].join(' ')}
                      >
                        <FavoriteStarButton
                          className="rounded-none"
                          filled={isFavoriteSong(track.id)}
                          onPress={() => toggleFavoriteTrack(track)}
                          label={isFavoriteSong(track.id) ? 'Remove song from favorites' : 'Add song to favorites'}
                        />
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
                          className={`shrink-0 ${queueRemoveButtonPadClass} text-[11px] text-zinc-500 opacity-80 transition hover:bg-zinc-200/80 hover:text-zinc-900 sm:opacity-0 sm:group-hover/row:opacity-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-100`}
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
            </>
          )}
        </section>
        <PanelResizeHandle
          aria-label="Resize queue and player panels"
          onSessionStart={onQueuePlayerResizeStart}
          onSessionMove={onQueuePlayerResizeMove}
          onSessionEnd={onPanelResizeEnd}
        />
        <aside className="flex min-h-0 min-w-0 flex-1 flex-col justify-between gap-3 overflow-hidden bg-zinc-50 p-4 dark:bg-transparent lg:h-full lg:min-w-0 lg:flex-1">
          <div className="mx-auto flex w-full max-w-[280px] shrink-0 flex-col gap-4">
            <div
              className="relative aspect-square w-full overflow-hidden rounded-2xl bg-linear-to-br from-amber-200/90 via-zinc-100 to-zinc-200 ring-1 ring-zinc-300/70 shadow-xl shadow-zinc-400/20 dark:from-amber-900/40 dark:via-zinc-800 dark:to-zinc-900 dark:ring-zinc-700/60 dark:shadow-2xl dark:shadow-black/40"
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

          <div className="shrink-0 space-y-2.5">
            <div className="flex items-center justify-between text-xs tabular-nums text-zinc-500">
              <span>{formatDuration(positionSec)}</span>
              <span>{durationSec > 0 ? formatDuration(durationSec) : '—'}</span>
            </div>
            <div
              className="group relative h-2 cursor-pointer rounded-full bg-zinc-200 dark:bg-zinc-800"
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
                className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-amber-600 to-amber-400"
                style={{
                  width: `${
                    durationSec > 0 ? (100 * positionSec) / durationSec : 0
                  }%`,
                }}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Previous track"
                  onClick={() => goPrev()}
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
                  className="mx-0.5 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-zinc-950 shadow-md shadow-amber-600/20 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40 dark:shadow-amber-900/30"
                >
                  {isPlaying ? <IconPause className="h-6 w-6" /> : <IconPlay className="h-6 w-6 pl-0.5" />}
                </button>
                <button
                  type="button"
                  aria-label="Next track"
                  onClick={() => goNext()}
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

            <div className="flex flex-wrap items-center justify-center gap-2 border-t border-zinc-200 pt-2 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => cycleRepeatMode()}
                className="relative flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                aria-label={
                  repeatMode === 'off'
                    ? 'Repeat off. Click for repeat all.'
                    : repeatMode === 'all'
                      ? 'Repeat all. Click for repeat one.'
                      : 'Repeat one. Click for repeat off.'
                }
              >
                <IconRepeatLoop dimmed={repeatMode === 'off'} className="h-5 w-5" />
                {repeatMode === 'one' ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded bg-amber-500 px-0.5 text-[9px] font-bold leading-none text-zinc-950">
                    1
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => toggleShuffle()}
                aria-pressed={shuffle}
                aria-label={shuffle ? 'Shuffle on' : 'Shuffle off'}
                className={[
                  'flex h-9 w-9 items-center justify-center rounded-full border transition',
                  shuffle
                    ? 'border-amber-500/50 bg-amber-500/15 text-amber-800 dark:text-amber-300'
                    : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
                ].join(' ')}
              >
                <IconShuffle className="h-5 w-5" />
              </button>
              <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                <span className="sr-only">Playback speed</span>
                <span aria-hidden className="tabular-nums">
                  Speed
                </span>
                <select
                  value={playbackRate}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    setPlaybackRate(v)
                    persistPlaybackRate(v)
                  }}
                  className="cursor-pointer rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-800 outline-none ring-amber-500/0 transition focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
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
        </aside>
      </div>
    </div>
  )
}
