/** localStorage key for persisted accent color preset */
export const ACCENT_STORAGE_KEY = "muzical.accent" as const;

export const ACCENT_IDS = [
  "amber",
  "orange",
  "rose",
  "red",
  "violet",
  "blue",
  "teal",
  "emerald",
  "custom",
] as const;

/** localStorage key for custom accent base color (#rrggbb) */
export const CUSTOM_ACCENT_HEX_STORAGE_KEY = "muzical.accentCustomHex" as const;

/** localStorage key for precomputed custom accent CSS variable values */
export const CUSTOM_ACCENT_PALETTE_STORAGE_KEY =
  "muzical.accentCustomPalette" as const;

/** Default base color when custom accent has no stored value (amber 500) */
export const DEFAULT_CUSTOM_ACCENT_HEX = "#f59e0b" as const;

export type AccentId = (typeof ACCENT_IDS)[number];

export const DEFAULT_ACCENT_ID: AccentId = "amber";

export type AccentPreset = {
  id: AccentId;
  label: string;
  /** Preview swatch (500 shade) */
  swatch: string;
};

export const ACCENT_PRESETS: readonly AccentPreset[] = [
  { id: "amber", label: "Amber", swatch: "#f59e0b" },
  { id: "orange", label: "Orange", swatch: "#f97316" },
  { id: "rose", label: "Rose", swatch: "#f43f5e" },
  { id: "red", label: "Red", swatch: "#ef4444" },
  { id: "violet", label: "Violet", swatch: "#8b5cf6" },
  { id: "blue", label: "Blue", swatch: "#3b82f6" },
  { id: "teal", label: "Teal", swatch: "#14b8a6" },
  { id: "emerald", label: "Emerald", swatch: "#10b981" },
];
