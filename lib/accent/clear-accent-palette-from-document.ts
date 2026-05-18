import { ACCENT_SHADES } from "@/lib/accent/accent-shades";

/**
 * Remove inline `--accent-*` overrides so preset `data-accent` palettes apply.
 */
export default function clearAccentPaletteFromDocument(): void {
  const root = document.documentElement;
  for (const shade of ACCENT_SHADES) {
    root.style.removeProperty(`--accent-${shade}`);
  }
}
