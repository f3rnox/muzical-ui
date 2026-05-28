/**
 * Per-track playback telemetry stored locally in the browser.
 */
export type TrackListeningStats = {
  trackId: string
  playCount: number
  completedCount: number
  skipCount: number
  totalListenSec: number
  firstPlayedAt?: number
  lastPlayedAt?: number
  lastCompletedAt?: number
  lastSkippedAt?: number
}

export type ListeningStatsByTrackId = Record<string, TrackListeningStats>
