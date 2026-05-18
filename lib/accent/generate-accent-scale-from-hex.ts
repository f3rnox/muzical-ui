import {
  ACCENT_SHADES,
  type AccentPalette,
  type AccentShade,
} from "@/lib/accent/accent-shades";
import parseHexColor from "@/lib/accent/parse-hex-color";

type Rgb = { r: number; g: number; b: number };

function hexColorToRgb(hex: string): Rgb | null {
  const parsed = parseHexColor(hex);
  if (!parsed) return null;
  const raw = parsed.slice(1);
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b))
    return null;
  return { r, g, b };
}

function rgbToHexColor(rgb: Rgb): string {
  const channel = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, "0");
  return `#${channel(rgb.r)}${channel(rgb.g)}${channel(rgb.b)}`;
}

const WHITE = { r: 255, g: 255, b: 255 };
const BLACK = { r: 0, g: 0, b: 0 };

const LIGHT_MIX: Partial<Record<AccentShade, number>> = {
  "50": 0.92,
  "200": 0.76,
  "300": 0.56,
  "400": 0.3,
};

const DARK_MIX: Partial<Record<AccentShade, number>> = {
  "600": 0.14,
  "700": 0.28,
  "800": 0.42,
  "900": 0.56,
  "950": 0.7,
};

function mixToward(
  base: { r: number; g: number; b: number },
  target: { r: number; g: number; b: number },
  weight: number,
): { r: number; g: number; b: number } {
  const w = Math.max(0, Math.min(1, weight));
  const baseWeight = 1 - w;
  return {
    r: base.r * baseWeight + target.r * w,
    g: base.g * baseWeight + target.g * w,
    b: base.b * baseWeight + target.b * w,
  };
}

/**
 * Build accent CSS variable values from a single base hex (500 shade).
 */
export default function generateAccentScaleFromHex(
  hex: string,
): AccentPalette | null {
  const baseRgb = hexColorToRgb(hex);
  if (!baseRgb) return null;

  const palette = {} as AccentPalette;
  for (const shade of ACCENT_SHADES) {
    if (shade === "500") {
      palette[shade] = rgbToHexColor(baseRgb);
      continue;
    }
    const light = LIGHT_MIX[shade];
    if (light !== undefined) {
      palette[shade] = rgbToHexColor(mixToward(baseRgb, WHITE, light));
      continue;
    }
    const dark = DARK_MIX[shade];
    if (dark !== undefined) {
      palette[shade] = rgbToHexColor(mixToward(baseRgb, BLACK, dark));
      continue;
    }
    palette[shade] = rgbToHexColor(baseRgb);
  }

  return palette;
}
