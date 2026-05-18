'use client'

import Link from 'next/link'
import { SETTINGS_SECTION_ITEMS } from '@/components/settings-nav-items'

/**
 * Settings landing page with links into each subsection.
 */
export default function SettingsOverview() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Overview</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Choose a section to configure your library or how Muzical looks.
        </p>
      </div>

      <ul className="flex flex-col gap-3" role="list">
        {SETTINGS_SECTION_ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="block rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-amber-500/40 hover:bg-amber-50/30 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:border-amber-500/30 dark:hover:bg-amber-500/5"
            >
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.label}</span>
              <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{item.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
