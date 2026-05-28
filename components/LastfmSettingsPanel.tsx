'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSettingsSaveNotification } from '@/components/SettingsSaveNotification'
import readStoredLastfmApiKey from '@/lib/lastfm/read-stored-lastfm-api-key'
import writeStoredLastfmApiKey from '@/lib/lastfm/write-stored-lastfm-api-key'

/**
 * Last.fm API key for related-song discovery (`track.getSimilar`).
 */
export default function LastfmSettingsPanel() {
  const { notifySettingsSaved } = useSettingsSaveNotification()
  const [apiKey, setApiKey] = useState('')

  useEffect(() => {
    setApiKey(readStoredLastfmApiKey())
  }, [])

  const onSave = useCallback(() => {
    writeStoredLastfmApiKey(apiKey)
    notifySettingsSaved('Last.fm settings saved')
  }, [apiKey, notifySettingsSaved])

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Last.fm</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Related songs use Last.fm listening data. An API key is required; it is stored only in this browser.
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">API key</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Create an API account at{' '}
          <a
            href="https://www.last.fm/api/account/create"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent-700 underline decoration-accent-500/40 underline-offset-2 hover:text-accent-600 dark:text-accent-400"
          >
            last.fm/api
          </a>
          . Use the API key (not the shared secret) for read-only methods like{' '}
          <code className="text-xs">track.getSimilar</code>.
        </p>
        <label className="mt-4 block">
          <span className="sr-only">Last.fm API key</span>
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
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
    </div>
  )
}
