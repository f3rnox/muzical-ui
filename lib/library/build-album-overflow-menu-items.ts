import type { TrackRowOverflowMenuItem } from "@/components/TrackRowOverflowMenu";

type BuildAlbumOverflowMenuItemsOptions = {
  albumKey: string;
  onRemoveAlbumFromLibrary: (albumKey: string) => void;
};

/**
 * Overflow menu items for an album row in the library browser.
 */
export default function buildAlbumOverflowMenuItems(
  options: BuildAlbumOverflowMenuItemsOptions,
): TrackRowOverflowMenuItem[] {
  return [
    {
      id: "remove",
      label: "Remove album from library",
      onSelect: () => options.onRemoveAlbumFromLibrary(options.albumKey),
    },
  ];
}
