/**
 * Centered spinner shown while the playback queue is restored on startup.
 */
export default function QueueLoadingSpinner() {
  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-3 px-4 py-12"
      role="status"
      aria-live="polite"
      aria-label="Loading queue"
    >
      <span
        className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-amber-500 dark:border-zinc-600 dark:border-t-amber-400"
        aria-hidden
      />
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading queue…</p>
    </div>
  )
}
