export type KeyboardShortcutAction =
  | "playPause"
  | "previousTrack"
  | "nextTrack"
  | "seekBackward"
  | "seekForward"
  | "seekBackwardLarge"
  | "seekForwardLarge"
  | "volumeDown"
  | "volumeUp"
  | "toggleShuffle"
  | "cycleRepeat"
  | "toggleLyrics"
  | "toggleEqualizer"
  | "openHelp";

export type KeyboardShortcutConfig = Record<
  KeyboardShortcutAction,
  string | null
>;
