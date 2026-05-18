'use client'

import { useMemo } from 'react'
import computeLibraryStats from '@/lib/library/compute-library-stats'
import formatTotalLibraryDuration from '@/lib/format-total-library-duration'
import type { LibraryRootMeta } from '@/types/library-root-meta'
import type { Track } from '@/types/track'

type LibraryStatisticsProps = {
  roots: readonly LibraryRootMeta[]
  libraryTracks: readonly Track[]
}

type StatCard = {
  label: string
  value: string
}

/**
 * Summary counts for the library settings page header area.
 */
export default function LibraryStatistics(props: LibraryStatisticsProps) {
  const stats = useMemo(
    () => computeLibraryStats(props.libraryTracks, props.roots.length),
    [props.libraryTracks, props.roots.length],
  )

  const cards: StatCard[] = [
    { label: 'Tracks', value: stats.trackCount.toLocaleString() },
    { label: 'Folders', value: stats.folderCount.toLocaleString() },
    { label: 'Artists', value: stats.artistCount.toLocaleString() },
    { label: 'Albums', value: stats.albumCount.toLocaleString() },
    { label: 'Playtime', value: formatTotalLibraryDuration(stats.totalDurationSec) },
  ]

  return (
    <section
      aria-label="Library statistics"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
    >
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{card.label}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-100">
            {card.value}
          </p>
        </div>
      ))}
    </section>
  )
}
