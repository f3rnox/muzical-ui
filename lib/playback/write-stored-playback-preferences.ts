import {
  AUTO_ADVANCE_ON_END_STORAGE_KEY,
  PLAYBACK_RATE_STORAGE_KEY,
  REMEMBER_VOLUME_STORAGE_KEY,
  REPEAT_MODE_STORAGE_KEY,
  SEEK_STEP_LARGE_STORAGE_KEY,
  SEEK_STEP_SMALL_STORAGE_KEY,
  SHUFFLE_STORAGE_KEY,
  VOLUME_STORAGE_KEY,
} from "@/lib/playback/playback-preference-storage-keys";
import {
  EQUALIZER_GAINS_STORAGE_KEY,
  normalizeEqualizerGainsDb,
} from "@/lib/playback/equalizer";
import type { PlaybackPreferences } from "@/types/playback-preferences";

/**
 * Persists playback preferences to localStorage.
 */
export default function writeStoredPlaybackPreferences(
  prefs: PlaybackPreferences,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REPEAT_MODE_STORAGE_KEY, prefs.repeatMode);
    window.localStorage.setItem(SHUFFLE_STORAGE_KEY, prefs.shuffle ? "1" : "0");
    window.localStorage.setItem(
      PLAYBACK_RATE_STORAGE_KEY,
      String(prefs.playbackRate),
    );
    window.localStorage.setItem(
      REMEMBER_VOLUME_STORAGE_KEY,
      JSON.stringify(prefs.rememberVolume),
    );
    window.localStorage.setItem(VOLUME_STORAGE_KEY, String(prefs.volume));
    window.localStorage.setItem(
      SEEK_STEP_SMALL_STORAGE_KEY,
      String(prefs.seekStepSmallSec),
    );
    window.localStorage.setItem(
      SEEK_STEP_LARGE_STORAGE_KEY,
      String(prefs.seekStepLargeSec),
    );
    window.localStorage.setItem(
      AUTO_ADVANCE_ON_END_STORAGE_KEY,
      JSON.stringify(prefs.autoAdvanceOnEnd),
    );
    window.localStorage.setItem(
      EQUALIZER_GAINS_STORAGE_KEY,
      JSON.stringify(normalizeEqualizerGainsDb(prefs.equalizerGainsDb)),
    );
  } catch {
    /* ignore */
  }
}
