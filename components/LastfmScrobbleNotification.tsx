'use client'

type LastfmScrobbleNotificationProps = {
  visible: boolean
  artist?: string
  title?: string
  onDismiss: () => void
}

/**
 * Transient toast confirming that a track was scrobbled to Last.fm.
 */
export default function LastfmScrobbleNotification(props: LastfmScrobbleNotificationProps) {
  const { visible, artist, title, onDismiss } = props
  if (!visible) return null

  const display = [artist, title].filter(Boolean).join(' — ')

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-auto fixed bottom-4 right-4 z-50 w-[min(100vw-2rem,22rem)] rounded-xl border border-emerald-200/90 bg-white/95 p-4 pr-10 shadow-lg shadow-zinc-900/10 backdrop-blur-sm dark:border-emerald-800/80 dark:bg-zinc-900/95 dark:shadow-black/40"
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
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            aria-hidden
          >
            <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Scrobbled to Last.fm</p>
          {display ? (
            <p className="mt-0.5 truncate text-xs text-zinc-600 dark:text-zinc-400">{display}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
