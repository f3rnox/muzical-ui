'use client'

type FavoriteStarButtonProps = {
  filled: boolean
  onPress: () => void
  label: string
  /** Merged after base styles; omit for default circular hit target. */
  className?: string
}

/**
 * Toggle control for favoriting artists, albums, or tracks.
 */
export default function FavoriteStarButton(props: FavoriteStarButtonProps) {
  const { filled, onPress, label, className } = props
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()
        onPress()
      }}
      aria-label={label}
      aria-pressed={filled}
      className={[
        'inline-flex h-7 w-7 shrink-0 items-center justify-center self-center leading-none text-amber-600 transition hover:bg-amber-500/15 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-500/10 dark:hover:text-amber-300',
        className ?? 'rounded-full',
      ].join(' ')}
    >
      <svg viewBox="0 0 24 24" className="block h-4 w-4 shrink-0" fill={filled ? 'currentColor' : 'none'} aria-hidden>
        <path
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
          d="M12 3.5l2.35 4.76 5.26.77-3.8 3.7.9 5.24L12 15.9 6.29 18l.9-5.24-3.8-3.7 5.26-.77L12 3.5z"
        />
      </svg>
    </button>
  )
}
