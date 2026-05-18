import { fetchMusicBrainzJson } from "@/lib/musicbrainz/fetch-musicbrainz-json";
import { musicBrainzRecordingToTrack } from "@/lib/musicbrainz/musicbrainz-recording-to-track";
import type { MusicBrainzSearchHints } from "@/lib/musicbrainz/build-musicbrainz-lucene-queries";
import type { MusicBrainzRecording } from "@/lib/musicbrainz/types";
import type { Track } from "@/types/track";

/**
 * Search MusicBrainz recordings with a Lucene query.
 */
export async function searchMusicBrainzRecordingsQuery(
  luceneQuery: string,
  hints: MusicBrainzSearchHints,
  signal?: AbortSignal,
  limit = 25,
  offset = 0,
): Promise<Track[]> {
  const trimmed = luceneQuery.trim();
  if (!trimmed) return [];

  const url = new URL("https://musicbrainz.org/ws/2/recording");
  url.searchParams.set("query", trimmed);
  url.searchParams.set("fmt", "json");
  url.searchParams.set("limit", String(limit));
  if (offset > 0) url.searchParams.set("offset", String(offset));
  url.searchParams.set("inc", "artist-credits+releases");

  const body = await fetchMusicBrainzJson<{
    recordings?: MusicBrainzRecording[];
  }>(url, signal);
  const recordings = Array.isArray(body.recordings) ? body.recordings : [];

  return recordings.map((recording) =>
    musicBrainzRecordingToTrack(recording, hints),
  );
}
