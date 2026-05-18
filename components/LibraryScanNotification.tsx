'use client'

import type { LibraryScanProgress } from '@/types/library-scan-progress'

type LibraryScanNotificationProps = {
  progress: LibraryScanProgress | null
  onDismiss: () => void
}

/**
 * Fixed toast with a determinate progress bar while the library is scanned.
 */
export default function LibraryScanNotification(props: LibraryScanNotificationProps) {
  const { progress, onDismiss } = props
  if (!progress) return null

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={progress.percent < 100}
      className="pointer-events-auto fixed bottom-4 right-4 z-50 w-[min(100vw-2rem,22rem)] rounded-xl border border-zinc-200/90 bg-white/95 p-4 pr-10 shadow-lg shadow-zinc-900/10 backdrop-blur-sm dark:border-zinc-700/80 dark:bg-zinc-900/95 dark:shadow-black/40"
    >
      <button
        type="button"
        onClick={onDismiss}
        className="absolute right-2 top-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        aria-label="Dismiss notification"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
      </button>
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {progress.percent >= 100 ? 'Library scan complete' : 'Scanning library'}
      </p>
      <p className="mt-1 truncate text-xs text-zinc-600 dark:text-zinc-400">{progress.label}</p>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
        aria-label="Library scan progress"
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
      >
        <div
          className="h-full rounded-full bg-amber-500 transition-[width] duration-200 ease-out dark:bg-amber-400"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      <p className="mt-2 text-right text-[11px] tabular-nums text-zinc-500 dark:text-zinc-500">
        {progress.percent}%
        {progress.filesTotal > 0 ? (
          <span className="text-zinc-400">
            {' '}
            · {progress.filesDone}/{progress.filesTotal} files
          </span>
        ) : null}
      </p>
    </div>
  )
}
