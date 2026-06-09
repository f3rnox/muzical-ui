'use client'

import { useCallback, useEffect, useState } from 'react'
import ThemePalettePicker from '@/components/ThemePalettePicker'
import { useLibrary } from '@/components/LibraryProvider'
import { useSettingsSaveNotification } from '@/components/SettingsSaveNotification'
import SettingsSwitchRow from '@/components/SettingsSwitchRow'
import {
  readDynamicAccentEnabled,
  writeDynamicAccentEnabled,
} from '@/lib/accent/dynamic-accent-storage'

/**
 * Display settings: list density and related UI preferences.
 */
export default function DisplaySettingsPanel() {
  const { compactLists, setCompactLists } = useLibrary()
  const { notifySettingsSaved } = useSettingsSaveNotification()
  const [dynamicAccentEnabled, setDynamicAccentEnabled] = useState(true)

  useEffect(() => {
    // Read on mount (player may have its own state; this keeps the UI in sync)
    setDynamicAccentEnabled(readDynamicAccentEnabled())
  }, [])

  const onCompactListsChange = useCallback(
    (next: boolean) => {
      setCompactLists(next)
      notifySettingsSaved('Display settings saved')
    },
    [notifySettingsSaved, setCompactLists],
  )

  const onDynamicAccentChange = useCallback(
    (next: boolean) => {
      setDynamicAccentEnabled(next)
      writeDynamicAccentEnabled(next)
      notifySettingsSaved('Display settings saved')
    },
    [notifySettingsSaved],
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

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <SettingsSwitchRow
          title="Dynamic accent from album art"
          description="Extract the main color from the current track's cover and apply it to accents, progress bar, play button glow, and active states."
          checked={dynamicAccentEnabled}
          onChange={onDynamicAccentChange}
          ariaLabel="Enable dynamic accent from cover art"
        />
      </section>
    </div>
  )
}
