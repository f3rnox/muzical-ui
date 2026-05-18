import type { MusicBrainzSearchHints } from "@/lib/musicbrainz/build-musicbrainz-lucene-queries";
import type { MusicBrainzReleaseGroup } from "@/lib/musicbrainz/types";

/**
 * Sort release groups so album-hint matches appear first.
 */
export default function prioritizeMusicBrainzReleaseGroups(
  groups: readonly MusicBrainzReleaseGroup[],
  hints: MusicBrainzSearchHints,
): MusicBrainzReleaseGroup[] {
  const albumHint = hints.album?.trim().toLowerCase() ?? "";
  if (!albumHint) return [...groups];
  return [...groups].sort((a, b) => {
    const aTitle = a.title?.trim().toLowerCase() ?? "";
    const bTitle = b.title?.trim().toLowerCase() ?? "";
    const aScore =
      aTitle === albumHint ? 2 : aTitle.includes(albumHint) ? 1 : 0;
    const bScore =
      bTitle === albumHint ? 2 : bTitle.includes(albumHint) ? 1 : 0;
    return bScore - aScore;
  });
}
