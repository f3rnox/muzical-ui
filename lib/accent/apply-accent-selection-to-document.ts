import applyAccentPaletteToDocument from "@/lib/accent/apply-accent-palette-to-document";
import clearAccentPaletteFromDocument from "@/lib/accent/clear-accent-palette-from-document";
import { DEFAULT_ACCENT_ID } from "@/lib/accent/accent-constants";
import type { AccentSelection } from "@/lib/accent/accent-selection";
import generateAccentScaleFromHex from "@/lib/accent/generate-accent-scale-from-hex";
import readStoredCustomAccentPalette from "@/lib/accent/read-stored-custom-accent-palette";

/**
 * Apply a preset or custom accent selection to the document root.
 */
export default function applyAccentSelectionToDocument(
  selection: AccentSelection,
): void {
  const accentId = selection.accentId || DEFAULT_ACCENT_ID;
  document.documentElement.setAttribute("data-accent", accentId);

  if (accentId !== "custom") {
    clearAccentPaletteFromDocument();
    return;
  }

  const palette =
    readStoredCustomAccentPalette() ??
    generateAccentScaleFromHex(selection.customHex);
  if (!palette) {
    document.documentElement.setAttribute("data-accent", DEFAULT_ACCENT_ID);
    clearAccentPaletteFromDocument();
    return;
  }

  applyAccentPaletteToDocument(palette);
}
