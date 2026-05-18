import type { TrackRowOverflowMenuItem } from "@/components/TrackRowOverflowMenu";
import type { Track } from "@/types/track";

type BuildTrackOverflowMenuItemsOptions = {
  track: Track;
  onViewDetails: (track: Track) => void;
  onViewRelatedSongs?: (track: Track) => void;
  onSave?: () => void;
  alreadySaved?: boolean;
  onRemoveFromLibrary?: () => void;
  onAddToPlaylist?: (track: Track) => void;
};

/**
 * Standard overflow menu items for song rows (details, library save/remove).
 */
export default function buildTrackOverflowMenuItems(
  options: BuildTrackOverflowMenuItemsOptions,
): TrackRowOverflowMenuItem[] {
  const items: TrackRowOverflowMenuItem[] = [
    {
      id: "details",
      label: "View details",
      onSelect: () => options.onViewDetails(options.track),
    },
  ];

  if (options.onViewRelatedSongs) {
    items.push({
      id: "related",
      label: "Related songs",
      onSelect: () => options.onViewRelatedSongs!(options.track),
    });
  }

  if (options.onAddToPlaylist) {
    items.push({
      id: "add-to-playlist",
      label: "Add to playlist…",
      onSelect: () => options.onAddToPlaylist!(options.track),
    });
  }

  if (options.onRemoveFromLibrary) {
    items.push({
      id: "remove",
      label: "Remove from library",
      onSelect: options.onRemoveFromLibrary,
    });
  } else if (options.onSave) {
    items.push({
      id: "save",
      label: options.alreadySaved ? "In library" : "Add to library",
      disabled: options.alreadySaved,
      onSelect: options.onSave,
    });
  }

  return items;
}
