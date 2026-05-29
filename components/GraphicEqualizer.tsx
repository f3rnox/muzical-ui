"use client";

import {
  EQUALIZER_BANDS_HZ,
  EQUALIZER_MAX_GAIN_DB,
  EQUALIZER_MIN_GAIN_DB,
  normalizeEqualizerGainsDb,
} from "@/lib/playback/equalizer";

type GraphicEqualizerProps = {
  gainsDb: readonly number[];
  onBandChange: (index: number, gainDb: number) => void;
  onReset: () => void;
  onClose: () => void;
};

function formatBandLabel(frequencyHz: number): string {
  if (frequencyHz >= 1000) return `${frequencyHz / 1000}k`;
  return String(frequencyHz);
}

function formatGainLabel(gainDb: number): string {
  if (gainDb > 0) return `+${gainDb}`;
  return String(gainDb);
}

/**
 * Compact 10-band equalizer control for the player panel.
 */
export default function GraphicEqualizer(props: GraphicEqualizerProps) {
  const gains = normalizeEqualizerGainsDb(props.gainsDb);

  return (
    <div className="border-t border-zinc-200 pt-3 dark:border-zinc-800">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Equalizer
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={props.onReset}
            className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={props.onClose}
            aria-label="Close equalizer"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className="h-4 w-4"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="grid min-w-[252px] grid-cols-10 gap-1">
          {EQUALIZER_BANDS_HZ.map((frequencyHz, index) => {
            const gainDb = gains[index] ?? 0;
            return (
              <label
                key={frequencyHz}
                className="flex min-w-0 flex-col items-center gap-1"
              >
                <span className="text-[10px] leading-none text-zinc-500">
                  {formatBandLabel(frequencyHz)}
                </span>
                <input
                  type="range"
                  min={EQUALIZER_MIN_GAIN_DB}
                  max={EQUALIZER_MAX_GAIN_DB}
                  step={1}
                  value={gainDb}
                  onChange={(e) =>
                    props.onBandChange(index, Number(e.target.value))
                  }
                  className="h-24 w-6 cursor-pointer accent-accent-500"
                  style={{ writingMode: "vertical-lr", direction: "rtl" }}
                  aria-label={`${frequencyHz} Hz equalizer gain`}
                />
                <span className="w-full text-center text-[10px] leading-none tabular-nums text-zinc-500">
                  {formatGainLabel(gainDb)}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
