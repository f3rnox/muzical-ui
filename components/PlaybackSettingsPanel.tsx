'use client'

import { useLibrary } from '@/components/LibraryProvider'
import SettingsSwitchRow from '@/components/SettingsSwitchRow'

/**
 * Playback persistence and related options.
 */
export default function PlaybackSettingsPanel() {
  const { rememberLastQueue, setRememberLastQueue } = useLibrary()

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Playback</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Control how Muzical resumes listening between sessions on this device.
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
    </div>
  )
}
