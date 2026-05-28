'use client'

import { useCallback } from 'react'
import ThemePalettePicker from '@/components/ThemePalettePicker'
import { useLibrary } from '@/components/LibraryProvider'
import { useSettingsSaveNotification } from '@/components/SettingsSaveNotification'
import SettingsSwitchRow from '@/components/SettingsSwitchRow'

/**
 * Display settings: list density and related UI preferences.
 */
export default function DisplaySettingsPanel() {
  const { compactLists, setCompactLists } = useLibrary()
  const { notifySettingsSaved } = useSettingsSaveNotification()

  const onCompactListsChange = useCallback(
    (next: boolean) => {
      setCompactLists(next)
      notifySettingsSaved('Display settings saved')
    },
    [notifySettingsSaved, setCompactLists],
  )

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Display</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Adjust how lists and panels look in the player.</p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <ThemePalettePicker />
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <SettingsSwitchRow
          title="Compact UI"
          description="Tighter spacing in the player, queue, and library browser."
          checked={compactLists}
          onChange={onCompactListsChange}
          ariaLabel="Enable compact UI"
        />
      </section>
    </div>
  )
}
