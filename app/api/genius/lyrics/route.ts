
import { NextResponse } from 'next/server'
import fetchGeniusLyrics from '@/lib/genius/fetch-genius-lyrics'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title')
  const artist = searchParams.get('artist')
  const apiKey = searchParams.get('apiKey')

  if (!title || !artist || !apiKey) {
    return NextResponse.json(
      { error: 'Missing required query parameters' },
      { status: 400 },
    )
  }

  try {
    const lyrics = await fetchGeniusLyrics(title, artist, apiKey)
    return NextResponse.json({ lyrics })
  } catch (error) {
    console.error('Genius lyrics API route error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
