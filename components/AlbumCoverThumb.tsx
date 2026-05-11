'use client'

import { useEffect, useState } from 'react'
import { useLibrary } from '@/components/LibraryProvider'
import type { Track } from '@/types/track'
import { getCoverBytesForTrack } from '@/lib/library/cover-bytes-cache'

type AlbumCoverThumbProps = {
  /** Representative track (e.g. first on the album) — embedded art is read from its file */
  track: Track | undefined
  className?: string
}

/**
 * Loads embedded cover art for a library track and shows a square thumbnail or letter fallback.
 */
export default function AlbumCoverThumb(props: AlbumCoverThumbProps) {
  const { track, className = 'h-12 w-12 shrink-0 overflow-hidden rounded-md ring-1 ring-zinc-200/80 dark:ring-zinc-700/80' } =
    props
  const { resolveFileForTrack } = useLibrary()
  const [coverUrl, setCoverUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let createdUrl: string | null = null

    if (!track?.library) {
      void Promise.resolve().then(() => {
        if (!cancelled) setCoverUrl(null)
      })
      return (): void => {
        cancelled = true
      }
    }

    const t = track

    void (async (): Promise<void> => {
      const file = await resolveFileForTrack(t)
      if (cancelled || !file) return
      const bytes = await getCoverBytesForTrack(t.id, file)
      if (cancelled) return
      if (!bytes) {
        setCoverUrl(null)
        return
      }
      const u = URL.createObjectURL(new Blob([bytes.data], { type: bytes.mime }))
      if (cancelled) {
        if (u) URL.revokeObjectURL(u)
        return
      }
      createdUrl = u
      setCoverUrl(u)
    })()

    return (): void => {
      cancelled = true
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [track, resolveFileForTrack])

  const letter = track?.album?.trim().charAt(0) || '♪'

  return (
    <div
      className={[
        'relative bg-gradient-to-br from-amber-200/70 via-zinc-100 to-zinc-200 dark:from-amber-900/35 dark:via-zinc-800 dark:to-zinc-900',
        className,
      ].join(' ')}
      aria-hidden
    >
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- blob URL from tags
        <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" decoding="async" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-lg font-semibold tracking-tight text-amber-900/25 dark:text-zinc-600/90">
          {letter}
        </span>
      )}
    </div>
  )
}
