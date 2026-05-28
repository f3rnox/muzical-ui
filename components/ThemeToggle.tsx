'use client'

import { useSettingsSaveNotification } from '@/components/SettingsSaveNotification'
import { useTheme } from '@/components/ThemeProvider'

function IconSun(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={props.className}>
      <path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM2 13h2v-2H2v2zm18 0h2v-2h-2v2zM11 2v2h2V2h-2zm0 18v2h2v-2h-2zM4.22 19.78l1.42-1.42-1.42-1.42-1.42 1.42 1.42 1.42zm12.72-1.42 1.42 1.42 1.42-1.42-1.42-1.42-1.42 1.42zM19.78 4.22l-1.42 1.42 1.42 1.42 1.42-1.42-1.42-1.42zM7.05 5.64 5.64 4.22 4.22 5.64l1.42 1.42 1.41-1.42z" />
    </svg>
  )
}

function IconMoon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={props.className}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

/**
 * Cycles document color scheme between light and dark (persisted).
 */
export default function ThemeToggle() {
  const { scheme, toggleScheme } = useTheme()
  const { notifySettingsSaved } = useSettingsSaveNotification()
  const isDark = scheme === 'dark'

  return (
    <button
      type="button"
      onClick={() => {
        toggleScheme()
        notifySettingsSaved('Display settings saved')
      }}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:shadow-none dark:hover:border-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-50"
    >
      {isDark ? <IconSun className="h-[18px] w-[18px]" /> : <IconMoon className="h-[18px] w-[18px]" />}
    </button>
  )
}
