import type { Track } from "@/types/track";

/**
 * True for tracks saved from MusicBrainz/YouTube that are not tied to a scanned file.
 */
export default function isPersistedLibraryTrack(track: Track): boolean {
  if (track.library) return false;
  if (track.source === "musicbrainz" || track.source === "youtube") return true;
  if (track.id.startsWith("musicbrainz:")) return true;
  return Boolean(track.youtubeQuery?.trim());
}
