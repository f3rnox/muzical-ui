'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SETTINGS_NAV_ITEMS } from '@/components/settings-nav-items'

/**
 * Sidebar navigation between settings subviews.
 */
export default function SettingsNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Settings sections" className="flex flex-col gap-1">
      {SETTINGS_NAV_ITEMS.map((item) => {
        const active =
          item.href === '/settings'
            ? pathname === '/settings'
            : pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              active
                ? 'bg-accent-500/15 text-accent-900 dark:bg-accent-500/20 dark:text-accent-200'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-100'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
