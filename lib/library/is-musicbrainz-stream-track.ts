import type { Track } from "@/types/track";

/**
 * True when a track is streamed from MusicBrainz/YouTube (not a local file).
 */
export default function isMusicBrainzStreamTrack(track: Track): boolean {
  if (track.library) return false;
  if (track.source === "musicbrainz" || track.source === "youtube") return true;
  if (track.id.startsWith("musicbrainz:")) return true;
  return Boolean(track.youtubeQuery?.trim());
}
