'use client'

import { useLibrary } from '@/components/LibraryProvider'
import { usePlaybackPreferences } from '@/components/PlaybackPreferencesProvider'
import SettingsSwitchRow from '@/components/SettingsSwitchRow'
import { PLAYBACK_RATES } from '@/lib/playback/playback-rates'
import type { RepeatMode } from '@/types/repeat-mode'

const REPEAT_OPTIONS: readonly { value: RepeatMode; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'all', label: 'Queue' },
  { value: 'one', label: 'One' },
]

const FIELD_CLASS =
  'mt-2 block w-full max-w-xs rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100'

/**
 * Playback persistence and default player behavior.
 */
export default function PlaybackSettingsPanel() {
  const { rememberLastQueue, setRememberLastQueue } = useLibrary()
  const {
    preferences,
    setRepeatMode,
    setShuffle,
    setPlaybackRate,
    setRememberVolume,
    setSeekStepSmallSec,
    setSeekStepLargeSec,
    setAutoAdvanceOnEnd,
  } = usePlaybackPreferences()

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Playback</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Defaults for the player and how Muzical resumes between sessions on this device.
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <SettingsSwitchRow
          title="Remember last track and queue"
          description="When enabled, your queue order, current track, and playhead position are restored the next time you open Muzical (tracks must still exist in the library)."
          checked={rememberLastQueue}
          onChange={setRememberLastQueue}
          ariaLabel="Remember last track and queue"
        />
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Defaults</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Applied when Muzical loads and when you use the player controls.
        </p>

        <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="block min-w-0 flex-1 sm:max-w-xs">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Default repeat mode</span>
            <select
              value={preferences.repeatMode}
              onChange={(e) => setRepeatMode(e.target.value as RepeatMode)}
              className={FIELD_CLASS}
              aria-label="Default repeat mode"
            >
              {REPEAT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block min-w-0 flex-1 sm:max-w-xs">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Default playback speed</span>
            <select
              value={preferences.playbackRate}
              onChange={(e) => setPlaybackRate(Number(e.target.value))}
              className={FIELD_CLASS}
              aria-label="Default playback speed"
            >
              {PLAYBACK_RATES.map((r) => (
                <option key={r} value={r}>
                  {r === 1 ? '1×' : `${r}×`}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <SettingsSwitchRow
            title="Default shuffle"
            description="Start with shuffle enabled when you open Muzical."
            checked={preferences.shuffle}
            onChange={setShuffle}
            ariaLabel="Default shuffle"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Volume</h3>
        <SettingsSwitchRow
          title="Remember volume"
          description="Restore the last volume level you used on this device."
          checked={preferences.rememberVolume}
          onChange={setRememberVolume}
          ariaLabel="Remember volume"
        />
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Seek bar keyboard</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Step sizes when the seek bar is focused (arrow keys and Page Up / Page Down).
        </p>
        <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:flex-wrap">
          <label className="block min-w-0">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Small step (seconds)</span>
            <input
              type="number"
              min={1}
              max={120}
              value={preferences.seekStepSmallSec}
              onChange={(e) => setSeekStepSmallSec(Number.parseInt(e.target.value, 10) || 5)}
              className={FIELD_CLASS}
              aria-label="Seek small step in seconds"
            />
          </label>
          <label className="block min-w-0">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Large step (seconds)</span>
            <input
              type="number"
              min={1}
              max={600}
              value={preferences.seekStepLargeSec}
              onChange={(e) => setSeekStepLargeSec(Number.parseInt(e.target.value, 10) || 30)}
              className={FIELD_CLASS}
              aria-label="Seek large step in seconds"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <SettingsSwitchRow
          title="Auto-advance on track end"
          description="When enabled, playback continues to the next track (or wraps the queue when repeat all is on). When disabled, playback stops when the current track ends unless repeat one is active."
          checked={preferences.autoAdvanceOnEnd}
          onChange={setAutoAdvanceOnEnd}
          ariaLabel="Auto-advance on track end"
        />
      </section>
    </div>
  )
}