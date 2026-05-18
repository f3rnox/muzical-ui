import type { MusicBrainzReleaseGroup } from "@/lib/musicbrainz/types";

/**
 * Pick a representative release id from a release group search hit.
 */
export function pickReleaseGroupReleaseId(
  group: MusicBrainzReleaseGroup,
): string | null {
  const releases = group.releases ?? [];
  const official = releases.find((r) => r.status === "Official");
  return official?.id ?? releases[0]?.id ?? null;
}
