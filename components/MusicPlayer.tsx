"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useSearchParams } from 'next/navigation'
import BrowsePanel from "@/components/BrowsePanel";
import BrowseViewTabs from "@/components/BrowseViewTabs";
import BrowserViewPlayerBar from "@/components/BrowserViewPlayerBar";
import LibraryBrowserView from "@/components/LibraryBrowserView";
import QueueTrackList from "@/components/QueueTrackList";
import parseBrowseView from "@/lib/browse/parse-browse-view";
import HiddenYoutubePlayer, {
  type HiddenYoutubePlayerHandle,
} from "@/components/HiddenYoutubePlayer";
import KeyboardShortcutsHelpDialog from "@/components/KeyboardShortcutsHelpDialog";
import GraphicEqualizer from "@/components/GraphicEqualizer";
import { useLibrary } from "@/components/LibraryProvider";
import { usePlaybackPreferences } from "@/components/PlaybackPreferencesProvider";
import { DEFAULT_PLAYBACK_VOLUME } from "@/lib/playback/playback-preference-storage-keys";
import { PLAYBACK_RATES } from "@/lib/playback/playback-rates";
import useAudioEqualizer from "@/lib/playback/use-audio-equalizer";
import type { RepeatMode } from "@/types/repeat-mode";
import type { Track } from "@/types/track";
import { formatDuration } from "@/lib/format-duration";
import { getCoverBytesForTrack } from "@/lib/library/cover-bytes-cache";
import ThemeToggle from "@/components/ThemeToggle";
import PwaInstallButton from "@/components/PwaInstallButton";
import AlbumCoverThumb from "@/components/AlbumCoverThumb";
import FavoriteStarButton from "@/components/FavoriteStarButton";
import { albumCompositeKey } from "@/lib/library/favorite-keys";
import { groupTracksByArtist } from "@/lib/musicbrainz/group-tracks-by-artist";

import PanelResizeHandle from "@/components/PanelResizeHandle";
import QueueLoadingSpinner from "@/components/QueueLoadingSpinner";
import {
  applyDynamicAccentFromCover,
  applyDynamicAccentVars,
} from "@/lib/accent/extract-cover-color";
import {
  readDynamicAccentEnabled,
  subscribeDynamicAccentEnabled,
  writeDynamicAccentEnabled,
} from "@/lib/accent/dynamic-accent-storage";
import readStoredLastfmScrobblingEnabled, {
  subscribeLastfmScrobblingEnabled,
} from "@/lib/lastfm/read-stored-lastfm-scrobbling-enabled";
import RecentBrowseSearchChip from "@/components/RecentBrowseSearchChip";
import YouTubeStreamNotification from "@/components/YouTubeStreamNotification";
import LastfmScrobbleNotification from "@/components/LastfmScrobbleNotification";

import readAppVersion from "@/lib/read-app-version";
import resolveYoutubeVideoId from "@/lib/youtube/resolve-youtube-video-id";
import youtubeVideoThumbnailUrl from "@/lib/youtube/youtube-video-thumbnail-url";
import LyricsPanel from "@/components/LyricsPanel";
import {
  findActionForKeyboardShortcut,
  normalizeKeyboardShortcutEvent,
  shouldIgnoreKeyboardShortcutEvent,
} from "@/lib/keyboard-shortcuts";
import type { KeyboardShortcutAction } from "@/types/keyboard-shortcuts";

const STORAGE_LIBRARY_PANEL_PX = "muzical.panelWidth.library";
const STORAGE_QUEUE_PANEL_PX = "muzical.panelWidth.queue";

const LIBRARY_PANEL_MIN = 300;
const LIBRARY_PANEL_MAX = 960;
const QUEUE_PANEL_MIN = 420;
// Minimum width for the player panel (aside). Used to clamp resizes.
const PLAYER_PANEL_MIN = 350;

function clampPanelPx(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function readStoredPanelPx(key: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const v = Number.parseInt(window.localStorage.getItem(key) ?? "", 10);
  return Number.isFinite(v) ? v : fallback;
}

function clampLibraryQueueWidths(
  rowWidthPx: number,
  libraryPx: number,
  queuePx: number,
): { libraryPx: number; queuePx: number } {
  if (rowWidthPx <= 0) return { libraryPx, queuePx };
  const maxSum = Math.max(
    LIBRARY_PANEL_MIN + QUEUE_PANEL_MIN,
    rowWidthPx - PLAYER_PANEL_MIN,
  );
  let L = clampPanelPx(libraryPx, LIBRARY_PANEL_MIN, LIBRARY_PANEL_MAX);
  // Intentionally no hard `QUEUE_PANEL_MAX` cap: the player panel minimum width is
  // enforced via `maxSum` below, and we don't want queue width to prevent it.
  let Q = Math.max(QUEUE_PANEL_MIN, queuePx);
  if (L + Q > maxSum) {
    const over = L + Q - maxSum;
    const takeFromL = Math.min(over, L - LIBRARY_PANEL_MIN);
    L -= takeFromL;
    let r = over - takeFromL;
    const takeFromQ = Math.min(r, Q - QUEUE_PANEL_MIN);
    Q -= takeFromQ;
    r -= takeFromQ;
    if (r > 0) L = Math.max(LIBRARY_PANEL_MIN, L - r);
  }
  return { libraryPx: L, queuePx: Q };
}

function clampQueuePanelWidth(
  rowWidthPx: number,
  libraryPx: number,
  queuePx: number,
): number {
  const maxQ = rowWidthPx - libraryPx - PLAYER_PANEL_MIN;
  return clampPanelPx(
    queuePx,
    QUEUE_PANEL_MIN,
    Math.max(QUEUE_PANEL_MIN, maxQ),
  );
}

function IconPlay(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={props.className}
    >
      <path d="M8 5v14l11-7L8 5z" />
    </svg>
  );
}

function IconPause(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={props.className}
    >
      <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
    </svg>
  );
}

function IconSkipBack(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={props.className}
    >
      <path d="M6 6h2v12H6V6zm3.5 6 8.5 6V6l-8.5 6z" />
    </svg>
  );
}

function IconSkipForward(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={props.className}
    >
      <path d="M16 18h2V6h-2v12zM6 18l8.5-6L6 6v12z" />
    </svg>
  );
}

function IconVolume(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={props.className}
    >
      <path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}

function IconQueue(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={props.className}
    >
      <path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h10v2H4v-2zm12 1v6l5-3-5-3z" />
    </svg>
  );
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
  );
}

function IconHelp(props: { className?: string }) {
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
      <circle cx="12" cy="12" r="10" />
      <path d="M9.1 9a3 3 0 1 1 4.8 2.4c-1 .7-1.9 1.3-1.9 2.6" />
      <path d="M12 17h.01" />
    </svg>
  );
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
      className={[props.className, props.dimmed ? "opacity-40" : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <path d="M17 1l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 23l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
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
  );
}

function IconChevronRight(props: { className?: string }) {
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
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
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
  );
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
  );
}

function isAutoplayBlockedError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "NotAllowedError";
}

/**
 * Local-library player: queue from scanned folders, `<audio>` playback via object URLs.
 */
export default function MusicPlayer() {
  const {
    queue,
    libraryTracks,
    isScanning,
    youtubePrefetchActive,
    youtubePrefetchVideoCount,
    resolveFileForTrack,
    bumpTrackDuration,
    removeFromQueue,
    clearQueue,
    compactLists,
    reorderQueueItems,
    recentlyPlayedTrackIds,
    listeningStats,
    recentBrowseSearches,
    recordTrackPlaybackStarted,
    recordTrackPlaybackProgress,
    recordTrackPlaybackCompleted,
    recordTrackSkipped,
    isFavoriteSong,
    toggleFavoriteTrack,
    addToQueue,
    addToLibrary,
    removeFromLibrary,
    openTrackDetails,
    openRelatedSongs,
    downloadTrack,
    favoriteSongIds,
    favoriteArtistNames,
    favoriteAlbumKeys,
    isFavoriteArtist,
    isFavoriteAlbum,
    toggleFavoriteArtist,
    toggleFavoriteAlbum,
    playbackRestore,
    consumePlaybackRestore,
    playNowRequest,
    consumePlayNowRequest,
    reportPlayback,
    isQueueReady,
    patchTrackById,
    openAddToPlaylist,
  } = useLibrary();
  const {
    preferences,
    setRepeatMode,
    setShuffle,
    setPlaybackRate,
    setVolume: persistVolume,
    setEqualizerBandGain,
    resetEqualizer,
  } = usePlaybackPreferences();
  const {
    repeatMode,
    shuffle,
    playbackRate,
    autoAdvanceOnEnd,
    seekStepSmallSec,
    seekStepLargeSec,
    rememberVolume,
    equalizerGainsDb,
  } = preferences;
  const [activeQueueId, setActiveQueueId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionSec, setPositionSec] = useState(0);
  const [mediaDuration, setMediaDuration] = useState(0);
  const [sessionVolume, setSessionVolume] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [streamResolving, setStreamResolving] = useState(false);
  const [lastScrobbledTrack, setLastScrobbledTrack] = useState<{ artist: string; title: string } | null>(null);
  const [coverArtUrl, setCoverArtUrl] = useState<string | null>(null);
  const [layoutLg, setLayoutLg] = useState(false);
  const [libraryPanelPx, setLibraryPanelPx] = useState(440);
  const [queuePanelPx, setQueuePanelPx] = useState(300);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showEqualizer, setShowEqualizer] = useState(false);
  const [dynamicAccentEnabled, setDynamicAccentEnabled] = useState<boolean>(true);
  const [lastfmScrobblingEnabled, setLastfmScrobblingEnabled] = useState(false);
  const [isPanelResizing, setIsPanelResizing] = useState(false);
  const [showKeyboardShortcutsHelp, setShowKeyboardShortcutsHelp] =
    useState(false);
  const [browserPlayerExpanded, setBrowserPlayerExpanded] = useState(false);
  // Queue multi-select
  const [selectedQueueIds, setSelectedQueueIds] = useState<Set<string>>(new Set());

  const hasQueueSelection = selectedQueueIds.size > 0;
  const selectedQueueTracks = useMemo(() => {
    const out: Track[] = [];
    for (const qid of selectedQueueIds) {
      const row = queue.find((r) => r.queueId === qid);
      if (row) out.push(row.track);
    }
    return out;
  }, [selectedQueueIds, queue]);

  const toggleQueueSelect = useCallback(
    (queueId: string, event?: React.MouseEvent) => {
      const isShift = !!event?.shiftKey;
      const isCtrl = !!event?.ctrlKey || !!event?.metaKey;

      setSelectedQueueIds((prev) => {
        const next = new Set(prev);

        if (isShift && queue.length > 0) {
          const ids = queue.map((r) => r.queueId);
          const current = Array.from(next);
          const anchor = current.length > 0 ? current[current.length - 1] : activeQueueId || queue[0]?.queueId;
          const a = ids.indexOf(anchor || '');
          const b = ids.indexOf(queueId);
          if (a !== -1 && b !== -1) {
            const [lo, hi] = a < b ? [a, b] : [b, a];
            for (let i = lo; i <= hi; i++) next.add(ids[i]!);
            return next;
          }
        }

        if (isCtrl) {
          if (next.has(queueId)) next.delete(queueId);
          else next.add(queueId);
          return next;
        }

        if (next.has(queueId)) next.delete(queueId);
        else next.add(queueId);
        return next;
      });
    },
    [queue, activeQueueId],
  );

  const clearQueueSelection = useCallback(() => {
    setSelectedQueueIds(new Set());
  }, []);

  // Clean queue selection when the queue contents change
  useEffect(() => {
    setSelectedQueueIds((prev) => {
      if (prev.size === 0) return prev;
      const valid = new Set<string>();
      const qids = new Set(queue.map((r) => r.queueId));
      for (const id of prev) if (qids.has(id)) valid.add(id);
      return valid.size === prev.size ? prev : valid;
    });
  }, [queue]);
  const volume = rememberVolume
    ? preferences.volume
    : (sessionVolume ?? DEFAULT_PLAYBACK_VOLUME);

  const mainRowRef = useRef<HTMLDivElement>(null);
  const shuffleHistoryRef = useRef<number[]>([]);
  const pendingRestorePositionRef = useRef<number | null>(null);
  const activeQueueIdRef = useRef<string | null>(null);
  const lastPlaybackReportMsRef = useRef(0);
  const lastPlaybackStartQueueIdRef = useRef<string | null>(null);
  const lastfmPlayRef = useRef<{
    queueId: string | null;
    startTsSec: number;
    nowPlayingSent: boolean;
    scrobbled: boolean;
  }>({ queueId: null, startTsSec: 0, nowPlayingSent: false, scrobbled: false });
  const pendingLastfmScrobbleRef = useRef<{
    artist: string;
    track: string;
    timestamp: number;
    album?: string;
    durationSec?: number;
  } | null>(null);
  const scrobbleNotificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastfmEnabledRef = useRef(false);
  const currentTrackRef = useRef<Track | undefined>(undefined);
  const durationSecRef = useRef(0);
  const positionSecRef = useRef(0);
  const youtubeStreamActiveRef = useRef(false);
  const progressTrackIdRef = useRef<string | null>(null);

  // Last.fm scrobble submission + notification helpers (hoisted early so they can be
  // referenced by the "new track begins" effect which appears earlier in source).
  const showLastfmScrobbleNotification = useCallback((artist: string, title: string) => {
    if (scrobbleNotificationTimerRef.current) {
      clearTimeout(scrobbleNotificationTimerRef.current);
    }
    setLastScrobbledTrack({ artist, title });
    scrobbleNotificationTimerRef.current = setTimeout(() => {
      setLastScrobbledTrack(null);
      scrobbleNotificationTimerRef.current = null;
    }, 2600);
  }, []);

  const submitPendingLastfmScrobble = useCallback(() => {
    const payload = pendingLastfmScrobbleRef.current;
    if (!payload) return;
    pendingLastfmScrobbleRef.current = null;

    console.log(`[Last.fm] Submitting scrobble for "${payload.artist} - ${payload.track}"`);

    void import("@/lib/lastfm/perform-lastfm-scrobble").then(({ default: perform }) => {
      perform(payload)
        .then((result) => {
          if (result && result.ok && !result.ignored) {
            console.log(`[Last.fm] Scrobble succeeded for "${payload.artist} - ${payload.track}"`);
            showLastfmScrobbleNotification(payload.artist, payload.track);
          } else if (result && result.ignored) {
            console.log(`[Last.fm] Scrobble ignored by Last.fm for "${payload.artist} - ${payload.track}"`);
          } else if (result && !result.ok) {
            console.log(`[Last.fm] Scrobble failed for "${payload.artist} - ${payload.track}":`, result.message);
          } else {
            console.log(`[Last.fm] Scrobble failed for "${payload.artist} - ${payload.track}":`, result);
          }
        })
        .catch((err) => {
          console.log(`[Last.fm] Scrobble error for "${payload.artist} - ${payload.track}":`, err);
        });
    });
  }, [showLastfmScrobbleNotification]);
  const progressPositionSecRef = useRef(0);
  const pendingListenTrackIdRef = useRef<string | null>(null);
  const pendingListenSecRef = useRef(0);
  const libraryPanelPxRef = useRef(440);
  const queuePanelPxRef = useRef(300);
  const [dragOverQueueId, setDragOverQueueId] = useState<string | null>(null);
  const [draggingQueueId, setDraggingQueueId] = useState<string | null>(null);
  const [favoritesSuggestionsOpen, setFavoritesSuggestionsOpen] =
    useState(true);
  const panelResizeSessionRef = useRef<
    | { kind: "library-queue"; startLib: number; startQ: number }
    | { kind: "queue-player"; startQ: number }
    | null
  >(null);

  // Width transition is smooth for snaps/double-clicks and lyrics toggles,
  // but disabled during active drag to keep resize feel instant.
  const panelWidthTransitionClass = isPanelResizing
    ? "transition-none"
    : "transition-[width] duration-200 ease-out";

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const coverObjectUrlRef = useRef<string | null>(null);
  const hiddenYoutubeRef = useRef<HiddenYoutubePlayerHandle | null>(null);
  const isPlayingRef = useRef(isPlaying);
  const playbackRateRef = useRef(playbackRate);
  const pendingResumeAfterGestureRef = useRef(false);
  const ensureEqualizerReady = useAudioEqualizer(audioRef, equalizerGainsDb);

  const playAudioElement = useCallback(
    (el: HTMLAudioElement): void => {
      void (async (): Promise<void> => {
        await ensureEqualizerReady();
        await el.play();
        pendingResumeAfterGestureRef.current = false;
      })().catch((e: unknown) => {
        setLoadError(e instanceof Error ? e.message : "Playback failed");
        pendingResumeAfterGestureRef.current = isAutoplayBlockedError(e);
        setIsPlaying(false);
      });
    },
    [ensureEqualizerReady],
  );

  useLayoutEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useLayoutEffect(() => {
    playbackRateRef.current = playbackRate;
  }, [playbackRate]);

  // lastfmEnabledRef is safe to sync early (its state declared early)
  useLayoutEffect(() => {
    lastfmEnabledRef.current = lastfmScrobblingEnabled;
  }, [lastfmScrobblingEnabled]);

  useLayoutEffect(() => {
    libraryPanelPxRef.current = libraryPanelPx;
    queuePanelPxRef.current = queuePanelPx;
  }, [libraryPanelPx, queuePanelPx]);

  useEffect(() => {
    queueMicrotask(() => {
      setLibraryPanelPx(readStoredPanelPx(STORAGE_LIBRARY_PANEL_PX, 440));
      setQueuePanelPx(readStoredPanelPx(STORAGE_QUEUE_PANEL_PX, 300));
    });
  }, []);

  // Dynamic accent setting: init + live subscribe so toggling in settings applies immediately
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setDynamicAccentEnabled(readDynamicAccentEnabled());
    });
    const unsub = subscribeDynamicAccentEnabled((next) => {
      setDynamicAccentEnabled(next);
    });
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<{ enabled?: boolean }>).detail;
      if (detail && typeof detail.enabled === "boolean") {
        setDynamicAccentEnabled(detail.enabled);
      }
    };
    window.addEventListener("muzical:dynamic-accent-changed", onCustom as EventListener);
    return () => {
      cancelAnimationFrame(id);
      unsub();
      window.removeEventListener("muzical:dynamic-accent-changed", onCustom as EventListener);
    };
  }, []);

  // Last.fm scrobbling enabled (live updates from settings)
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setLastfmScrobblingEnabled(readStoredLastfmScrobblingEnabled());
    });
    const unsub = subscribeLastfmScrobblingEnabled((next) => {
      setLastfmScrobblingEnabled(next);
    });
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<{ enabled?: boolean }>).detail;
      if (typeof detail?.enabled === "boolean") {
        setLastfmScrobblingEnabled(detail.enabled);
      }
    };
    window.addEventListener("muzical:lastfm-scrobbling-changed", onCustom as EventListener);
    return () => {
      cancelAnimationFrame(id);
      unsub();
      window.removeEventListener("muzical:lastfm-scrobbling-changed", onCustom as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!shuffle) shuffleHistoryRef.current = [];
  }, [shuffle]);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = (): void => {
      setLayoutLg(mq.matches);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    activeQueueIdRef.current = activeQueueId;
  }, [activeQueueId]);

  useEffect(() => {
    if (!playbackRestore) return;
    const {
      activeQueueId: nextActiveId,
      positionSec: nextPos,
      wasPlaying,
    } = playbackRestore;
    pendingRestorePositionRef.current = nextPos;
    pendingResumeAfterGestureRef.current = wasPlaying;
    consumePlaybackRestore();
    void Promise.resolve().then(() => {
      setActiveQueueId(nextActiveId);
      setPositionSec(nextPos);
      setIsPlaying(wasPlaying);
    });
  }, [playbackRestore, consumePlaybackRestore]);

  useEffect(() => {
    if (!playNowRequest) return;
    const { activeQueueId: nextActiveId } = playNowRequest;
    consumePlayNowRequest();
    shuffleHistoryRef.current = [];
    void Promise.resolve().then(() => {
      setActiveQueueId(nextActiveId);
      setPositionSec(0);
      setLoadError(null);
      setIsPlaying(true);
    });
  }, [playNowRequest, consumePlayNowRequest]);

  useEffect(() => {
    const el = audioRef.current;
    const pendingRestorePos = pendingRestorePositionRef.current;
    const pos =
      pendingRestorePos != null
        ? pendingRestorePos
        : el && Number.isFinite(el.currentTime)
          ? el.currentTime
          : 0;
    reportPlayback(activeQueueId, pos);
  }, [activeQueueId, reportPlayback]);

  const activeIndex = useMemo(() => {
    if (queue.length === 0) return -1;
    if (activeQueueId) {
      const i = queue.findIndex((q) => q.queueId === activeQueueId);
      if (i >= 0) return i;
    }
    return 0;
  }, [queue, activeQueueId]);

  const current: Track | undefined =
    activeIndex >= 0 ? queue[activeIndex]?.track : undefined;
  useEffect(() => {
    if (!isPlaying) return;
    if (!activeQueueId) return;
    const id = current?.id ?? "";
    if (!id) return;

    // When a song begins to play, submit any pending scrobble from the track that just finished
    // (or was skipped). This makes "scrobbling happen when a song begins to play".
    submitPendingLastfmScrobble();

    if (lastPlaybackStartQueueIdRef.current === activeQueueId) return;
    lastPlaybackStartQueueIdRef.current = activeQueueId;
    recordTrackPlaybackStarted(id);

    // Last.fm: new play session + now playing
    const startTs = Math.floor(Date.now() / 1000);
    lastfmPlayRef.current = {
      queueId: activeQueueId,
      startTsSec: startTs,
      nowPlayingSent: false,
      scrobbled: false,
    };
    if (lastfmScrobblingEnabled && current) {
      const artist = current.artist?.trim();
      const title = current.title?.trim();
      if (artist && title) {
        void import("@/lib/lastfm/perform-lastfm-update-now-playing").then(
          ({ default: perform }) => {
            perform({
              artist,
              track: title,
              album: current.album?.trim() || undefined,
              durationSec: current.durationSec > 0 ? current.durationSec : undefined,
            }).catch(() => {
              /* silent */
            });
          },
        );
      }
    }
    lastfmPlayRef.current.nowPlayingSent = true;
  }, [activeQueueId, current?.id, isPlaying, recordTrackPlaybackStarted, lastfmScrobblingEnabled, current, submitPendingLastfmScrobble]);

  const recentlyPlayedTracks = useMemo(() => {
    if (recentlyPlayedTrackIds.length === 0) return [];
    const byId = new Map<string, Track>();
    for (const t of libraryTracks) byId.set(t.id, t);
    const out: Track[] = [];
    for (const id of recentlyPlayedTrackIds) {
      const t = byId.get(id);
      if (t) out.push(t);
      if (out.length >= 8) break;
    }
    return out;
  }, [recentlyPlayedTrackIds, libraryTracks]);

  const rediscoverTracks = useMemo(() => {
    if (libraryTracks.length === 0) return [];
    const recent = new Set(recentlyPlayedTrackIds.slice(0, 8));
    return libraryTracks
      .filter((t) => {
        if (recent.has(t.id)) return false;
        const stats = listeningStats[t.id];
        return Boolean(stats?.lastPlayedAt && stats.playCount > 0);
      })
      .sort((a, b) => {
        const aPlayed = listeningStats[a.id]?.lastPlayedAt ?? 0;
        const bPlayed = listeningStats[b.id]?.lastPlayedAt ?? 0;
        return aPlayed - bPlayed;
      })
      .slice(0, 8);
  }, [libraryTracks, listeningStats, recentlyPlayedTrackIds]);

  const libraryArtistMap = useMemo(
    () => groupTracksByArtist(libraryTracks),
    [libraryTracks],
  );

  const libraryAlbumMap = useMemo(() => {
    const m = new Map<string, Track[]>();
    for (const t of libraryTracks) {
      const key = albumCompositeKey(t.album, t.artist);
      const arr = m.get(key) ?? [];
      arr.push(t);
      m.set(key, arr);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
      );
    }
    return m;
  }, [libraryTracks]);

  const favoritedArtistsList = useMemo(() => {
    return favoriteArtistNames
      .filter((n) => libraryArtistMap.has(n))
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [favoriteArtistNames, libraryArtistMap]);

  const favoritedAlbumsList = useMemo(() => {
    return favoriteAlbumKeys
      .filter((k) => libraryAlbumMap.has(k))
      .sort((a, b) => {
        const [albumA, artistA] = a.split("\u0000");
        const [albumB, artistB] = b.split("\u0000");
        const c = albumA.localeCompare(albumB, undefined, {
          sensitivity: "base",
        });
        return c !== 0
          ? c
          : artistA.localeCompare(artistB, undefined, { sensitivity: "base" });
      });
  }, [favoriteAlbumKeys, libraryAlbumMap]);

  const favoritedTracks = useMemo(() => {
    const set = new Set(favoriteSongIds);
    return libraryTracks
      .filter((t) => set.has(t.id))
      .sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
      );
  }, [libraryTracks, favoriteSongIds]);

  const allFavoriteTracksUnion = useMemo(() => {
    const seen = new Set<string>();
    const out: Track[] = [];
    const push = (t: Track): void => {
      if (seen.has(t.id)) return;
      seen.add(t.id);
      out.push(t);
    };
    for (const id of favoriteSongIds) {
      const t = libraryTracks.find((x) => x.id === id);
      if (t) push(t);
    }
    for (const name of favoriteArtistNames) {
      const list = libraryArtistMap.get(name);
      if (list) for (const t of list) push(t);
    }
    for (const k of favoriteAlbumKeys) {
      const list = libraryAlbumMap.get(k);
      if (list) for (const t of list) push(t);
    }
    out.sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
    );
    return out;
  }, [
    favoriteSongIds,
    favoriteArtistNames,
    favoriteAlbumKeys,
    libraryTracks,
    libraryArtistMap,
    libraryAlbumMap,
  ]);

  const hasFavoriteSuggestions =
    favoritedArtistsList.length > 0 ||
    favoritedAlbumsList.length > 0 ||
    favoritedTracks.length > 0;

  const favoriteSuggestionsSummary = useMemo((): string => {
    const bits: string[] = [];
    const nArtists = favoritedArtistsList.length;
    const nAlbums = favoritedAlbumsList.length;
    const nSongs = favoritedTracks.length;
    if (nArtists > 0)
      bits.push(`${nArtists} artist${nArtists === 1 ? "" : "s"}`);
    if (nAlbums > 0) bits.push(`${nAlbums} album${nAlbums === 1 ? "" : "s"}`);
    if (nSongs > 0) bits.push(`${nSongs} song${nSongs === 1 ? "" : "s"}`);
    return bits.join(" · ");
  }, [
    favoritedArtistsList.length,
    favoritedAlbumsList.length,
    favoritedTracks.length,
  ]);

  const suggestedTracks = useMemo(() => {
    if (libraryTracks.length === 0) return [];
    const seen = new Set<string>();
    const out: Track[] = [];

    for (const t of recentlyPlayedTracks) {
      seen.add(t.id);
    }
    for (const id of favoriteSongIds) {
      seen.add(id);
    }

    for (let i = 0; i < libraryTracks.length; i++) {
      const t = libraryTracks[i];
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      out.push(t);
      if (out.length >= 12) break;
    }
    return out;
  }, [libraryTracks, favoriteSongIds, recentlyPlayedTracks]);

  const homeRecentBrowseSearches = useMemo(
    () => recentBrowseSearches.slice(0, 8),
    [recentBrowseSearches],
  );

  const durationSec = useMemo(() => {
    const fromTrack = current?.durationSec ?? 0;
    const fromMedia =
      Number.isFinite(mediaDuration) && mediaDuration > 0 ? mediaDuration : 0;
    return Math.max(fromTrack, fromMedia);
  }, [current?.durationSec, mediaDuration]);

  const flushListeningProgress = useCallback(() => {
    const id = pendingListenTrackIdRef.current;
    const seconds = pendingListenSecRef.current;
    pendingListenTrackIdRef.current = null;
    pendingListenSecRef.current = 0;
    if (!id || seconds < 0.25) return;
    recordTrackPlaybackProgress(id, seconds);
  }, [recordTrackPlaybackProgress]);

  const recordPlaybackProgressForTrack = useCallback(
    (trackId: string, currentPositionSec: number) => {
      if (!isPlayingRef.current) {
        progressTrackIdRef.current = trackId;
        progressPositionSecRef.current = currentPositionSec;
        return;
      }
      if (progressTrackIdRef.current !== trackId) {
        progressTrackIdRef.current = trackId;
        progressPositionSecRef.current = currentPositionSec;
        return;
      }
      const delta = currentPositionSec - progressPositionSecRef.current;
      progressPositionSecRef.current = currentPositionSec;
      if (delta <= 0 || delta > 5) return;
      if (
        pendingListenTrackIdRef.current &&
        pendingListenTrackIdRef.current !== trackId
      ) {
        flushListeningProgress();
      }
      pendingListenTrackIdRef.current = trackId;
      pendingListenSecRef.current += delta;
      if (pendingListenSecRef.current >= 5) {
        flushListeningProgress();
      }
    },
    [flushListeningProgress],
  );

  // --- Last.fm scrobbling helpers (use refs to avoid source-order/TDZ issues with mid-file values) ---
  const computeListenedSecForScrobble = useCallback((): number => {
    if (youtubeStreamActiveRef.current && hiddenYoutubeRef.current) {
      const t = hiddenYoutubeRef.current.getCurrentTime?.() ?? 0;
      return Number.isFinite(t) && (t as number) >= 0 ? (t as number) : 0;
    }
    const el = audioRef.current;
    if (el && Number.isFinite(el.currentTime) && el.currentTime >= 0) {
      return el.currentTime;
    }
    return Math.max(0, positionSecRef.current);
  }, []);

  const qualifiesForScrobble = useCallback((listened: number, dur: number): boolean => {
    if (!Number.isFinite(listened) || listened < 30) return false;
    if (!Number.isFinite(dur) || dur <= 0) {
      // No known duration: require a solid listen (4 minutes)
      return listened >= 240;
    }
    const half = dur / 2;
    const thresh = Math.min(half, 240);
    return listened >= Math.max(30, thresh);
  }, []);

  const tryLastfmScrobble = useCallback(() => {
    if (!lastfmEnabledRef.current) return;
    const ref = lastfmPlayRef.current;
    if (!ref.queueId || ref.scrobbled) return;
    const track = currentTrackRef.current;
    if (!track) return;
    const artist = track.artist?.trim();
    const title = track.title?.trim();
    if (!artist || !title) return;
    const listened = computeListenedSecForScrobble();
    const dur = (durationSecRef.current > 0 ? durationSecRef.current : (track.durationSec ?? 0));
    if (!qualifiesForScrobble(listened, dur)) return;

    const timestamp = ref.startTsSec > 0
      ? ref.startTsSec
      : Math.floor(Date.now() / 1000) - Math.floor(listened || 0);

    ref.scrobbled = true;

    console.log(`[Last.fm] Scrobble staged for "${artist} - ${title}" (listened ~${listened.toFixed(0)}s of ${dur || '?'}s)`);

    // Stage the scrobble. It will be submitted when the *next* song begins to play
    // (per the requirement that scrobbling happens on song start).
    pendingLastfmScrobbleRef.current = {
      artist,
      track: title,
      timestamp,
      album: track.album?.trim() || undefined,
      durationSec: dur > 0 ? dur : undefined,
    };
  }, [computeListenedSecForScrobble, qualifiesForScrobble]);

  useEffect(() => {
    progressTrackIdRef.current = current?.id ?? null;
    progressPositionSecRef.current = 0;
    return () => {
      flushListeningProgress();
    };
  }, [activeQueueId, current?.id, flushListeningProgress]);

  useEffect(() => {
    if (isPlaying) return;
    flushListeningProgress();
    // Flush any qualified but not-yet-submitted scrobble when playback stops.
    submitPendingLastfmScrobble();
  }, [flushListeningProgress, isPlaying, submitPendingLastfmScrobble]);

  useEffect(() => {
    return () => {
      flushListeningProgress();
    };
  }, [flushListeningProgress]);

  const markCurrentSkipped = useCallback((): void => {
    if (!isPlayingRef.current) return;
    tryLastfmScrobble();
    const id = current?.id;
    if (!id) return;
    flushListeningProgress();
    if (durationSec > 0) {
      const remainingSec = durationSec - positionSec;
      const nearEndSec = Math.min(15, Math.max(5, durationSec * 0.1));
      if (remainingSec <= nearEndSec) return;
    }
    recordTrackSkipped(id);
  }, [
    current?.id,
    durationSec,
    flushListeningProgress,
    positionSec,
    recordTrackSkipped,
    tryLastfmScrobble,
  ]);

  const selectIndex = useCallback(
    (index: number) => {
      if (queue[index]?.queueId !== activeQueueIdRef.current)
        markCurrentSkipped();
      shuffleHistoryRef.current = [];
      setActiveQueueId(queue[index]?.queueId ?? null);
      setPositionSec(0);
      setLoadError(null);
      setIsPlaying(true);
    },
    [markCurrentSkipped, queue],
  );

  const goNext = useCallback((): void => {
    if (queue.length === 0) return;
    tryLastfmScrobble();
    const idx = activeIndex >= 0 ? activeIndex : 0;

    if (shuffle && queue.length > 1) {
      shuffleHistoryRef.current.push(idx);
      let j = idx;
      for (let n = 0; n < 48 && j === idx; n++) {
        j = Math.floor(Math.random() * queue.length);
      }
      setActiveQueueId(queue[j]?.queueId ?? null);
      setPositionSec(0);
      setLoadError(null);
      setIsPlaying(true);
      return;
    }

    if (idx < queue.length - 1) {
      setActiveQueueId(queue[idx + 1]?.queueId ?? null);
      setPositionSec(0);
      setLoadError(null);
      setIsPlaying(true);
      return;
    }
    if (repeatMode === "all") {
      setActiveQueueId(queue[0]?.queueId ?? null);
      setPositionSec(0);
      setLoadError(null);
      setIsPlaying(true);
      return;
    }
    setIsPlaying(false);
  }, [activeIndex, queue, repeatMode, shuffle, tryLastfmScrobble]);

  const goPrev = useCallback((): void => {
    if (queue.length === 0) return;
    tryLastfmScrobble();
    const idx = activeIndex >= 0 ? activeIndex : 0;

    if (shuffle && shuffleHistoryRef.current.length > 0) {
      const prevIdx = shuffleHistoryRef.current.pop();
      if (prevIdx !== undefined && prevIdx >= 0 && prevIdx < queue.length) {
        setActiveQueueId(queue[prevIdx]?.queueId ?? null);
        setPositionSec(0);
        setLoadError(null);
        setIsPlaying(true);
        return;
      }
    }

    if (idx > 0) {
      setActiveQueueId(queue[idx - 1]?.queueId ?? null);
      setPositionSec(0);
      setLoadError(null);
      setIsPlaying(true);
      return;
    }
    if (repeatMode === "all") {
      setActiveQueueId(queue[queue.length - 1]?.queueId ?? null);
      setPositionSec(0);
      setLoadError(null);
      setIsPlaying(true);
    }
  }, [activeIndex, queue, repeatMode, shuffle, tryLastfmScrobble]);

  const cycleRepeatMode = useCallback((): void => {
    const next: RepeatMode =
      repeatMode === "off" ? "all" : repeatMode === "all" ? "one" : "off";
    setRepeatMode(next);
  }, [repeatMode, setRepeatMode]);

  const toggleShuffle = useCallback((): void => {
    setShuffle(!shuffle);
  }, [shuffle, setShuffle]);

  const setPlayerVolume = useCallback(
    (nextVolume: number): void => {
      const next = Math.min(1, Math.max(0, nextVolume));
      if (rememberVolume) persistVolume(next);
      else setSessionVolume(next);
    },
    [persistVolume, rememberVolume],
  );

  const clampPanelsToRow = useCallback((): void => {
    const rowW = mainRowRef.current?.getBoundingClientRect().width ?? 0;
    if (rowW <= 0) return;
    const { libraryPx, queuePx } = clampLibraryQueueWidths(
      rowW,
      libraryPanelPxRef.current,
      queuePanelPxRef.current,
    );
    setLibraryPanelPx(libraryPx);
    setQueuePanelPx(queuePx);
  }, []);

  const persistPanelWidths = useCallback((): void => {
    try {
      window.localStorage.setItem(
        STORAGE_LIBRARY_PANEL_PX,
        String(libraryPanelPxRef.current),
      );
      window.localStorage.setItem(
        STORAGE_QUEUE_PANEL_PX,
        String(queuePanelPxRef.current),
      );
    } catch {
      /* ignore */
    }
  }, []);

  const onLibraryQueueResizeStart = useCallback((): void => {
    setIsPanelResizing(true);
    panelResizeSessionRef.current = {
      kind: "library-queue",
      startLib: libraryPanelPxRef.current,
      startQ: queuePanelPxRef.current,
    };
  }, []);

  const onLibraryQueueResizeMove = useCallback((dx: number): void => {
    const s = panelResizeSessionRef.current;
    if (!s || s.kind !== "library-queue") return;
    const rowW = mainRowRef.current?.getBoundingClientRect().width ?? 0;
    const next = clampLibraryQueueWidths(rowW, s.startLib + dx, s.startQ - dx);
    setLibraryPanelPx(next.libraryPx);
    setQueuePanelPx(next.queuePx);
  }, []);

  const onQueuePlayerResizeStart = useCallback((): void => {
    setIsPanelResizing(true);
    panelResizeSessionRef.current = {
      kind: "queue-player",
      startQ: queuePanelPxRef.current,
    };
  }, []);

  const onQueuePlayerResizeMove = useCallback((dx: number): void => {
    const s = panelResizeSessionRef.current;
    if (!s || s.kind !== "queue-player") return;
    const rowW = mainRowRef.current?.getBoundingClientRect().width ?? 0;
    const nextQ = clampQueuePanelWidth(
      rowW,
      libraryPanelPxRef.current,
      s.startQ + dx,
    );
    setQueuePanelPx(nextQ);
  }, []);

  const onPanelResizeEnd = useCallback((): void => {
    panelResizeSessionRef.current = null;
    setIsPanelResizing(false);
    persistPanelWidths();
  }, [persistPanelWidths]);

  // Double-click snaps for fluid resize: animates via width transition on panels
  const snapLibraryQueueDefaults = useCallback((): void => {
    const rowW = mainRowRef.current?.getBoundingClientRect().width ?? 0;
    const next = clampLibraryQueueWidths(rowW, 440, 300);
    setLibraryPanelPx(next.libraryPx);
    setQueuePanelPx(next.queuePx);
    // persist after state settles
    queueMicrotask(() => {
      try {
        window.localStorage.setItem(STORAGE_LIBRARY_PANEL_PX, String(next.libraryPx));
        window.localStorage.setItem(STORAGE_QUEUE_PANEL_PX, String(next.queuePx));
      } catch {
        /* ignore */
      }
    });
  }, []);

  const snapQueueDefault = useCallback((): void => {
    const rowW = mainRowRef.current?.getBoundingClientRect().width ?? 0;
    if (rowW <= 0) {
      setQueuePanelPx(300);
      return;
    }
    const nextQ = clampQueuePanelWidth(rowW, libraryPanelPxRef.current, 300);
    setQueuePanelPx(nextQ);
    queueMicrotask(() => {
      try {
        window.localStorage.setItem(STORAGE_QUEUE_PANEL_PX, String(nextQ));
      } catch {
        /* ignore */
      }
    });
  }, []);

  useEffect(() => {
    if (!layoutLg) return undefined;
    const onResize = (): void => {
      clampPanelsToRow();
    };
    window.addEventListener("resize", onResize);
    clampPanelsToRow();
    return () => window.removeEventListener("resize", onResize);
  }, [layoutLg, clampPanelsToRow]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return undefined;
    el.volume = volume;
  }, [volume]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return undefined;
    el.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    if (coverObjectUrlRef.current) {
      URL.revokeObjectURL(coverObjectUrlRef.current);
      coverObjectUrlRef.current = null;
    }
    setCoverArtUrl(null);

    if (
      !current ||
      (!current.library && !current.youtubeQuery && !current.audioUrl)
    ) {
      const el = audioRef.current;
      if (el) {
        el.pause();
        el.removeAttribute("src");
        el.load();
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      return undefined;
    }

    const youtubeVideoId = current.youtubeVideoId?.trim();
    if (!current.library && youtubeVideoId) {
      const el = audioRef.current;
      if (el) {
        el.pause();
        el.removeAttribute("src");
        el.load();
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setCoverArtUrl(youtubeVideoThumbnailUrl(youtubeVideoId));
      return undefined;
    }

    if (!current.library) {
      const el = audioRef.current;
      if (el) {
        el.pause();
        el.removeAttribute("src");
        el.load();
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      return undefined;
    }
    let cancelled = false;
    const pendingPos = pendingRestorePositionRef.current;
    const rid = requestAnimationFrame(() => {
      setMediaDuration(0);
      setPositionSec(pendingPos ?? 0);
    });
    void (async (): Promise<void> => {
      setLoadError(null);
      const file = await resolveFileForTrack(current);
      if (cancelled) return;
      if (!file) {
        setLoadError("Could not read this file from the library.");
        return;
      }
      const coverBytesPromise = getCoverBytesForTrack(current.id, file);
      const url = URL.createObjectURL(file);
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
      objectUrlRef.current = url;
      if (cancelled) {
        return;
      }
      const coverBytes = await coverBytesPromise;
      if (cancelled) return;
      if (coverBytes) {
        const coverUrl = URL.createObjectURL(
          new Blob([coverBytes.data], { type: coverBytes.mime }),
        );
        coverObjectUrlRef.current = coverUrl;
        setCoverArtUrl(coverUrl);
      }
      const el = audioRef.current;
      if (!el || cancelled) {
        return;
      }
      el.src = url;
      el.load();
      el.playbackRate = playbackRateRef.current;
      if (isPlayingRef.current) {
        playAudioElement(el);
      }
    })();
    return (): void => {
      cancelled = true;
      cancelAnimationFrame(rid);
      if (coverObjectUrlRef.current) {
        URL.revokeObjectURL(coverObjectUrlRef.current);
        coverObjectUrlRef.current = null;
      }
    };
  }, [current, resolveFileForTrack, playAudioElement]);

  const playbackYoutubeVideoId = current?.youtubeVideoId?.trim() || null;

  useEffect(() => {
    if (!playbackYoutubeVideoId || current?.library) return undefined;
    setCoverArtUrl(youtubeVideoThumbnailUrl(playbackYoutubeVideoId));
    return undefined;
  }, [playbackYoutubeVideoId, current?.library, current?.id]);
  const youtubeStreamActive = Boolean(playbackYoutubeVideoId);

  // Sync refs for Last.fm scrobble helpers (must be after the values are declared in source)
  useLayoutEffect(() => {
    currentTrackRef.current = current;
  }, [current]);
  useLayoutEffect(() => {
    durationSecRef.current = durationSec;
  }, [durationSec]);
  useLayoutEffect(() => {
    positionSecRef.current = positionSec;
  }, [positionSec]);
  useLayoutEffect(() => {
    youtubeStreamActiveRef.current = youtubeStreamActive;
  }, [youtubeStreamActive]);

  // Dynamic accent from current cover art (only when enabled and we have a usable cover URL)
  useEffect(() => {
    let cancelled = false;
    const enabled = dynamicAccentEnabled;

    if (!enabled || !coverArtUrl) {
      applyDynamicAccentVars(null);
      return () => {
        if (!cancelled) applyDynamicAccentVars(null);
      };
    }

    // Kick off extraction + apply (async, fire-and-forget safe)
    void (async () => {
      try {
        await applyDynamicAccentFromCover(coverArtUrl);
      } catch {
        // ignore; applier already cleared on failure paths
      }
    })();

    return () => {
      cancelled = true;
      // When cover changes or feature flips, clear so palette rules win again
      applyDynamicAccentVars(null);
    };
  }, [coverArtUrl, dynamicAccentEnabled]);
  const needsYoutubeResolve = Boolean(
    current?.youtubeQuery?.trim() && !playbackYoutubeVideoId,
  );

  const handleTrackEnded = useCallback((): void => {
    flushListeningProgress();
    tryLastfmScrobble();
    if (current?.id) {
      recordTrackPlaybackCompleted(current.id);
    }
    if (repeatMode === "one") {
      if (current?.id) {
        recordTrackPlaybackStarted(current.id);
      }
      if (youtubeStreamActive && hiddenYoutubeRef.current) {
        hiddenYoutubeRef.current.seekTo(0);
        setPositionSec(0);
        setIsPlaying(true);
        return;
      }
      const el = audioRef.current;
      if (el) {
        el.currentTime = 0;
        setPositionSec(0);
        playAudioElement(el);
      }
      return;
    }
    if (!autoAdvanceOnEnd) {
      setIsPlaying(false);
      return;
    }
    goNext();
  }, [
    current?.id,
    repeatMode,
    autoAdvanceOnEnd,
    goNext,
    youtubeStreamActive,
    flushListeningProgress,
    recordTrackPlaybackCompleted,
    recordTrackPlaybackStarted,
    playAudioElement,
    tryLastfmScrobble,
  ]);

  useEffect(() => {
    const query = current?.youtubeQuery?.trim();
    if (!query || current?.youtubeVideoId?.trim()) {
      queueMicrotask(() => setStreamResolving(false));
      return undefined;
    }

    const controller = new AbortController();
    queueMicrotask(() => setStreamResolving(true));

    void resolveYoutubeVideoId(query, controller.signal)
      .then((videoId) => {
        if (controller.signal.aborted) return;
        if (videoId && current?.id) {
          patchTrackById(current.id, (t) => ({
            ...t,
            youtubeVideoId: videoId,
          }));
          setLoadError(null);
        } else if (!videoId) {
          setLoadError("Could not find a YouTube video for this track.");
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (err instanceof Error && err.name === "AbortError") return;
        if (
          typeof err === "object" &&
          err !== null &&
          "name" in err &&
          err.name === "AbortError"
        ) {
          return;
        }
        setLoadError(
          err instanceof Error
            ? err.message
            : "Could not resolve YouTube stream.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setStreamResolving(false);
      });

    return (): void => {
      controller.abort();
    };
  }, [
    current?.id,
    current?.youtubeQuery,
    current?.youtubeVideoId,
    patchTrackById,
  ]);

  const onYoutubeDuration = useCallback(
    (seconds: number) => {
      setMediaDuration(seconds);
      if (current?.id) bumpTrackDuration(current.id, seconds);
    },
    [bumpTrackDuration, current?.id],
  );

  useEffect(() => {
    if (!youtubeStreamActive) return undefined;
    const tick = (): void => {
      const t = hiddenYoutubeRef.current?.getCurrentTime() ?? 0;
      if (Number.isFinite(t) && t >= 0) {
        setPositionSec(t);
        if (current?.id) recordPlaybackProgressForTrack(current.id, t);
        reportPlayback(activeQueueIdRef.current, t, isPlayingRef.current);
      }
      const d = hiddenYoutubeRef.current?.getDuration() ?? 0;
      if (Number.isFinite(d) && d > 0) setMediaDuration(d);
    };
    tick();
    const id = window.setInterval(tick, 500);
    return (): void => {
      window.clearInterval(id);
    };
  }, [
    current?.id,
    youtubeStreamActive,
    recordPlaybackProgressForTrack,
    reportPlayback,
  ]);

  useEffect(() => {
    const resumeAfterGesture = (): void => {
      if (!pendingResumeAfterGestureRef.current) return;
      if (youtubeStreamActive) {
        pendingResumeAfterGestureRef.current = false;
        setIsPlaying(true);
        return;
      }
      const el = audioRef.current;
      if (!el || !el.src) return;
      setIsPlaying(true);
      playAudioElement(el);
    };

    window.addEventListener("pointerdown", resumeAfterGesture, {
      capture: true,
    });
    window.addEventListener("keydown", resumeAfterGesture, { capture: true });
    return (): void => {
      window.removeEventListener("pointerdown", resumeAfterGesture, {
        capture: true,
      });
      window.removeEventListener("keydown", resumeAfterGesture, {
        capture: true,
      });
    };
  }, [playAudioElement, youtubeStreamActive]);

  useEffect(() => {
    const reportCurrentPosition = (): void => {
      let pos = positionSec;
      if (youtubeStreamActive && hiddenYoutubeRef.current) {
        const t = hiddenYoutubeRef.current.getCurrentTime();
        if (Number.isFinite(t) && t >= 0) pos = t;
      } else {
        const el = audioRef.current;
        if (el && Number.isFinite(el.currentTime) && el.currentTime >= 0) {
          pos = el.currentTime;
        }
      }
      reportPlayback(activeQueueIdRef.current, pos, isPlayingRef.current);
    };

    window.addEventListener("pagehide", reportCurrentPosition, {
      capture: true,
    });
    return (): void => {
      window.removeEventListener("pagehide", reportCurrentPosition, {
        capture: true,
      });
    };
  }, [positionSec, reportPlayback, youtubeStreamActive]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return undefined;
    if (!el.src) return undefined;
    if (isPlaying) {
      reportPlayback(activeQueueIdRef.current, el.currentTime, true);
      playAudioElement(el);
    } else {
      el.pause();
      const pos = Number.isFinite(el.currentTime) ? el.currentTime : 0;
      reportPlayback(activeQueueIdRef.current, pos, false);
    }
  }, [isPlaying, playAudioElement, reportPlayback]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !current) return undefined;
    const onTime = (): void => {
      setPositionSec(el.currentTime);
      recordPlaybackProgressForTrack(current.id, el.currentTime);
      const now = Date.now();
      if (now - lastPlaybackReportMsRef.current >= 2000) {
        lastPlaybackReportMsRef.current = now;
        reportPlayback(
          activeQueueIdRef.current,
          el.currentTime,
          isPlayingRef.current,
        );
      }
    };
    const onMeta = (): void => {
      if (Number.isFinite(el.duration) && el.duration > 0) {
        setMediaDuration(el.duration);
        bumpTrackDuration(current.id, el.duration);
      }
      const pending = pendingRestorePositionRef.current;
      if (pending != null && pending > 0) {
        const seekTo = Math.min(
          pending,
          el.duration > 0 ? el.duration : pending,
        );
        el.currentTime = seekTo;
        setPositionSec(seekTo);
        pendingRestorePositionRef.current = null;
        reportPlayback(activeQueueIdRef.current, seekTo);
      }
    };
    const onEnded = (): void => {
      handleTrackEnded();
    };
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("ended", onEnded);
    return (): void => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("ended", onEnded);
    };
  }, [
    current,
    bumpTrackDuration,
    handleTrackEnded,
    recordPlaybackProgressForTrack,
    reportPlayback,
  ]);

  useEffect(() => {
    return (): void => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      if (coverObjectUrlRef.current) {
        URL.revokeObjectURL(coverObjectUrlRef.current);
        coverObjectUrlRef.current = null;
      }
      if (scrobbleNotificationTimerRef.current) {
        clearTimeout(scrobbleNotificationTimerRef.current);
        scrobbleNotificationTimerRef.current = null;
      }
      // Best-effort: submit a final pending scrobble on unmount (e.g. closing the app)
      if (pendingLastfmScrobbleRef.current) {
        const p = pendingLastfmScrobbleRef.current;
        pendingLastfmScrobbleRef.current = null;
        void import("@/lib/lastfm/perform-lastfm-scrobble").then(({ default: perform }) => {
          perform(p).catch(() => {});
        });
      }
      // Ensure we don't leave custom accent vars on the document when unmounting
      applyDynamicAccentVars(null);
    };
  }, []);

  const onSeekBarPointer = useCallback(
    (ratio: number) => {
      const r = Math.min(1, Math.max(0, ratio));
      if (youtubeStreamActive && hiddenYoutubeRef.current) {
        const total =
          durationSec > 0
            ? durationSec
            : hiddenYoutubeRef.current.getDuration();
        if (total > 0) {
          const next = r * total;
          hiddenYoutubeRef.current.seekTo(next);
          setPositionSec(next);
          reportPlayback(activeQueueIdRef.current, next);
        }
        return;
      }
      const el = audioRef.current;
      if (!el || !Number.isFinite(el.duration) || el.duration <= 0) {
        if (durationSec > 0) {
          setPositionSec(r * durationSec);
          if (el) el.currentTime = r * durationSec;
        }
        return;
      }
      const next = Math.min(el.duration, Math.max(0, r * el.duration));
      el.currentTime = next;
      setPositionSec(next);
      reportPlayback(activeQueueIdRef.current, next);
    },
    [youtubeStreamActive, durationSec, reportPlayback],
  );

  const seekBySeconds = useCallback(
    (deltaSec: number): void => {
      if (durationSec <= 0) return;
      const nextTime = Math.min(
        durationSec,
        Math.max(0, positionSec + deltaSec),
      );
      onSeekBarPointer(nextTime / durationSec);
    },
    [durationSec, onSeekBarPointer, positionSec],
  );

  const onSeekBarKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>): void => {
      if (durationSec <= 0) return;

      let nextTime: number | null = null;

      if (e.key === "ArrowLeft") nextTime = positionSec - seekStepSmallSec;
      else if (e.key === "ArrowRight")
        nextTime = positionSec + seekStepSmallSec;
      else if (e.key === "PageDown") nextTime = positionSec - seekStepLargeSec;
      else if (e.key === "PageUp") nextTime = positionSec + seekStepLargeSec;
      else if (e.key === "Home") nextTime = 0;
      else if (e.key === "End") nextTime = durationSec;
      else return;

      e.preventDefault();
      const clamped = Math.min(durationSec, Math.max(0, nextTime));
      onSeekBarPointer(clamped / durationSec);
    },
    [
      durationSec,
      onSeekBarPointer,
      positionSec,
      seekStepLargeSec,
      seekStepSmallSec,
    ],
  );

  const runKeyboardShortcutAction = useCallback(
    (action: KeyboardShortcutAction): void => {
      switch (action) {
        case "playPause":
          if (queue.length > 0 && current) setIsPlaying((prev) => !prev);
          break;
        case "previousTrack":
          markCurrentSkipped();
          goPrev();
          break;
        case "nextTrack":
          markCurrentSkipped();
          goNext();
          break;
        case "seekBackward":
          seekBySeconds(-seekStepSmallSec);
          break;
        case "seekForward":
          seekBySeconds(seekStepSmallSec);
          break;
        case "seekBackwardLarge":
          seekBySeconds(-seekStepLargeSec);
          break;
        case "seekForwardLarge":
          seekBySeconds(seekStepLargeSec);
          break;
        case "volumeDown":
          setPlayerVolume(volume - 0.05);
          break;
        case "volumeUp":
          setPlayerVolume(volume + 0.05);
          break;
        case "toggleShuffle":
          toggleShuffle();
          break;
        case "cycleRepeat":
          cycleRepeatMode();
          break;
        case "toggleLyrics":
          setShowLyrics((prev) => !prev);
          break;
        case "toggleEqualizer":
          setShowEqualizer((prev) => !prev);
          break;
        case "openHelp":
          setShowKeyboardShortcutsHelp(true);
          break;
        case "focusLibrarySearch":
          // LibraryBrowser listens for this custom event to focus its search input.
          window.dispatchEvent(new CustomEvent("muzical:focus-library-search"));
          break;
        case "addCurrentToPlaylist":
          if (current) {
            openAddToPlaylist(current, current.title);
          }
          break;
        case "jumpToNowPlaying":
          if (activeQueueId) {
            const el = document.querySelector(
              `[data-queue-id="${activeQueueId}"]`,
            ) as HTMLElement | null;
            el?.scrollIntoView({ block: "center", behavior: "smooth" });
            // Briefly flash the row for visibility
            if (el) {
              el.classList.add("!bg-accent-100", "dark:!bg-white/10");
              window.setTimeout(() => {
                el.classList.remove("!bg-accent-100", "dark:!bg-white/10");
              }, 900);
            }
          }
          break;
        case "toggleFavoriteCurrent":
          if (current) {
            toggleFavoriteTrack(current);
          }
          break;
        case "clearQueue":
          markCurrentSkipped();
          clearQueue();
          setActiveQueueId(null);
          setIsPlaying(false);
          setPositionSec(0);
          clearQueueSelection();
          break;
      }
    },
    [
      activeQueueId,
      clearQueue,
      clearQueueSelection,
      current,
      cycleRepeatMode,
      goNext,
      goPrev,
      markCurrentSkipped,
      openAddToPlaylist,
      queue.length,
      seekBySeconds,
      seekStepLargeSec,
      seekStepSmallSec,
      setIsPlaying,
      setPlayerVolume,
      toggleFavoriteTrack,
      toggleShuffle,
      volume,
    ],
  );

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (showKeyboardShortcutsHelp) return;
      if (shouldIgnoreKeyboardShortcutEvent(event)) return;

      const shortcut = normalizeKeyboardShortcutEvent(event);
      if (!shortcut) return;

      const action = findActionForKeyboardShortcut(
        preferences.keyboardShortcuts,
        shortcut,
      );
      if (!action) return;

      event.preventDefault();
      runKeyboardShortcutAction(action);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    preferences.keyboardShortcuts,
    runKeyboardShortcutAction,
    showKeyboardShortcutsHelp,
  ]);

  const statusLabel = isScanning
    ? "Scanning…"
    : youtubePrefetchActive
      ? `Prefetching ${youtubePrefetchVideoCount} YouTube video${youtubePrefetchVideoCount === 1 ? "" : "s"}…`
      : `${libraryTracks.length} in library · ${queue.length} in queue`;

  const emptyQueueCardGapClass = compactLists ? "gap-2" : "gap-3";
  const emptyQueueCardPadClass = compactLists ? "p-2" : "p-3";
  const searchParams = useSearchParams();
  const activeBrowseView = parseBrowseView(searchParams.get('view'));
  const showBrowserView = activeBrowseView === 'browser';

  useEffect(() => {
    if (!showBrowserView && layoutLg) setBrowserPlayerExpanded(false);
  }, [showBrowserView, layoutLg]);

  const handleRemoveQueueItem = useCallback(
    (queueId: string, index: number) => {
      const isCurrent = activeQueueId === queueId;
      if (isCurrent) markCurrentSkipped();
      const nextId = isCurrent
        ? (queue[index + 1]?.queueId ?? queue[index - 1]?.queueId ?? null)
        : activeQueueId;
      removeFromQueue(queueId);
      setActiveQueueId(nextId);
      if (isCurrent && !nextId) {
        setIsPlaying(false);
        setPositionSec(0);
      }
      // also drop from selection if present
      setSelectedQueueIds((prev) => {
        if (!prev.has(queueId)) return prev;
        const n = new Set(prev);
        n.delete(queueId);
        return n;
      });
    },
    [activeQueueId, markCurrentSkipped, queue, removeFromQueue],
  );

  const browserQueuePanel = showLyrics ? (
    <LyricsPanel track={current} onClose={() => setShowLyrics(false)} />
  ) : !isQueueReady ? (
    <QueueLoadingSpinner />
  ) : queue.length === 0 ? (
    <div className="px-4 py-6">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Queue is empty</p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Select songs in the browser and add them to the queue.
      </p>
    </div>
  ) : (
    <>
      <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-zinc-200 bg-white/80 px-3 dark:border-zinc-800 dark:bg-zinc-950/80">
        <h2 className="text-xs font-medium uppercase leading-none tracking-wider text-zinc-500">
          Queue
        </h2>
        <button
          type="button"
          onClick={() => {
            markCurrentSkipped();
            clearQueue();
            setActiveQueueId(null);
            setIsPlaying(false);
            setPositionSec(0);
            clearQueueSelection();
          }}
          className="text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:hover:text-zinc-300"
        >
          Clear
        </button>
      </div>
      <QueueTrackList
        queue={queue}
        activeIndex={activeIndex}
        activeQueueId={activeQueueId}
        compactLists={compactLists}
        libraryTracks={libraryTracks}
        dragOverQueueId={dragOverQueueId}
        draggingQueueId={draggingQueueId}
        onDragOverQueueIdChange={setDragOverQueueId}
        onDraggingQueueIdChange={setDraggingQueueId}
        onSelectIndex={selectIndex}
        onReorderQueueItems={reorderQueueItems}
        onRemoveQueueItem={handleRemoveQueueItem}
        isFavoriteSong={isFavoriteSong}
        onToggleFavoriteTrack={toggleFavoriteTrack}
        onViewTrackDetails={openTrackDetails}
        onViewRelatedSongs={openRelatedSongs}
        onAddTrackToPlaylist={openAddToPlaylist}
        onDownloadTrack={downloadTrack}
        onAddTrackToLibrary={addToLibrary}
        onRemoveTrackFromLibrary={removeFromLibrary}
        selectedQueueIds={selectedQueueIds}
        showQueueCheckboxes={hasQueueSelection}
        onToggleQueueSelect={toggleQueueSelect}
      />
    </>
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <YouTubeStreamNotification
        visible={streamResolving || (needsYoutubeResolve && isPlaying)}
        trackTitle={current?.title}
      />
      <LastfmScrobbleNotification
        visible={!!lastScrobbledTrack}
        artist={lastScrobbledTrack?.artist}
        title={lastScrobbledTrack?.title}
        onDismiss={() => {
          if (scrobbleNotificationTimerRef.current) {
            clearTimeout(scrobbleNotificationTimerRef.current);
            scrobbleNotificationTimerRef.current = null;
          }
          setLastScrobbledTrack(null);
        }}
      />
      <audio ref={audioRef} className="hidden" preload="metadata" />
      <HiddenYoutubePlayer
        ref={hiddenYoutubeRef}
        videoId={playbackYoutubeVideoId}
        isPlaying={isPlaying && youtubeStreamActive}
        volume={volume}
        onReady={() => setLoadError(null)}
        onEnded={handleTrackEnded}
        onDuration={onYoutubeDuration}
        onError={(message) => setLoadError(message)}
      />
      {showKeyboardShortcutsHelp ? (
        <KeyboardShortcutsHelpDialog
          shortcuts={preferences.keyboardShortcuts}
          onClose={() => setShowKeyboardShortcutsHelp(false)}
        />
      ) : null}

      <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-zinc-200 bg-white/90 px-3 py-2 sm:gap-x-4 sm:px-6 sm:py-3 backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-950/90">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-500/15 text-accent-700 ring-1 ring-accent-500/25 dark:text-accent-400 dark:ring-accent-500/30 sm:h-9 sm:w-9">
            <IconQueue className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0 hidden sm:block">
            <h1 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Muzical
            </h1>
            <p className="text-xs text-zinc-500">
              Local library · browser playback · v{readAppVersion()}
            </p>
          </div>
          <div className="min-w-0 sm:hidden">
            <h1 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Muzical</h1>
          </div>
        </div>
        <div className="min-w-0 flex-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <BrowseViewTabs />
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link
            href="/settings/library"
            className="hidden cursor-pointer rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[10px] text-zinc-500 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-700 sm:inline sm:px-3 sm:py-1 sm:text-xs dark:border-zinc-700/80 dark:bg-zinc-900/80 dark:text-zinc-400 dark:shadow-none dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            aria-label="Open library settings"
            aria-live="polite"
          >
            {statusLabel}
          </Link>
          <Link
            href="/settings"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-50 sm:h-9 sm:w-9"
            aria-label="Library settings"
          >
            <IconSettings className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
          </Link>
          <button
            type="button"
            onClick={() => setShowKeyboardShortcutsHelp(true)}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-50 sm:h-9 sm:w-9"
            aria-label="Keyboard shortcuts"
          >
            <IconHelp className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
          </button>
          <PwaInstallButton />
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
        {showBrowserView ? (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <LibraryBrowserView />
            <BrowserViewPlayerBar
              expanded={browserPlayerExpanded}
              onToggleExpanded={() => setBrowserPlayerExpanded((open) => !open)}
              queueLength={queue.length}
              current={current}
              coverArtUrl={coverArtUrl}
              isPlaying={isPlaying}
              canPlay={queue.length > 0 && Boolean(current)}
              onTogglePlay={() => setIsPlaying((p) => !p)}
              onPrev={() => {
                markCurrentSkipped();
                goPrev();
              }}
              onNext={() => {
                markCurrentSkipped();
                goNext();
              }}
              positionSec={positionSec}
              durationSec={durationSec}
              onSeekBarPointer={onSeekBarPointer}
              onSeekBarKeyDown={onSeekBarKeyDown}
              volume={volume}
              onVolumeChange={setPlayerVolume}
              repeatMode={repeatMode}
              shuffle={shuffle}
              playbackRate={playbackRate}
              showLyrics={showLyrics}
              showEqualizer={showEqualizer}
              equalizerGainsDb={equalizerGainsDb}
              onCycleRepeatMode={cycleRepeatMode}
              onToggleShuffle={toggleShuffle}
              onToggleLyrics={() => setShowLyrics((prev) => !prev)}
              onToggleEqualizer={() => setShowEqualizer((prev) => !prev)}
              onPlaybackRateChange={setPlaybackRate}
              onEqualizerBandChange={setEqualizerBandGain}
              onResetEqualizer={resetEqualizer}
              queuePanel={browserQueuePanel}
            />
          </div>
        ) : layoutLg ? (
          // Wide desktop (>=1024px): classic 3-column resizable layout with library | queue | now-playing
          <>
            <div
              className={`flex min-h-0 min-w-0 flex-col overflow-hidden max-lg:flex-2 max-lg:w-full lg:h-full lg:min-w-0 lg:shrink-0 ${panelWidthTransitionClass}`}
              style={
                layoutLg ? { width: libraryPanelPx, flex: "0 0 auto" } : undefined
              }
            >
              <BrowsePanel />
            </div>
            <PanelResizeHandle
              aria-label="Resize library and queue panels"
              onSessionStart={onLibraryQueueResizeStart}
              onSessionMove={onLibraryQueueResizeMove}
              onSessionEnd={onPanelResizeEnd}
              onDoubleClick={snapLibraryQueueDefaults}
            />
        <section
          className={`flex min-h-0 min-w-0 flex-col overflow-hidden border-b border-zinc-200 bg-white dark:border-zinc-800/80 dark:bg-zinc-950/50 max-lg:flex-1 max-lg:w-full lg:h-full lg:shrink-0 lg:border-b-0 lg:border-r lg:border-zinc-200 lg:dark:border-zinc-800 ${panelWidthTransitionClass}`}
          style={
            layoutLg ? { width: queuePanelPx, flex: "0 0 auto" } : undefined
          }
        >
          {/* Fluid content switch: cross-fade + subtle slide when toggling Queue <-> Lyrics */}
          <div className="relative flex h-full min-h-0 flex-col">
            {/* Queue view (list or loading) */}
            <div
              className={`flex min-h-0 flex-col transition-all duration-200 ease-out ${
                showLyrics ? "pointer-events-none opacity-0 translate-x-1" : "opacity-100 translate-x-0"
              }`}
              aria-hidden={showLyrics}
            >
              {!isQueueReady ? (
                <QueueLoadingSpinner />
              ) : (
                <>
                  <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-zinc-200 bg-white/80 px-3 dark:border-zinc-800 dark:bg-zinc-950/80">
                    <h2 className="text-xs font-medium uppercase leading-none tracking-wider text-zinc-500">
                      Queue
                    </h2>
                    <div className="flex items-center gap-2">
                      {hasQueueSelection ? (
                        <>
                          <span className="text-[10px] font-medium text-accent-600 dark:text-accent-400">
                            {selectedQueueIds.size}
                          </span>
                          <button
                            type="button"
                            onClick={() => openAddToPlaylist(selectedQueueTracks, `${selectedQueueIds.size} in queue`)}
                            className="text-xs font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
                          >
                            Playlist
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              for (const t of selectedQueueTracks) toggleFavoriteTrack(t)
                            }}
                            className="text-xs font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
                          >
                            Fav
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const toRemove = Array.from(selectedQueueIds)
                              let nextActive = activeQueueId
                              if (activeQueueId && selectedQueueIds.has(activeQueueId)) {
                                const remaining = queue.filter((r) => !selectedQueueIds.has(r.queueId))
                                nextActive = remaining[0]?.queueId ?? null
                              }
                              // Remove one by one (provider API)
                              for (const qid of toRemove) {
                                removeFromQueue(qid)
                              }
                              if (nextActive !== activeQueueId) setActiveQueueId(nextActive)
                              if (!nextActive) {
                                setIsPlaying(false)
                                setPositionSec(0)
                              }
                              clearQueueSelection()
                            }}
                            className="text-xs font-medium text-red-600 underline-offset-2 hover:text-red-700 hover:underline dark:text-red-400"
                          >
                            Remove
                          </button>
                          <button
                            type="button"
                            onClick={clearQueueSelection}
                            className="text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:hover:text-zinc-300"
                          >
                            Deselect
                          </button>
                        </>
                      ) : null}
                      {queue.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            markCurrentSkipped();
                            clearQueue();
                            setActiveQueueId(null);
                            setIsPlaying(false);
                            setPositionSec(0);
                            clearQueueSelection();
                          }}
                          className="text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:hover:text-zinc-300"
                        >
                          Clear
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="min-h-0 flex-1 overflow-auto pb-2">
                {queue.length === 0 ? (
                  <div className="px-4 py-6">
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Queue is empty
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Add something to start playback.
                      <Link
                        href="/settings"
                        className="ml-2 font-medium text-accent-700 underline-offset-2 hover:underline dark:text-accent-400"
                      >
                        Library folders
                      </Link>
                    </p>

                    {recentlyPlayedTracks.length > 0 ? (
                      <div className="mt-5">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                          Recently played
                        </p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {recentlyPlayedTracks.map((t) => (
                            <div
                              key={t.id}
                              className={`flex min-w-0 items-center ${emptyQueueCardGapClass} rounded-xl border border-zinc-200 bg-white ${emptyQueueCardPadClass} shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40 dark:shadow-none`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                  {t.title}
                                </p>
                                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                                  {t.artist} · {t.album}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <span className="text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">
                                  {t.durationSec > 0
                                    ? formatDuration(t.durationSec)
                                    : "—"}
                                </span>
                                <FavoriteStarButton
                                  className="rounded-full"
                                  filled={isFavoriteSong(t.id)}
                                  onPress={() => toggleFavoriteTrack(t)}
                                  label={
                                    isFavoriteSong(t.id)
                                      ? "Remove song from favorites"
                                      : "Add song to favorites"
                                  }
                                />
                                <button
                                  type="button"
                                  onClick={() => addToQueue(t)}
                                  className="shrink-0 rounded-full bg-accent-500/15 px-2.5 py-1 text-xs font-medium text-accent-800 ring-1 ring-accent-500/25 transition hover:bg-accent-500/25 dark:text-accent-300 dark:ring-accent-500/40"
                                >
                                  Add
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {rediscoverTracks.length > 0 ? (
                      <div className="mt-5">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                            Rediscover
                          </p>
                          <button
                            type="button"
                            onClick={() => addToQueue(rediscoverTracks)}
                            className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                          >
                            Add all
                          </button>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {rediscoverTracks.map((t) => (
                            <div
                              key={t.id}
                              className={`flex min-w-0 items-center ${emptyQueueCardGapClass} rounded-xl border border-zinc-200 bg-white ${emptyQueueCardPadClass} shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40 dark:shadow-none`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                  {t.title}
                                </p>
                                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                                  {t.artist} - {t.album}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => addToQueue(t)}
                                className="shrink-0 rounded-full bg-accent-500/15 px-2.5 py-1 text-xs font-medium text-accent-800 ring-1 ring-accent-500/25 transition hover:bg-accent-500/25 disabled:opacity-40 dark:text-accent-300 dark:ring-accent-500/40"
                              >
                                Add
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {hasFavoriteSuggestions ? (
                      <div className="mt-5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setFavoritesSuggestionsOpen((open) => !open)
                            }
                            aria-expanded={favoritesSuggestionsOpen}
                            className="flex min-w-0 items-center gap-1 rounded-md py-0.5 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 transition hover:text-zinc-700 dark:hover:text-zinc-300"
                          >
                            <IconChevronRight
                              className={[
                                "h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform",
                                favoritesSuggestionsOpen ? "rotate-90" : "",
                              ].join(" ")}
                            />
                            <span>Favorites</span>
                            {!favoritesSuggestionsOpen &&
                            favoriteSuggestionsSummary ? (
                              <span className="truncate font-normal normal-case tracking-normal text-zinc-400">
                                · {favoriteSuggestionsSummary}
                              </span>
                            ) : null}
                          </button>
                          {allFavoriteTracksUnion.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => addToQueue(allFavoriteTracksUnion)}
                              className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            >
                              Add all ({allFavoriteTracksUnion.length})
                            </button>
                          ) : null}
                        </div>
                        {favoritesSuggestionsOpen ? (
                          <div className="mt-3 space-y-4">
                            {favoritedArtistsList.length > 0 ? (
                              <div>
                                <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                                  Artists
                                </p>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                  {favoritedArtistsList.map((name) => {
                                    const tracks =
                                      libraryArtistMap.get(name) ?? [];
                                    return (
                                      <div
                                        key={name}
                                        className={`flex min-w-0 items-center ${emptyQueueCardGapClass} rounded-xl border border-zinc-200 bg-white ${emptyQueueCardPadClass} shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40 dark:shadow-none`}
                                      >
                                        <div className="min-w-0 flex-1">
                                          <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                            {name}
                                          </p>
                                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                            {tracks.length} track
                                            {tracks.length === 1 ? "" : "s"}
                                          </p>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                          <FavoriteStarButton
                                            className="rounded-full"
                                            filled={isFavoriteArtist(name)}
                                            onPress={() =>
                                              toggleFavoriteArtist(name)
                                            }
                                            label="Remove artist from favorites"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => addToQueue(tracks)}
                                            disabled={tracks.length === 0}
                                            className="shrink-0 rounded-full bg-accent-500/15 px-2.5 py-1 text-xs font-medium text-accent-800 ring-1 ring-accent-500/25 transition hover:bg-accent-500/25 disabled:opacity-40 dark:text-accent-300 dark:ring-accent-500/40"
                                          >
                                            Add all
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : null}
                            {favoritedAlbumsList.length > 0 ? (
                              <div>
                                <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                                  Albums
                                </p>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                  {favoritedAlbumsList.map((key) => {
                                    const [album, artist] = key.split("\u0000");
                                    const tracks =
                                      libraryAlbumMap.get(key) ?? [];
                                    const sample = tracks[0];
                                    return (
                                      <div
                                        key={key}
                                        className={`flex min-w-0 items-center ${emptyQueueCardGapClass} rounded-xl border border-zinc-200 bg-white ${emptyQueueCardPadClass} shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40 dark:shadow-none`}
                                      >
                                        <AlbumCoverThumb
                                          track={sample}
                                          className="h-10 w-10 shrink-0 rounded-md"
                                        />
                                        <div className="min-w-0 flex-1">
                                          <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                            {album}
                                          </p>
                                          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                                            {artist}
                                          </p>
                                          <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                                            {tracks.length} track
                                            {tracks.length === 1 ? "" : "s"}
                                          </p>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                          <FavoriteStarButton
                                            className="rounded-full"
                                            filled={isFavoriteAlbum(key)}
                                            onPress={() =>
                                              toggleFavoriteAlbum(key)
                                            }
                                            label="Remove album from favorites"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => addToQueue(tracks)}
                                            disabled={tracks.length === 0}
                                            className="shrink-0 rounded-full bg-accent-500/15 px-2.5 py-1 text-xs font-medium text-accent-800 ring-1 ring-accent-500/25 transition hover:bg-accent-500/25 disabled:opacity-40 dark:text-accent-300 dark:ring-accent-500/40"
                                          >
                                            Add all
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : null}
                            {favoritedTracks.length > 0 ? (
                              <div>
                                <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                                  Songs
                                </p>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                  {favoritedTracks.map((t) => (
                                    <div
                                      key={t.id}
                                      className={`flex min-w-0 items-center ${emptyQueueCardGapClass} rounded-xl border border-zinc-200 bg-white ${emptyQueueCardPadClass} shadow-sm dark:border-zinc-800 dark:bg-zinc-950/40 dark:shadow-none`}
                                    >
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                          {t.title}
                                        </p>
                                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                                          {t.artist} · {t.album}
                                        </p>
                                      </div>
                                      <div className="flex shrink-0 items-center gap-2">
                                        <span className="text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">
                                          {t.durationSec > 0
                                            ? formatDuration(t.durationSec)
                                            : "—"}
                                        </span>
                                        <FavoriteStarButton
                                          className="rounded-full"
                                          filled={isFavoriteSong(t.id)}
                                          onPress={() => toggleFavoriteTrack(t)}
                                          label="Remove song from favorites"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => addToQueue(t)}
                                          className="shrink-0 rounded-full bg-accent-500/15 px-2.5 py-1 text-xs font-medium text-accent-800 ring-1 ring-accent-500/25 transition hover:bg-accent-500/25 dark:text-accent-300 dark:ring-accent-500/40"
                                        >
                                          Add
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {homeRecentBrowseSearches.length > 0 ||
                    suggestedTracks.length > 0 ? (
                      <div className="mt-6">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                          Suggestions
                        </p>
                        {homeRecentBrowseSearches.length > 0 ? (
                          <div className="mb-3 flex flex-wrap gap-2">
                            {homeRecentBrowseSearches.map((entry) => (
                              <RecentBrowseSearchChip
                                key={`${entry.source}\u0000${entry.query}`}
                                entry={entry}
                              />
                            ))}
                          </div>
                        ) : null}
                        {suggestedTracks.length > 0 ? (
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {suggestedTracks.map((t) => (
                              <div
                                key={t.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => addToQueue(t)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    addToQueue(t);
                                  }
                                }}
                                aria-label={`Add ${t.title} to queue`}
                                className={`flex w-full min-w-0 cursor-pointer items-center text-left ${emptyQueueCardGapClass} rounded-xl border border-zinc-200 bg-white ${emptyQueueCardPadClass} shadow-sm transition hover:border-accent-400/50 hover:bg-accent-50/50 dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:border-accent-500/30 dark:hover:bg-accent-950/20 dark:shadow-none`}
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                    {t.title}
                                  </p>
                                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                                    {t.artist} · {t.album}
                                  </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <span className="text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">
                                    {t.durationSec > 0
                                      ? formatDuration(t.durationSec)
                                      : "—"}
                                  </span>
                                  <FavoriteStarButton
                                    className="rounded-full"
                                    filled={isFavoriteSong(t.id)}
                                    onPress={() => toggleFavoriteTrack(t)}
                                    label={
                                      isFavoriteSong(t.id)
                                        ? "Remove song from favorites"
                                        : "Add song to favorites"
                                    }
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <QueueTrackList
                    queue={queue}
                    activeIndex={activeIndex}
                    activeQueueId={activeQueueId}
                    compactLists={compactLists}
                    libraryTracks={libraryTracks}
                    dragOverQueueId={dragOverQueueId}
                    draggingQueueId={draggingQueueId}
                    onDragOverQueueIdChange={setDragOverQueueId}
                    onDraggingQueueIdChange={setDraggingQueueId}
                    onSelectIndex={selectIndex}
                    onReorderQueueItems={reorderQueueItems}
                    onRemoveQueueItem={handleRemoveQueueItem}
                    isFavoriteSong={isFavoriteSong}
                    onToggleFavoriteTrack={toggleFavoriteTrack}
                    onViewTrackDetails={openTrackDetails}
                    onViewRelatedSongs={openRelatedSongs}
                    onAddTrackToPlaylist={openAddToPlaylist}
                    onDownloadTrack={downloadTrack}
                    onAddTrackToLibrary={addToLibrary}
                    onRemoveTrackFromLibrary={removeFromLibrary}
                    selectedQueueIds={selectedQueueIds}
                    showQueueCheckboxes={hasQueueSelection}
                    onToggleQueueSelect={toggleQueueSelect}
                  />
                )}
              </div>
            </>
          )}
            </div>

            {/* Lyrics layer (slides/fades in over the queue area) */}
            <div
              className={`absolute inset-0 z-10 transition-all duration-200 ease-out ${
                showLyrics ? "opacity-100 translate-x-0" : "pointer-events-none opacity-0 -translate-x-1"
              }`}
              aria-hidden={!showLyrics}
            >
              <LyricsPanel track={current} onClose={() => setShowLyrics(false)} />
            </div>
          </div>
        </section>
        <PanelResizeHandle
          aria-label="Resize queue and player panels"
          onSessionStart={onQueuePlayerResizeStart}
          onSessionMove={onQueuePlayerResizeMove}
          onSessionEnd={onPanelResizeEnd}
          onDoubleClick={snapQueueDefault}
        />
        <aside className="flex min-h-0 min-w-0 flex-1 flex-col justify-between gap-3 overflow-hidden bg-zinc-50 p-4 dark:bg-transparent lg:h-full lg:min-w-0 lg:flex-1">
          <div className="mx-auto flex w-full max-w-[280px] shrink-0 flex-col gap-4">
            <div
              className="relative aspect-square w-full overflow-hidden rounded-2xl bg-linear-to-br from-accent-200/90 via-zinc-100 to-zinc-200 ring-1 ring-zinc-300/70 shadow-xl shadow-zinc-400/20 dark:from-accent-900/40 dark:via-zinc-800 dark:to-zinc-900 dark:ring-zinc-700/60 dark:shadow-2xl dark:shadow-black/40"
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
                  <span className="select-none text-6xl font-bold tracking-tighter text-accent-800/20 dark:text-zinc-700/90">
                    {current?.album ? current.album.charAt(0) : "♪"}
                  </span>
                </div>
              )}
            </div>
            <div className="text-center">
              <p className="truncate text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                {current?.title ?? "—"}
              </p>
              <p className="mt-1 truncate text-sm text-zinc-600 dark:text-zinc-400">
                {current?.artist ?? ""}
              </p>
              <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-600">
                {current?.album ?? ""}
              </p>
            </div>
          </div>

          <div className="shrink-0 space-y-2.5">
            {showEqualizer ? (
              <GraphicEqualizer
                gainsDb={equalizerGainsDb}
                onBandChange={setEqualizerBandGain}
                onReset={resetEqualizer}
                onClose={() => setShowEqualizer(false)}
              />
            ) : null}
            <div className="flex items-center justify-between text-xs tabular-nums text-zinc-500">
              <span>{formatDuration(positionSec)}</span>
              <span>{durationSec > 0 ? formatDuration(durationSec) : "—"}</span>
            </div>
            <div
              className="group relative h-2.5 cursor-pointer rounded-full bg-zinc-200 dark:bg-zinc-800 touch-manipulation sm:h-2"
              onPointerDown={(e) => {
                const el = e.currentTarget;
                const rect = el.getBoundingClientRect();
                const ratio = (e.clientX - rect.left) / Math.max(1, rect.width);
                onSeekBarPointer(ratio);
                const move = (ev: PointerEvent): void => {
                  const r = (ev.clientX - rect.left) / Math.max(1, rect.width);
                  onSeekBarPointer(r);
                };
                const up = (): void => {
                  window.removeEventListener("pointermove", move);
                  window.removeEventListener("pointerup", up);
                };
                window.addEventListener("pointermove", move);
                window.addEventListener("pointerup", up);
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

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Previous track"
                  onClick={() => {
                    markCurrentSkipped();
                    goPrev();
                  }}
                  disabled={queue.length === 0}
                  className="rounded-full p-2.5 text-zinc-600 transition hover:bg-zinc-200 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                >
                  <IconSkipBack className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  aria-label={isPlaying ? "Pause" : "Play"}
                  onClick={() => setIsPlaying((p) => !p)}
                  disabled={queue.length === 0 || !current}
                  className="mx-0.5 flex h-12 w-12 items-center justify-center rounded-full bg-accent-500 text-zinc-950 shadow-md shadow-accent-600/20 transition hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-40 dark:shadow-accent-900/30"
                >
                  {isPlaying ? (
                    <IconPause className="h-6 w-6" />
                  ) : (
                    <IconPlay className="h-6 w-6 pl-0.5" />
                  )}
                </button>
                <button
                  type="button"
                  aria-label="Next track"
                  onClick={() => {
                    markCurrentSkipped();
                    goNext();
                  }}
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
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setPlayerVolume(v);
                  }}
                  className="h-1 w-full min-w-0 cursor-pointer accent-accent-500"
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
                  repeatMode === "off"
                    ? "Repeat off. Click for repeat all."
                    : repeatMode === "all"
                      ? "Repeat all. Click for repeat one."
                      : "Repeat one. Click for repeat off."
                }
              >
                <IconRepeatLoop
                  dimmed={repeatMode === "off"}
                  className="h-5 w-5"
                />
                {repeatMode === "one" ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded bg-accent-500 px-0.5 text-[9px] font-bold leading-none text-zinc-950">
                    1
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => toggleShuffle()}
                aria-pressed={shuffle}
                aria-label={shuffle ? "Shuffle on" : "Shuffle off"}
                className={[
                  "flex h-9 w-9 items-center justify-center rounded-full border transition",
                  shuffle
                    ? "border-accent-500/50 bg-accent-500/15 text-accent-800 dark:text-accent-300"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
                ].join(" ")}
              >
                <IconShuffle className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setShowLyrics((prev) => !prev)}
                aria-pressed={showLyrics}
                aria-label={showLyrics ? "Hide lyrics" : "Show lyrics"}
                className={[
                  "flex h-9 w-9 items-center justify-center rounded-full border transition",
                  showLyrics
                    ? "border-accent-500/50 bg-accent-500/15 text-accent-800 dark:text-accent-300"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
                ].join(" ")}
              >
                <IconLyrics className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setShowEqualizer((prev) => !prev)}
                aria-pressed={showEqualizer}
                aria-label={showEqualizer ? "Hide equalizer" : "Show equalizer"}
                className={[
                  "flex h-9 w-9 items-center justify-center rounded-full border transition",
                  showEqualizer
                    ? "border-accent-500/50 bg-accent-500/15 text-accent-800 dark:text-accent-300"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
                ].join(" ")}
              >
                <IconEqualizer className="h-5 w-5" />
              </button>
              <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                <span className="sr-only">Playback speed</span>
                <span aria-hidden className="tabular-nums">
                  Speed
                </span>
                <select
                  value={playbackRate}
                  onChange={(e) => setPlaybackRate(Number(e.target.value))}
                  className="cursor-pointer rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-800 outline-none ring-accent-500/0 transition focus:border-accent-400 focus:ring-2 focus:ring-accent-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                  aria-label="Playback speed"
                >
                  {PLAYBACK_RATES.map((r) => (
                    <option key={r} value={r}>
                      {r === 1 ? "1×" : `${r}×`}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </aside>
          </>
        ) : (
          // Medium and below (<1024px): full-width library browser + persistent expandable bottom player bar.
          // This makes the app usable across phones, tablets, and "medium" viewport widths instead of
          // vertically stacking three heavy panels.
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="min-h-0 flex-1 overflow-hidden">
              <BrowsePanel />
            </div>
            <BrowserViewPlayerBar
              expanded={browserPlayerExpanded}
              onToggleExpanded={() => setBrowserPlayerExpanded((open) => !open)}
              queueLength={queue.length}
              current={current}
              coverArtUrl={coverArtUrl}
              isPlaying={isPlaying}
              canPlay={queue.length > 0 && Boolean(current)}
              onTogglePlay={() => setIsPlaying((p) => !p)}
              onPrev={() => {
                markCurrentSkipped();
                goPrev();
              }}
              onNext={() => {
                markCurrentSkipped();
                goNext();
              }}
              positionSec={positionSec}
              durationSec={durationSec}
              onSeekBarPointer={onSeekBarPointer}
              onSeekBarKeyDown={onSeekBarKeyDown}
              volume={volume}
              onVolumeChange={setPlayerVolume}
              repeatMode={repeatMode}
              shuffle={shuffle}
              playbackRate={playbackRate}
              showLyrics={showLyrics}
              showEqualizer={showEqualizer}
              equalizerGainsDb={equalizerGainsDb}
              onCycleRepeatMode={cycleRepeatMode}
              onToggleShuffle={toggleShuffle}
              onToggleLyrics={() => setShowLyrics((prev) => !prev)}
              onToggleEqualizer={() => setShowEqualizer((prev) => !prev)}
              onPlaybackRateChange={setPlaybackRate}
              onEqualizerBandChange={setEqualizerBandGain}
              onResetEqualizer={resetEqualizer}
              queuePanel={browserQueuePanel}
            />
          </div>
        )}
      </div>
    </div>
  );
}
