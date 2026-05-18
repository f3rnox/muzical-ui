'use client'

import { useMemo } from 'react'
import computeMusicBrainzLibraryStats from '@/lib/library/compute-musicbrainz-library-stats'
import formatTotalLibraryDuration from '@/lib/format-total-library-duration'
import type { Track } from '@/types/track'

type MusicBrainzLibraryStatisticsProps = {
  libraryTracks: readonly Track[]
  onRemoveAll: () => void
  disabled?: boolean
}

type StatCard = {
  label: string
  value: string
}

const STAT_CARD_CLASS =
  'rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40'

/**
 * Summary counts for MusicBrainz entries saved in the library catalog.
 */
export default function MusicBrainzLibraryStatistics(
  props: MusicBrainzLibraryStatisticsProps,
) {
  const stats = useMemo(
    () => computeMusicBrainzLibraryStats(props.libraryTracks),
    [props.libraryTracks],
  )

  const cards: StatCard[] = [
    { label: 'Saved tracks', value: stats.trackCount.toLocaleString() },
    { label: 'Artists', value: stats.artistCount.toLocaleString() },
    { label: 'Albums', value: stats.albumCount.toLocaleString() },
    {
      label: 'YouTube linked',
      value: stats.youtubeLinkedCount.toLocaleString(),
    },
    { label: 'Playtime', value: formatTotalLibraryDuration(stats.totalDurationSec) },
  ]

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">MusicBrainz</h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Tracks saved from MusicBrainz search. These stream via YouTube and persist across visits.
        </p>
      </div>
      <section
        aria-label="MusicBrainz library statistics"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
      >
        {cards.map((card) => (
          <div key={card.label} className={STAT_CARD_CLASS}>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              {card.label}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-100">
              {card.value}
            </p>
          </div>
        ))}
      </section>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={stats.trackCount === 0 || props.disabled}
          onClick={() => {
            if (stats.trackCount === 0) return
            const n = stats.trackCount.toLocaleString()
            const ok = window.confirm(
              `Remove all ${n} saved MusicBrainz track${stats.trackCount === 1 ? '' : 's'} from your library? This cannot be undone.`,
            )
            if (!ok) return
            props.onRemoveAll()
          }}
          className="rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-800 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/50 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950/40"
        >
          Remove all MusicBrainz tracks
        </button>
      </div>
    </div>
  )
}
