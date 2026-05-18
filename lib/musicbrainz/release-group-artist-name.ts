import type { MusicBrainzReleaseGroup } from "@/lib/musicbrainz/types";

/**
 * Display artist for a release group.
 */
export function releaseGroupArtistName(group: MusicBrainzReleaseGroup): string {
  return (
    group["artist-credit"]
      ?.map((c) => c.name?.trim() || c.artist?.name?.trim())
      .filter(Boolean)
      .join(" & ") ?? "Unknown artist"
  );
}
