'use client'

import Link from 'next/link'
import { SETTINGS_SECTION_ITEMS } from '@/components/settings-nav-items'

/**
 * Settings landing page with links into each subsection.
 */
export default function SettingsOverview() {
  return (
    <div className="max-w-xl">
      <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
        Configure your library and how Muzical behaves on this device.
      </p>
      <ul
        className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40"
        role="list"
      >
        {SETTINGS_SECTION_ITEMS.map((item, index) => (
          <li
            key={item.href}
            className={index > 0 ? 'border-t border-zinc-200 dark:border-zinc-800' : undefined}
          >
            <Link
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.label}</span>
                <span className="mt-0.5 block truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {item.description}
                </span>
              </span>
              <span className="shrink-0 text-zinc-400 dark:text-zinc-500" aria-hidden>
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
