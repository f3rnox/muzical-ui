'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import defaultYoutubePreferences from '@/lib/youtube/default-youtube-preferences'
import readStoredYoutubePreferences from '@/lib/youtube/read-stored-youtube-preferences'
import writeStoredYoutubePreferences from '@/lib/youtube/write-stored-youtube-preferences'
import { PREFETCH_QUEUE_MAX_TRACKS_MAX, PREFETCH_QUEUE_MAX_TRACKS_MIN } from '@/lib/youtube/youtube-preference-storage-keys'
import type { YoutubePreferences } from '@/types/youtube-preferences'

type YoutubePreferencesContextValue = {
  preferences: YoutubePreferences
  setPrefetchQueueVideoIds: (on: boolean) => void
  setPrefetchQueueMaxTracks: (max: number) => void
  patchPreferences: (partial: Partial<YoutubePreferences>) => void
}

const YoutubePreferencesContext = createContext<YoutubePreferencesContextValue | null>(null)

/**
 * Persists and shares YouTube options between settings and the library queue.
 */
export function YoutubePreferencesProvider(props: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<YoutubePreferences>(defaultYoutubePreferences)

  useEffect(() => {
    queueMicrotask(() => {
      setPreferences(readStoredYoutubePreferences())
    })
  }, [])

  const patchPreferences = useCallback((partial: Partial<YoutubePreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...partial }
      writeStoredYoutubePreferences(next)
      return next
    })
  }, [])

  const setPrefetchQueueVideoIds = useCallback(
    (on: boolean) => {
      patchPreferences({ prefetchQueueVideoIds: on })
    },
    [patchPreferences],
  )

  const setPrefetchQueueMaxTracks = useCallback(
    (max: number) => {
      const clamped = Math.min(
        PREFETCH_QUEUE_MAX_TRACKS_MAX,
        Math.max(PREFETCH_QUEUE_MAX_TRACKS_MIN, Math.floor(max) || 1),
      )
      patchPreferences({ prefetchQueueMaxTracks: clamped })
    },
    [patchPreferences],
  )

  const value = useMemo(
    () => ({
      preferences,
      setPrefetchQueueVideoIds,
      setPrefetchQueueMaxTracks,
      patchPreferences,
    }),
    [preferences, setPrefetchQueueVideoIds, setPrefetchQueueMaxTracks, patchPreferences],
  )

  return (
    <YoutubePreferencesContext.Provider value={value}>{props.children}</YoutubePreferencesContext.Provider>
  )
}

/**
 * Access YouTube preferences from client components.
 */
export function useYoutubePreferences(): YoutubePreferencesContextValue {
  const ctx = useContext(YoutubePreferencesContext)
  if (!ctx) {
    throw new Error('useYoutubePreferences must be used within YoutubePreferencesProvider')
  }
  return ctx
}
