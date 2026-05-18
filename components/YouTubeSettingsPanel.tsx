'use client'

import { useCallback, useEffect, useState } from 'react'
import readStoredYoutubeApiKey from '@/lib/youtube/read-stored-youtube-api-key'
import clearYoutubeDataApiBlocked from '@/lib/youtube/clear-youtube-data-api-blocked'
import writeStoredYoutubeApiKey from '@/lib/youtube/write-stored-youtube-api-key'

/**
 * YouTube Data API key configuration for MusicBrainz playback.
 */
export default function YouTubeSettingsPanel() {
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setApiKey(readStoredYoutubeApiKey())
  }, [])

  const onSave = useCallback(() => {
    writeStoredYoutubeApiKey(apiKey)
    clearYoutubeDataApiBlocked()
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2000)
  }, [apiKey])

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
            className="font-medium text-amber-700 underline decoration-amber-500/40 underline-offset-2 hover:text-amber-600 dark:text-amber-400"
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
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 font-mono text-sm text-zinc-900 outline-none ring-amber-500/30 placeholder:text-zinc-400 focus:border-amber-500/50 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onSave}
            className="rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950 shadow-sm transition hover:bg-amber-400"
          >
            Save key
          </button>
          {saved ? (
            <span className="text-sm text-emerald-700 dark:text-emerald-400" role="status">
              Saved
            </span>
          ) : null}
        </div>
      </section>
    </div>
  )
}