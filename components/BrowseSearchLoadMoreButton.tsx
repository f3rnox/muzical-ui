type BrowseSearchLoadMoreButtonProps = {
  loading: boolean
  hasMore: boolean
  onLoadMore: () => void
}

/**
 * Load-more control for MusicBrainz and YouTube browse search results.
 */
export default function BrowseSearchLoadMoreButton(props: BrowseSearchLoadMoreButtonProps) {
  if (!props.hasMore) return null

  return (
    <div className="flex justify-center px-2 pt-3 pb-1">
      <button
        type="button"
        onClick={props.onLoadMore}
        disabled={props.loading}
        className="cursor-pointer rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {props.loading ? 'Loading…' : 'Load more'}
      </button>
    </div>
  )
}
