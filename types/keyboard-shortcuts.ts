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
  | "openHelp"
  | "focusLibrarySearch"
  | "addCurrentToPlaylist"
  | "jumpToNowPlaying"
  | "toggleFavoriteCurrent"
  | "clearQueue";

export type KeyboardShortcutConfig = Record<
  KeyboardShortcutAction,
  string | null
>;
