import { fetchMusicBrainzJson } from "@/lib/musicbrainz/fetch-musicbrainz-json";
import type { MusicBrainzReleaseGroup } from "@/lib/musicbrainz/types";

/**
 * Search MusicBrainz release groups (albums, EPs, etc.).
 */
export async function searchMusicBrainzReleaseGroups(
  query: string,
  signal?: AbortSignal,
  limit = 8,
): Promise<MusicBrainzReleaseGroup[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = new URL("https://musicbrainz.org/ws/2/release-group");
  url.searchParams.set("query", trimmed);
  url.searchParams.set("fmt", "json");
  url.searchParams.set("limit", String(limit));

  const body = await fetchMusicBrainzJson<{
    "release-groups"?: MusicBrainzReleaseGroup[];
  }>(url, signal);
  return Array.isArray(body["release-groups"]) ? body["release-groups"] : [];
}
