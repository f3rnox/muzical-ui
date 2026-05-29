export const EQUALIZER_BANDS_HZ = [
  32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000,
] as const;

export const EQUALIZER_MIN_GAIN_DB = -12;
export const EQUALIZER_MAX_GAIN_DB = 12;

export const EQUALIZER_GAINS_STORAGE_KEY = "muzical.equalizerGainsDb" as const;

export function defaultEqualizerGainsDb(): number[] {
  return EQUALIZER_BANDS_HZ.map(() => 0);
}

export function clampEqualizerGainDb(gainDb: number): number {
  if (!Number.isFinite(gainDb)) return 0;
  return Math.min(
    EQUALIZER_MAX_GAIN_DB,
    Math.max(EQUALIZER_MIN_GAIN_DB, Math.round(gainDb)),
  );
}

export function normalizeEqualizerGainsDb(value: unknown): number[] {
  const defaults = defaultEqualizerGainsDb();
  if (!Array.isArray(value)) return defaults;
  return defaults.map((fallback, index) => {
    const next = value[index];
    return typeof next === "number" ? clampEqualizerGainDb(next) : fallback;
  });
}
