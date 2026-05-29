import defaultPlaybackPreferences from "@/lib/playback/default-playback-preferences";
import {
  EQUALIZER_GAINS_STORAGE_KEY,
  normalizeEqualizerGainsDb,
} from "@/lib/playback/equalizer";
import { PLAYBACK_RATES } from "@/lib/playback/playback-rates";
import {
  AUTO_ADVANCE_ON_END_STORAGE_KEY,
  DEFAULT_PLAYBACK_VOLUME,
  PLAYBACK_RATE_STORAGE_KEY,
  REMEMBER_VOLUME_STORAGE_KEY,
  REPEAT_MODE_STORAGE_KEY,
  SEEK_STEP_LARGE_STORAGE_KEY,
  SEEK_STEP_SMALL_STORAGE_KEY,
  SHUFFLE_STORAGE_KEY,
  VOLUME_STORAGE_KEY,
} from "@/lib/playback/playback-preference-storage-keys";
import type { PlaybackPreferences } from "@/types/playback-preferences";
import type { RepeatMode } from "@/types/repeat-mode";

function readRepeatMode(): RepeatMode {
  const defaults = defaultPlaybackPreferences();
  if (typeof window === "undefined") return defaults.repeatMode;
  const v = window.localStorage.getItem(REPEAT_MODE_STORAGE_KEY);
  if (v === "off" || v === "all" || v === "one") return v;
  return defaults.repeatMode;
}

function readShuffle(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SHUFFLE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function readPlaybackRate(): number {
  const defaults = defaultPlaybackPreferences();
  if (typeof window === "undefined") return defaults.playbackRate;
  const v = Number.parseFloat(
    window.localStorage.getItem(PLAYBACK_RATE_STORAGE_KEY) ?? "",
  );
  if (!Number.isFinite(v)) return defaults.playbackRate;
  return PLAYBACK_RATES.includes(v) ? v : defaults.playbackRate;
}

function readStoredBoolean(key: string, defaultValue: boolean): boolean {
  if (typeof window === "undefined") return defaultValue;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return defaultValue;
    const parsed: unknown = JSON.parse(raw);
    return parsed === true;
  } catch {
    return defaultValue;
  }
}

function readVolume(): number {
  if (typeof window === "undefined") return DEFAULT_PLAYBACK_VOLUME;
  const v = Number.parseFloat(
    window.localStorage.getItem(VOLUME_STORAGE_KEY) ?? "",
  );
  if (!Number.isFinite(v)) return DEFAULT_PLAYBACK_VOLUME;
  return Math.min(1, Math.max(0, v));
}

function readPositiveInt(key: string, fallback: number, max: number): number {
  if (typeof window === "undefined") return fallback;
  const v = Number.parseInt(window.localStorage.getItem(key) ?? "", 10);
  if (!Number.isFinite(v) || v <= 0) return fallback;
  return Math.min(max, v);
}

function readEqualizerGainsDb(): number[] {
  const defaults = defaultPlaybackPreferences();
  if (typeof window === "undefined") return defaults.equalizerGainsDb;
  try {
    const raw = window.localStorage.getItem(EQUALIZER_GAINS_STORAGE_KEY);
    if (!raw) return defaults.equalizerGainsDb;
    return normalizeEqualizerGainsDb(JSON.parse(raw));
  } catch {
    return defaults.equalizerGainsDb;
  }
}

/**
 * Loads playback preferences from localStorage with validation.
 */
export default function readStoredPlaybackPreferences(): PlaybackPreferences {
  const defaults = defaultPlaybackPreferences();
  return {
    repeatMode: readRepeatMode(),
    shuffle: readShuffle(),
    playbackRate: readPlaybackRate(),
    rememberVolume: readStoredBoolean(
      REMEMBER_VOLUME_STORAGE_KEY,
      defaults.rememberVolume,
    ),
    volume: readVolume(),
    seekStepSmallSec: readPositiveInt(
      SEEK_STEP_SMALL_STORAGE_KEY,
      defaults.seekStepSmallSec,
      120,
    ),
    seekStepLargeSec: readPositiveInt(
      SEEK_STEP_LARGE_STORAGE_KEY,
      defaults.seekStepLargeSec,
      600,
    ),
    autoAdvanceOnEnd: readStoredBoolean(
      AUTO_ADVANCE_ON_END_STORAGE_KEY,
      defaults.autoAdvanceOnEnd,
    ),
    equalizerGainsDb: readEqualizerGainsDb(),
  };
}
