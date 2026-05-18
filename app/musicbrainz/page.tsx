'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { searchMusicBrainzRecordings } from '@/lib/musicbrainz'
import { useLibrary } from '@/components/LibraryProvider'
import { formatDuration } from '@/lib/format-duration'
import type { Track } from '@/types/track'

export default function MusicBrainzPage() {
  const { libraryTracks, addToLibrary, addToQueue } = useLibrary()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Track[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const debounceRef = useRef<number | null>(null)

  useEffect(() => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }

    const q = query.trim()
    if (q.length < 3) {
      setResults([])
      setLoading(false)
      setError(null)
      return undefined
    }

    setLoading(true)
    setError(null)
    const controller = new AbortController()
    abortRef.current = controller

    debounceRef.current = window.setTimeout(() => {
      void searchMusicBrainzRecordings(q, controller.signal)
        .then((res) => {
          setResults(res)
          setError(null)
        })
        .catch((err) => {
          if (err?.name === 'AbortError') return
          setError(err instanceof Error ? err.message : 'MusicBrainz search failed')
          setResults([])
        })
        .finally(() => setLoading(false))
    }, 300)

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      if (abortRef.current) {
        abortRef.current.abort()
        abortRef.current = null
      }
    }
  }, [query])

  const onSave = (t: Track) => void addToLibrary(t)
  const onQueue = (t: Track) => void addToQueue(t)

  return (
    <section className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">MusicBrainz</h1>
        <Link href="/" className="text-sm text-zinc-500 hover:underline">Back</Link>
      </div>
      <div className="space-y-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search MusicBrainz for songs, artists, or releases…"
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-amber-400"
        />
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : loading ? (
          <p className="text-sm text-zinc-500">Searching MusicBrainz…</p>
        ) : query.trim().length > 0 && results.length === 0 ? (
          <p className="text-sm text-zinc-500">No MusicBrainz results for that query yet.</p>
        ) : null}

        <ul className="space-y-2">
          {results.map((r) => {
            const alreadySaved = libraryTracks.some((t) => t.id === r.id)
            return (
              <li key={r.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{r.title}</p>
                    <p className="mt-1 truncate text-xs text-zinc-500">{r.artist} · {r.album}</p>
                    <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-zinc-400">{r.durationSec > 0 ? formatDuration(r.durationSec) : 'Unknown duration'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button onClick={() => onQueue(r)} className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-800">Add queue</button>
                    <button onClick={() => onSave(r)} disabled={alreadySaved} className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 disabled:opacity-50">{alreadySaved ? 'Saved' : 'Save to library'}</button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
