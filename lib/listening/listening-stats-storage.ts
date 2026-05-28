import type { ListeningStatsByTrackId, TrackListeningStats } from '@/types/listening-stats'

const STORAGE_LISTENING_STATS = 'muzical.listeningStats.v1'

function finiteNonNegativeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
}

function optionalTimestamp(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return undefined
  }
  return value
}

function normalizeTrackListeningStats(trackId: string, raw: unknown): TrackListeningStats | null {
  if (!trackId || typeof raw !== 'object' || raw === null) return null
  const row = raw as Partial<TrackListeningStats>
  return {
    trackId,
    playCount: Math.floor(finiteNonNegativeNumber(row.playCount)),
    completedCount: Math.floor(finiteNonNegativeNumber(row.completedCount)),
    skipCount: Math.floor(finiteNonNegativeNumber(row.skipCount)),
    totalListenSec: finiteNonNegativeNumber(row.totalListenSec),
    firstPlayedAt: optionalTimestamp(row.firstPlayedAt),
    lastPlayedAt: optionalTimestamp(row.lastPlayedAt),
    lastCompletedAt: optionalTimestamp(row.lastCompletedAt),
    lastSkippedAt: optionalTimestamp(row.lastSkippedAt),
  }
}

export function readStoredListeningStats(): ListeningStatsByTrackId {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_LISTENING_STATS)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: ListeningStatsByTrackId = {}
    for (const [trackId, value] of Object.entries(parsed)) {
      const normalized = normalizeTrackListeningStats(trackId, value)
      if (!normalized) continue
      if (
        normalized.playCount === 0 &&
        normalized.completedCount === 0 &&
        normalized.skipCount === 0 &&
        normalized.totalListenSec === 0
      ) {
        continue
      }
      out[trackId] = normalized
    }
    return out
  } catch {
    return {}
  }
}

export function writeStoredListeningStats(stats: ListeningStatsByTrackId): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_LISTENING_STATS, JSON.stringify(stats))
  } catch {
    /* ignore */
  }
}

export function clearStoredListeningStats(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_LISTENING_STATS)
  } catch {
    /* ignore */
  }
}
