/** localStorage key for the active color palette */
export const PALETTE_STORAGE_KEY = "muzical.palette" as const;

/** @deprecated migrated to {@link PALETTE_STORAGE_KEY} */
export const LEGACY_ACCENT_STORAGE_KEY = "muzical.accent" as const;

export const PALETTE_IDS = [
  "warm",
  "sunset",
  "bloom",
  "crimson",
  "aurora",
  "ocean",
  "lagoon",
  "forest",
  "midnight",
  "slate",
] as const;

export type PaletteId = (typeof PALETTE_IDS)[number];

export const DEFAULT_PALETTE_ID: PaletteId = "warm";

export type ColorPalette = {
  id: PaletteId;
  label: string;
  description: string;
  /** Accent 500 for swatch preview */
  accent: string;
  /** Light-mode page background */
  lightBackground: string;
  /** Dark-mode page background */
  darkBackground: string;
};

export const COLOR_PALETTES: readonly ColorPalette[] = [
  {
    id: "warm",
    label: "Warm",
    description: "Amber highlights on soft stone",
    accent: "#f59e0b",
    lightBackground: "#fafaf9",
    darkBackground: "#0c0a09",
  },
  {
    id: "sunset",
    label: "Sunset",
    description: "Orange glow on peach paper",
    accent: "#f97316",
    lightBackground: "#fffbf7",
    darkBackground: "#140a06",
  },
  {
    id: "bloom",
    label: "Bloom",
    description: "Rose accents on blush white",
    accent: "#f43f5e",
    lightBackground: "#fffafa",
    darkBackground: "#12080b",
  },
  {
    id: "crimson",
    label: "Crimson",
    description: "Red highlights on warm ivory",
    accent: "#ef4444",
    lightBackground: "#fefafa",
    darkBackground: "#140606",
  },
  {
    id: "aurora",
    label: "Aurora",
    description: "Violet accents on cool mist",
    accent: "#8b5cf6",
    lightBackground: "#faf9ff",
    darkBackground: "#0b0814",
  },
  {
    id: "ocean",
    label: "Ocean",
    description: "Blue accents on airy sky",
    accent: "#3b82f6",
    lightBackground: "#f8fafc",
    darkBackground: "#060a14",
  },
  {
    id: "lagoon",
    label: "Lagoon",
    description: "Teal accents on sea foam",
    accent: "#14b8a6",
    lightBackground: "#f7fdfb",
    darkBackground: "#041210",
  },
  {
    id: "forest",
    label: "Forest",
    description: "Emerald accents on sage mist",
    accent: "#10b981",
    lightBackground: "#f7fdf9",
    darkBackground: "#04120c",
  },
  {
    id: "midnight",
    label: "Midnight",
    description: "Indigo accents on deep night",
    accent: "#6366f1",
    lightBackground: "#f5f6ff",
    darkBackground: "#05060f",
  },
  {
    id: "slate",
    label: "Slate",
    description: "Neutral zinc with minimal color",
    accent: "#71717a",
    lightBackground: "#fafafa",
    darkBackground: "#09090b",
  },
];

/** Maps legacy accent preset ids to palette ids */
export const LEGACY_ACCENT_TO_PALETTE: Readonly<Record<string, PaletteId>> = {
  amber: "warm",
  orange: "sunset",
  rose: "bloom",
  red: "crimson",
  violet: "aurora",
  blue: "ocean",
  teal: "lagoon",
  emerald: "forest",
  custom: "warm",
};
