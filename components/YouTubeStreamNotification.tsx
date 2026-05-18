'use client'

type YouTubeStreamNotificationProps = {
  visible: boolean
  trackTitle?: string
}

/**
 * Toast shown while a MusicBrainz track’s YouTube stream is being resolved.
 */
export default function YouTubeStreamNotification(props: YouTubeStreamNotificationProps) {
  if (!props.visible) return null

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="pointer-events-none fixed bottom-24 right-4 z-50 w-[min(100vw-2rem,22rem)] rounded-xl border border-zinc-200/90 bg-white/95 p-4 shadow-lg shadow-zinc-900/10 backdrop-blur-sm dark:border-zinc-700/80 dark:bg-zinc-900/95 dark:shadow-black/40"
    >
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Resolving stream…</p>
      {props.trackTitle ? (
        <p className="mt-1 truncate text-xs text-zinc-600 dark:text-zinc-400">{props.trackTitle}</p>
      ) : null}
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-accent-500 dark:bg-accent-400" />
      </div>
    </div>
  )
}
