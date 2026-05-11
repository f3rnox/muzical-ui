import { parseBlob } from 'music-metadata'

/**
 * Parses embedded artwork from an audio file and returns an object URL for the best
 * candidate image. The caller must `URL.revokeObjectURL` when the URL is no longer needed.
 */
export async function extractCoverObjectUrlFromAudioFile(
  file: File,
): Promise<string | null> {
  try {
    const meta = await parseBlob(file, { duration: false })
    const pictures = meta.common.picture
    if (!pictures?.length) return null

    const front = pictures.find((p) => {
      const t = p.type?.toLowerCase() ?? ''
      return t.includes('front') || t.includes('cover')
    })
    const chosen = front ?? pictures.reduce((a, b) =>
      b.data.length > a.data.length ? b : a,
    )

    const mime =
      chosen.format?.trim() ||
      (chosen.name?.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg')
    const blob = new Blob([new Uint8Array(chosen.data)], { type: mime })
    return URL.createObjectURL(blob)
  } catch {
    return null
  }
}
