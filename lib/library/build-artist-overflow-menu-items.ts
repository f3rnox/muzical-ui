import type { TrackRowOverflowMenuItem } from "@/components/TrackRowOverflowMenu";

type BuildArtistOverflowMenuItemsOptions = {
  artistName: string;
  onRemoveArtistFromLibrary: (artistName: string) => void;
  onEditArtistMetadata?: (artistName: string) => void;
  onAddArtistToPlaylist?: (artistName: string) => void;
};

/**
 * Overflow menu items for an artist row in the library browser.
 */
export default function buildArtistOverflowMenuItems(
  options: BuildArtistOverflowMenuItemsOptions,
): TrackRowOverflowMenuItem[] {
  const items: TrackRowOverflowMenuItem[] = [];
  if (options.onEditArtistMetadata) {
    items.push({
      id: "edit-metadata",
      label: "Edit artist metadata",
      onSelect: () => options.onEditArtistMetadata!(options.artistName),
    });
  }
  if (options.onAddArtistToPlaylist) {
    items.push({
      id: "add-to-playlist",
      label: "Add artist to playlist…",
      onSelect: () => options.onAddArtistToPlaylist!(options.artistName),
    });
  }
  items.push({
    id: "remove",
    label: "Remove artist from library",
    onSelect: () => options.onRemoveArtistFromLibrary(options.artistName),
  });
  return items;
}
