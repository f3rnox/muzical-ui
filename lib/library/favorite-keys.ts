/**
 * Stable artist label for favorites and grouping (matches library browser).
 */
export function artistDisplayName(artist: string | undefined): string {
  const t = artist?.trim();
  return t ? t : "Unknown artist";
}

/**
 * Album + artist composite key (matches `groupByAlbum` in the library browser).
 */
export function albumCompositeKey(album: string, artist: string): string {
  return `${album}\u0000${artist}`;
}
