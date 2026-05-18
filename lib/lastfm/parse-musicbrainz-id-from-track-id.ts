/**
 * Extract a MusicBrainz recording UUID from an app track id (`musicbrainz:{uuid}`).
 */
export default function parseMusicbrainzIdFromTrackId(
  trackId: string,
): string | null {
  const prefix = "musicbrainz:";
  if (!trackId.startsWith(prefix)) return null;
  const mbid = trackId.slice(prefix.length).trim();
  return mbid.length > 0 ? mbid : null;
}
