'use client'

import { useEffect, useState } from 'react'
import useGeniusApiKey from '@/lib/genius/use-genius-api-key'
import type { Track } from '@/types/track'
type LyricsPanelProps = {
  track: Track | undefined
  onClose: () => void
}

export default function LyricsPanel({ track, onClose }: LyricsPanelProps) {
  const [lyrics, setLyrics] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { storedApiKey } = useGeniusApiKey()

  useEffect(() => {
    if (!track || !storedApiKey) {
      setLyrics('')
      return
    }

    const fetchLyrics = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(
          `/api/genius/lyrics?title=${track.title}&artist=${track.artist}&apiKey=${storedApiKey}`,
        )
        const data = await response.json()
        if (response.ok) {
          setLyrics(data.lyrics)
        } else {
          setLyrics('Error fetching lyrics.')
        }
      } catch (error) {
        console.error('Error fetching lyrics:', error)
        setLyrics('Error fetching lyrics.')
      }
      setIsLoading(false)
    }

    fetchLyrics()
  }, [track, storedApiKey])

  return (
    <div className="flex h-full flex-col min-h-0 bg-white dark:bg-zinc-950/50">
      <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-zinc-200 bg-white/80 px-4 dark:border-zinc-800 dark:bg-zinc-950/80">
        <h2 className="text-xs font-medium uppercase leading-none tracking-wider text-zinc-500">
          Lyrics
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <IconX className="h-5 w-5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4 lg:p-6">
        {!storedApiKey ? (
          <p className="text-sm text-zinc-500">
            Please configure your Genius API key in the settings to view lyrics.
          </p>
        ) : !track ? (
          <p className="text-sm text-zinc-500">Play a track to see its lyrics.</p>
        ) : isLoading ? (
          <p className="text-sm text-zinc-500">Loading lyrics...</p>
        ) : (
          <p className="whitespace-pre-wrap text-[15px] leading-loose text-zinc-800 dark:text-zinc-200">
            {lyrics}
          </p>
        )}
      </div>
    </div>
  )
}

function IconX(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={props.className}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}
