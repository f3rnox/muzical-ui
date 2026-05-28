
async function searchSong(title: string, artist: string, apiKey: string) {
  const query = encodeURIComponent(`${title} ${artist}`)
  const response = await fetch(
    `https://api.genius.com/search?q=${query}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    },
  )

  if (!response.ok) {
    throw new Error('Failed to fetch from Genius API')
  }

  const data = await response.json()
  const song = data.response.hits[0]?.result
  return song
}

async function getLyrics(songPath: string) {
  const response = await fetch(`https://genius.com${songPath}`)
  const text = await response.text()
  
  // Extract all <div data-lyrics-container="true">...</div>
  const containerRegex = /<div data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/g
  let match
  const parts: string[] = []
  
  while ((match = containerRegex.exec(text)) !== null) {
    if (match[1]) {
      parts.push(match[1])
    }
  }
  
  if (parts.length === 0) {
    return 'Lyrics not found on the page.'
  }
  
  const lyrics = parts.join('\n')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]*>/g, '') // remove remaining tags
    .trim()
    
  return lyrics
}

export default async function fetchGeniusLyrics(
  title: string,
  artist: string,
  apiKey: string,
): Promise<string> {
  const song = await searchSong(title, artist, apiKey)
  if (!song) {
    return 'Lyrics not found.'
  }

  const lyrics = await getLyrics(song.path)
  return lyrics
}
