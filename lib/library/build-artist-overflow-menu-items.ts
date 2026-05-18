import type { TrackRowOverflowMenuItem } from "@/components/TrackRowOverflowMenu";

type BuildArtistOverflowMenuItemsOptions = {
  artistName: string;
  onRemoveArtistFromLibrary: (artistName: string) => void;
};

/**
 * Overflow menu items for an artist row in the library browser.
 */
export default function buildArtistOverflowMenuItems(
  options: BuildArtistOverflowMenuItemsOptions,
): TrackRowOverflowMenuItem[] {
  return [
    {
      id: "remove",
      label: "Remove artist from library",
      onSelect: () => options.onRemoveArtistFromLibrary(options.artistName),
    },
  ];
}
