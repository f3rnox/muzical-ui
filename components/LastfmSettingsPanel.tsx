'use client'

import { useCallback, useEffect, useState } from 'react'
import SettingsSwitchRow from '@/components/SettingsSwitchRow'
import { useSettingsSaveNotification } from '@/components/SettingsSaveNotification'
import readStoredLastfmApiKey from '@/lib/lastfm/read-stored-lastfm-api-key'
import writeStoredLastfmApiKey from '@/lib/lastfm/write-stored-lastfm-api-key'
import readStoredLastfmSharedSecret from '@/lib/lastfm/read-stored-lastfm-shared-secret'
import writeStoredLastfmSharedSecret from '@/lib/lastfm/write-stored-lastfm-shared-secret'
import readStoredLastfmUsername from '@/lib/lastfm/read-stored-lastfm-username'
import readStoredLastfmSessionKey from '@/lib/lastfm/read-stored-lastfm-session-key'
import writeStoredLastfmSessionKey from '@/lib/lastfm/write-stored-lastfm-session-key'
import writeStoredLastfmUsername from '@/lib/lastfm/write-stored-lastfm-username'
import readStoredLastfmScrobblingEnabled, {
  subscribeLastfmScrobblingEnabled,
  writeStoredLastfmScrobblingEnabled,
} from '@/lib/lastfm/read-stored-lastfm-scrobbling-enabled'
import { getLastfmAuthToken, buildLastfmAuthUrl, getLastfmSession } from '@/lib/lastfm/lastfm-auth'

/**
 * Last.fm settings for related tracks + optional scrobbling.
 */
export default function LastfmSettingsPanel() {
  const { notifySettingsSaved } = useSettingsSaveNotification()

  const [apiKey, setApiKey] = useState('')
  const [sharedSecret, setSharedSecret] = useState('')
  const [scrobblingEnabled, setScrobblingEnabled] = useState(false)

  // Auth flow state
  const [connectedUsername, setConnectedUsername] = useState('')
  const [hasSession, setHasSession] = useState(false)
  const [authStep, setAuthStep] = useState<'idle' | 'waiting'>('idle')
  const [pendingToken, setPendingToken] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [authBusy, setAuthBusy] = useState(false)

  useEffect(() => {
    setApiKey(readStoredLastfmApiKey())
    setSharedSecret(readStoredLastfmSharedSecret())
    setScrobblingEnabled(readStoredLastfmScrobblingEnabled())
    const u = readStoredLastfmUsername()
    const sk = readStoredLastfmSessionKey()
    setConnectedUsername(u)
    setHasSession(Boolean(sk && u))

    const unsub = subscribeLastfmScrobblingEnabled((next) => setScrobblingEnabled(next))
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<{ enabled?: boolean }>).detail
      if (typeof detail?.enabled === 'boolean') setScrobblingEnabled(detail.enabled)
    }
    window.addEventListener('muzical:lastfm-scrobbling-changed', onCustom as EventListener)
    return () => {
      unsub()
      window.removeEventListener('muzical:lastfm-scrobbling-changed', onCustom as EventListener)
    }
  }, [])

  const onSaveCredentials = useCallback(() => {
    writeStoredLastfmApiKey(apiKey)
    writeStoredLastfmSharedSecret(sharedSecret)
    // If credentials change, old session may be invalid; leave it (user can reconnect)
    notifySettingsSaved('Last.fm settings saved')
  }, [apiKey, sharedSecret, notifySettingsSaved])

  const onScrobblingChange = useCallback((next: boolean) => {
    writeStoredLastfmScrobblingEnabled(next)
    setScrobblingEnabled(next)
    notifySettingsSaved(next ? 'Scrobbling enabled' : 'Scrobbling disabled')
  }, [notifySettingsSaved])

  const startConnect = useCallback(async () => {
    setAuthError(null)
    const key = apiKey.trim()
    const secret = sharedSecret.trim()
    if (!key || !secret) {
      setAuthError('Enter both API key and shared secret first, then save credentials.')
      return
    }
    setAuthBusy(true)
    const res = await getLastfmAuthToken(key, secret)
    setAuthBusy(false)
    if (!res.ok) {
      setAuthError(res.message)
      return
    }
    const authUrl = buildLastfmAuthUrl(key, res.token)
    try {
      window.open(authUrl, '_blank', 'noopener,noreferrer')
    } catch {
      // ignore popup blockers; user can copy if needed
    }
    setPendingToken(res.token)
    setAuthStep('waiting')
  }, [apiKey, sharedSecret])

  const completeConnect = useCallback(async () => {
    setAuthError(null)
    const key = apiKey.trim()
    const secret = sharedSecret.trim()
    const token = pendingToken
    if (!key || !secret || !token) {
      setAuthError('Missing credentials or token.')
      return
    }
    setAuthBusy(true)
    const res = await getLastfmSession(key, secret, token)
    setAuthBusy(false)
    if (!res.ok) {
      setAuthError(res.message)
      return
    }
    writeStoredLastfmSessionKey(res.sessionKey)
    writeStoredLastfmUsername(res.username)
    setConnectedUsername(res.username)
    setHasSession(true)
    setAuthStep('idle')
    setPendingToken('')
    notifySettingsSaved(`Connected to Last.fm as ${res.username}`)
  }, [apiKey, sharedSecret, pendingToken, notifySettingsSaved])

  const cancelAuth = useCallback(() => {
    setAuthStep('idle')
    setPendingToken('')
    setAuthError(null)
  }, [])

  const disconnect = useCallback(() => {
    writeStoredLastfmSessionKey('')
    writeStoredLastfmUsername('')
    setConnectedUsername('')
    setHasSession(false)
    setAuthStep('idle')
    setPendingToken('')
    setAuthError(null)
    notifySettingsSaved('Disconnected from Last.fm')
  }, [notifySettingsSaved])

  const canScrobble = Boolean(apiKey.trim() && sharedSecret.trim() && hasSession)

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Last.fm</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Related songs use Last.fm listening data. Scrobbling (optional) records your plays.
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">API credentials</h3>
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
          . The API key is used for related tracks. The shared secret is required for scrobbling.
        </p>

        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">API key</span>
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 font-mono text-sm text-zinc-900 outline-none ring-accent-500/30 placeholder:text-zinc-400 focus:border-accent-500/50 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Shared secret</span>
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={sharedSecret}
              onChange={(e) => setSharedSecret(e.target.value)}
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 font-mono text-sm text-zinc-900 outline-none ring-accent-500/30 placeholder:text-zinc-400 focus:border-accent-500/50 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onSaveCredentials}
            className="rounded-full bg-accent-500 px-4 py-2 text-sm font-medium text-zinc-950 shadow-sm transition hover:bg-accent-400"
          >
            Save credentials
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <SettingsSwitchRow
          title="Scrobble plays"
          description="Send now-playing updates and scrobbles (play history) to Last.fm when you listen to tracks. Requires a connected account and valid credentials."
          checked={scrobblingEnabled}
          onChange={onScrobblingChange}
          ariaLabel="Enable Last.fm scrobbling"
        />
        {!canScrobble && scrobblingEnabled && (
          <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
            Scrobbling is enabled but you are not fully connected. Add credentials and connect an account below.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Account</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Connect a Last.fm account to enable scrobbling. This uses the standard desktop authorization flow.
        </p>

        <div className="mt-4">
          {hasSession && connectedUsername ? (
            <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-950">
              <div>
                <div className="text-sm text-zinc-900 dark:text-zinc-100">Connected as <span className="font-medium">{connectedUsername}</span></div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400">Scrobbles will be submitted for this account.</div>
              </div>
              <button
                type="button"
                onClick={disconnect}
                className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Not connected.</div>
          )}
        </div>

        {authStep === 'idle' && !hasSession && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={startConnect}
              disabled={authBusy}
              className="rounded-full bg-accent-500 px-4 py-2 text-sm font-medium text-zinc-950 shadow-sm transition hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {authBusy ? 'Starting…' : 'Connect Last.fm account'}
            </button>
            <span className="text-xs text-zinc-500">A browser window will open for authorization.</span>
          </div>
        )}

        {authStep === 'waiting' && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
            <div className="text-sm font-medium text-amber-900 dark:text-amber-200">Waiting for authorization</div>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
              If the window did not open or you closed it, visit Last.fm and approve the app, then click the button below.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={completeConnect}
                disabled={authBusy}
                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {authBusy ? 'Connecting…' : "I've authorized on Last.fm"}
              </button>
              <button
                type="button"
                onClick={cancelAuth}
                className="rounded-full border border-amber-300 px-3 py-1.5 text-sm text-amber-800 transition hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-900/30"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {authError && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{authError}</p>
        )}
      </section>
    </div>
  )
}

