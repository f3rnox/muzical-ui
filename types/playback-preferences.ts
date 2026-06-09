import type { RepeatMode } from "@/types/repeat-mode";
import type { KeyboardShortcutConfig } from "@/types/keyboard-shortcuts";

/** User defaults for player controls and end-of-track behavior. */
export type PlaybackPreferences = {
  repeatMode: RepeatMode;
  shuffle: boolean;
  playbackRate: number;
  rememberVolume: boolean;
  volume: number;
  seekStepSmallSec: number;
  seekStepLargeSec: number;
  autoAdvanceOnEnd: boolean;
  equalizerGainsDb: number[];
  keyboardShortcuts: KeyboardShortcutConfig;
};
