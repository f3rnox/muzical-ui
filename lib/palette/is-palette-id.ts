import { PALETTE_IDS, type PaletteId } from "@/lib/palette/palette-constants";

/**
 * True when a string is a supported color palette id.
 */
export default function isPaletteId(value: string): value is PaletteId {
  return (PALETTE_IDS as readonly string[]).includes(value);
}
