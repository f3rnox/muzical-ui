import Link from 'next/link'
import buildBrowseViewSearchUrl from '@/lib/browse/build-browse-view-search-url'
import browseSearchSourceLabel from '@/lib/browse/browse-search-source-label'
import type { RecentBrowseSearch } from '@/types/browse-search'

type RecentBrowseSearchChipProps = {
  entry: RecentBrowseSearch
}

/**
 * Home suggestion chip that opens a saved MusicBrainz or YouTube search.
 */
export default function RecentBrowseSearchChip(props: RecentBrowseSearchChipProps) {
  const sourceLabel = browseSearchSourceLabel(props.entry.source)
  return (
    <Link
      href={buildBrowseViewSearchUrl(props.entry)}
      scroll={false}
      className="inline-flex max-w-full min-w-0 items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-left text-xs shadow-sm transition hover:border-accent-400/50 hover:bg-accent-50/50 dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:border-accent-500/30 dark:hover:bg-accent-950/20"
    >
      <span className="shrink-0 font-medium uppercase tracking-wider text-zinc-500">{sourceLabel}</span>
      <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">{props.entry.query}</span>
    </Link>
  )
}
