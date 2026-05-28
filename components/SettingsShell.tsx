'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import SettingsNav from '@/components/SettingsNav'
import { SettingsSaveNotificationProvider } from '@/components/SettingsSaveNotification'
import ThemeToggle from '@/components/ThemeToggle'

type SettingsShellProps = {
  children: ReactNode
}

/**
 * Shared settings chrome: header, back link, and section navigation.
 */
export default function SettingsShell(props: SettingsShellProps) {
  return (
    <SettingsSaveNotificationProvider>
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-zinc-200 bg-white/90 px-6 py-4 backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-950/90">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              ← Player
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold tracking-tight">Settings</h1>
              <p className="truncate text-xs text-zinc-500">Configure Muzical on this device.</p>
            </div>
          </div>
          <ThemeToggle />
        </header>

        <div className="flex min-h-0 w-full flex-1 overflow-hidden">
          <aside className="hidden w-36 shrink-0 border-r border-zinc-200 px-3 py-6 dark:border-zinc-800/80 sm:block">
            <SettingsNav />
          </aside>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain">
            <div className="mb-4 px-4 pt-4 sm:hidden">
              <SettingsNav />
            </div>
            <div className="px-4 pb-6 pt-1 sm:px-6 sm:pb-8 sm:pt-6">{props.children}</div>
          </div>
        </div>
      </div>
    </SettingsSaveNotificationProvider>
  )
}
