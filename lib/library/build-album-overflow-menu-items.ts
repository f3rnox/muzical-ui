import type { TrackRowOverflowMenuItem } from "@/components/TrackRowOverflowMenu";

type BuildAlbumOverflowMenuItemsOptions = {
  albumKey: string;
  onRemoveAlbumFromLibrary: (albumKey: string) => void;
  onEditAlbumMetadata?: (albumKey: string) => void;
};

/**
 * Overflow menu items for an album row in the library browser.
 */
export default function buildAlbumOverflowMenuItems(
  options: BuildAlbumOverflowMenuItemsOptions,
): TrackRowOverflowMenuItem[] {
  const items: TrackRowOverflowMenuItem[] = [];
  if (options.onEditAlbumMetadata) {
    items.push({
      id: "edit-metadata",
      label: "Edit album metadata",
      onSelect: () => options.onEditAlbumMetadata!(options.albumKey),
    });
  }
  items.push({
    id: "remove",
    label: "Remove album from library",
    onSelect: () => options.onRemoveAlbumFromLibrary(options.albumKey),
  });
  return items;
}
