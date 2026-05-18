import { fetchMusicBrainzJson } from "@/lib/musicbrainz/fetch-musicbrainz-json";
import { musicBrainzRecordingToTrack } from "@/lib/musicbrainz/musicbrainz-recording-to-track";
import type { MusicBrainzReleaseDetail } from "@/lib/musicbrainz/types";
import type { Track } from "@/types/track";

/**
 * Load all recordings on a MusicBrainz release as app tracks.
 */
export async function fetchReleaseTracks(
  releaseId: string,
  albumTitle: string,
  artistName: string,
  signal?: AbortSignal,
): Promise<Track[]> {
  const url = new URL(`https://musicbrainz.org/ws/2/release/${releaseId}`);
  url.searchParams.set("inc", "recordings+artist-credits+media");
  url.searchParams.set("fmt", "json");

  const body = await fetchMusicBrainzJson<MusicBrainzReleaseDetail>(
    url,
    signal,
  );
  const hints = { artist: artistName, album: albumTitle };
  const out: Track[] = [];
  const seen = new Set<string>();

  for (const medium of body.media ?? []) {
    for (const track of medium.tracks ?? []) {
      const recording = track.recording;
      const recordingId = recording?.id;
      if (!recordingId || seen.has(recordingId)) continue;
      seen.add(recordingId);

      const merged = recording ?? {
        id: track.id,
        title: track.title,
        length: track.length,
        "artist-credit": body["artist-credit"],
      };

      const row = musicBrainzRecordingToTrack(merged, hints, albumTitle);
      if (!row.title || row.title === "Unknown title") {
        row.title = track.title?.trim() || row.title;
      }
      if (track.length && Number.isFinite(track.length)) {
        row.durationSec = Math.round(track.length / 1000);
      }
      out.push(row);
    }
  }

  return out;
}
