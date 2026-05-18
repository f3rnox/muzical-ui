import { ACCENT_SHADES } from "@/lib/accent/accent-shades";
import type { AccentPalette } from "@/lib/accent/accent-shades";

/**
 * Set inline `--accent-*` variables on the document root.
 */
export default function applyAccentPaletteToDocument(
  palette: AccentPalette,
): void {
  const root = document.documentElement;
  for (const shade of ACCENT_SHADES) {
    root.style.setProperty(`--accent-${shade}`, palette[shade]);
  }
}
