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
    <nav aria-label="Settings sections">
      <ul className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40 sm:border-0 sm:bg-transparent sm:dark:bg-transparent">
        {SETTINGS_NAV_ITEMS.map((item, index) => {
          const active =
            item.href === '/settings'
              ? pathname === '/settings'
              : pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <li
              key={item.href}
              className={index > 0 ? 'border-t border-zinc-200 dark:border-zinc-800 sm:border-t-0' : undefined}
            >
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`block px-2.5 py-1.5 text-xs font-medium transition sm:rounded-lg sm:px-2 sm:py-1.5 ${
                  active
                    ? 'bg-accent-500/15 text-accent-900 dark:bg-accent-500/20 dark:text-accent-200'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-100'
                }`}
              >
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
