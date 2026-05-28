'use client'

import { useCallback, useEffect, useState } from 'react'
import SettingsSwitchRow from '@/components/SettingsSwitchRow'
import { useSettingsSaveNotification } from '@/components/SettingsSaveNotification'
import { useYoutubePreferences } from '@/components/YoutubePreferencesProvider'
import readStoredYoutubeApiKey from '@/lib/youtube/read-stored-youtube-api-key'
import clearYoutubeDataApiBlocked from '@/lib/youtube/clear-youtube-data-api-blocked'
import writeStoredYoutubeApiKey from '@/lib/youtube/write-stored-youtube-api-key'
import {
  PREFETCH_QUEUE_MAX_TRACKS_MAX,
  PREFETCH_QUEUE_MAX_TRACKS_MIN,
} from '@/lib/youtube/youtube-preference-storage-keys'

const FIELD_CLASS =
  'mt-2 block w-full max-w-[8rem] rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100'

/**
 * YouTube Data API key configuration for MusicBrainz playback.
 */
export default function YouTubeSettingsPanel() {
  const {
    preferences: youtubePreferences,
    setPrefetchQueueVideoIds,
    setPrefetchQueueMaxTracks,
  } = useYoutubePreferences()
  const { notifySettingsSaved } = useSettingsSaveNotification()
  const [apiKey, setApiKey] = useState('')

  useEffect(() => {
    setApiKey(readStoredYoutubeApiKey())
  }, [])

  const onSave = useCallback(() => {
    writeStoredYoutubeApiKey(apiKey)
    clearYoutubeDataApiBlocked()
    notifySettingsSaved('YouTube settings saved')
  }, [apiKey, notifySettingsSaved])

  const onPrefetchQueueVideoIdsChange = useCallback(
    (next: boolean) => {
      setPrefetchQueueVideoIds(next)
      notifySettingsSaved('YouTube settings saved')
    },
    [notifySettingsSaved, setPrefetchQueueVideoIds],
  )

  const onPrefetchQueueMaxTracksChange = useCallback(
    (next: number) => {
      setPrefetchQueueMaxTracks(next)
      notifySettingsSaved('YouTube settings saved')
    },
    [notifySettingsSaved, setPrefetchQueueMaxTracks],
  )

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">YouTube</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          MusicBrainz tracks stream via YouTube. An optional Data API key resolves videos reliably; without a key or if
          quota is exceeded, Muzical falls back to in-player search.
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">API key</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Create a key in the{' '}
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent-700 underline decoration-accent-500/40 underline-offset-2 hover:text-accent-600 dark:text-accent-400"
          >
            Google Cloud Console
          </a>{' '}
          with the YouTube Data API v3 enabled. The key is stored only in this browser.
        </p>
        <label className="mt-4 block">
          <span className="sr-only">YouTube Data API key</span>
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIza…"
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 font-mono text-sm text-zinc-900 outline-none ring-accent-500/30 placeholder:text-zinc-400 focus:border-accent-500/50 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onSave}
            className="rounded-full bg-accent-500 px-4 py-2 text-sm font-medium text-zinc-950 shadow-sm transition hover:bg-accent-400"
          >
            Save key
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Queue prefetch</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Resolve YouTube video ids in the background for upcoming queue tracks that need a stream.
        </p>
        <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <SettingsSwitchRow
            title="Prefetch video IDs for queue"
            description="When enabled, Muzical looks up YouTube videos for queue tracks missing a video id (uses your API key when set)."
            checked={youtubePreferences.prefetchQueueVideoIds}
            onChange={onPrefetchQueueVideoIdsChange}
            ariaLabel="Prefetch YouTube video IDs for queue"
          />
        </div>
        <label
          className={`mt-6 block border-t border-zinc-200 pt-6 dark:border-zinc-800 ${
            youtubePreferences.prefetchQueueVideoIds ? '' : 'opacity-50'
          }`}
        >
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Prefetch limit</span>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Maximum queue tracks to prefetch per queue change ({PREFETCH_QUEUE_MAX_TRACKS_MIN}–
            {PREFETCH_QUEUE_MAX_TRACKS_MAX}).
          </p>
          <input
            type="number"
            min={PREFETCH_QUEUE_MAX_TRACKS_MIN}
            max={PREFETCH_QUEUE_MAX_TRACKS_MAX}
            disabled={!youtubePreferences.prefetchQueueVideoIds}
            value={youtubePreferences.prefetchQueueMaxTracks}
            onChange={(e) => onPrefetchQueueMaxTracksChange(Number.parseInt(e.target.value, 10))}
            className={FIELD_CLASS}
            aria-label="Prefetch limit for queue tracks"
          />
        </label>
      </section>
    </div>
  )
}
