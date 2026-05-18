import type { MusicBrainzSearchHints } from "@/lib/musicbrainz/build-musicbrainz-lucene-queries";
import { pickPreferredRelease } from "@/lib/musicbrainz/pick-preferred-release";
import type { MusicBrainzRecording } from "@/lib/musicbrainz/types";
import type { Track } from "@/types/track";

/**
 * Map a MusicBrainz recording entity to an app track.
 */
export function musicBrainzRecordingToTrack(
  recording: MusicBrainzRecording,
  hints: MusicBrainzSearchHints = {},
  albumOverride?: string,
): Track {
  const artist =
    recording["artist-credit"]
      ?.map((credit) => credit.name?.trim() || credit.artist?.name?.trim())
      .filter(Boolean)
      .join(" & ") ?? "Unknown artist";

  const release = pickPreferredRelease(recording.releases, hints);
  const album =
    albumOverride?.trim() ||
    release?.["release-group"]?.title?.trim() ||
    release?.title?.trim() ||
    "Unknown album";

  const title = recording.title?.trim() || "Unknown title";
  const youtubeQuery = `${title} ${artist}`.trim();

  return {
    id: `musicbrainz:${recording.id}`,
    title,
    artist,
    album,
    durationSec:
      recording.length && Number.isFinite(recording.length)
        ? Math.round(recording.length / 1000)
        : 0,
    source: "musicbrainz",
    youtubeQuery,
  };
}
