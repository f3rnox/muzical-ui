import {
  DEFAULT_PALETTE_ID,
  type PaletteId,
} from "@/lib/palette/palette-constants";

/**
 * Sets `data-palette` on the document root so CSS theme tokens apply.
 */
export default function applyPaletteToDocument(paletteId: PaletteId): void {
  document.documentElement.setAttribute(
    "data-palette",
    paletteId || DEFAULT_PALETTE_ID,
  );
}
