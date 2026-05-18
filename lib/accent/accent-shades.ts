/** Tailwind-style accent shade keys used as CSS variables. */
export type AccentShade =
  | "50"
  | "200"
  | "300"
  | "400"
  | "500"
  | "600"
  | "700"
  | "800"
  | "900"
  | "950";

export const ACCENT_SHADES: readonly AccentShade[] = [
  "50",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
  "950",
];

export type AccentPalette = Record<AccentShade, string>;
