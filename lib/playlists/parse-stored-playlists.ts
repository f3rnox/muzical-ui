import type { Playlist } from "@/types/playlist";
import normalizePlaylistName from "@/lib/playlists/normalize-playlist-name";

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((x) => typeof x === "string");
}

/**
 * Validates and normalizes a raw stored value into a list of playlists.
 */
export default function parseStoredPlaylists(raw: unknown): Playlist[] {
  if (!Array.isArray(raw)) return [];
  const out: Playlist[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const candidate = entry as Record<string, unknown>;
    const id = typeof candidate.id === "string" ? candidate.id : null;
    const name =
      typeof candidate.name === "string"
        ? normalizePlaylistName(candidate.name)
        : "";
    const trackIds = isStringArray(candidate.trackIds)
      ? candidate.trackIds
      : null;
    const createdAt =
      typeof candidate.createdAt === "number"
        ? candidate.createdAt
        : Date.now();
    const updatedAt =
      typeof candidate.updatedAt === "number" ? candidate.updatedAt : createdAt;
    if (!id || !name || !trackIds) continue;
    out.push({ id, name, trackIds: [...trackIds], createdAt, updatedAt });
  }
  return out;
}
