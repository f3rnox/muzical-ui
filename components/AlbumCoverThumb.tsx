'use client'

import { useEffect, useState } from 'react'
import { useLibrary } from '@/components/LibraryProvider'
import type { Track } from '@/types/track'
import { getCoverBytesForTrack } from '@/lib/library/cover-bytes-cache'
import youtubeVideoThumbnailUrl from '@/lib/youtube/youtube-video-thumbnail-url'

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
  const [loaded, setLoaded] = useState(false)

  // Reset loaded state whenever the cover source changes (new track or new cover URL)
  useEffect(() => {
    setLoaded(false)
  }, [coverUrl])

  useEffect(() => {
    let cancelled = false
    let createdUrl: string | null = null

    const youtubeVideoId = track?.youtubeVideoId?.trim()
    if (!track?.library) {
      if (youtubeVideoId) {
        setCoverUrl(youtubeVideoThumbnailUrl(youtubeVideoId))
      } else {
        setCoverUrl(null)
      }
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
      setCoverUrl(u) // set immediately — the <img> will be in the DOM and the browser will decode it

      // Optional: warm a preloader (helps some browsers), but we drive the fade from the visible <img>'s onLoad
      const preloader = new Image()
      preloader.src = u
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
        'relative bg-linear-to-br from-accent-200/70 via-zinc-100 to-zinc-200 dark:from-accent-900/35 dark:via-zinc-800 dark:to-zinc-900',
        className,
      ].join(' ')}
      aria-hidden
    >
      {coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- blob URL from tags
        <img
          src={coverUrl}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          decoding="async"
          onLoad={() => setLoaded(true)}
        />
      )}

      {/* Letter placeholder is shown while the image is loading (or if no cover) to avoid blank flash/flicker */}
      <span
        className={`flex h-full w-full items-center justify-center text-lg font-semibold tracking-tight text-accent-900/25 dark:text-zinc-600/90 transition-opacity duration-200 ${loaded && coverUrl ? 'opacity-0' : 'opacity-100'}`}
      >
        {letter}
      </span>
    </div>
  )
}
