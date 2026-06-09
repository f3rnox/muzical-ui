import type {
  KeyboardShortcutAction,
  KeyboardShortcutConfig,
} from "@/types/keyboard-shortcuts";

export type KeyboardShortcutActionDefinition = {
  id: KeyboardShortcutAction;
  label: string;
  description: string;
};

export const KEYBOARD_SHORTCUT_ACTIONS: readonly KeyboardShortcutActionDefinition[] =
  [
    {
      id: "playPause",
      label: "Play / pause",
      description: "Toggle playback for the current queue item.",
    },
    {
      id: "previousTrack",
      label: "Previous track",
      description: "Go to the previous queue item.",
    },
    {
      id: "nextTrack",
      label: "Next track",
      description: "Go to the next queue item.",
    },
    {
      id: "seekBackward",
      label: "Seek backward",
      description: "Move back by the small seek step.",
    },
    {
      id: "seekForward",
      label: "Seek forward",
      description: "Move forward by the small seek step.",
    },
    {
      id: "seekBackwardLarge",
      label: "Seek backward large",
      description: "Move back by the large seek step.",
    },
    {
      id: "seekForwardLarge",
      label: "Seek forward large",
      description: "Move forward by the large seek step.",
    },
    {
      id: "volumeDown",
      label: "Volume down",
      description: "Lower player volume.",
    },
    {
      id: "volumeUp",
      label: "Volume up",
      description: "Raise player volume.",
    },
    {
      id: "toggleShuffle",
      label: "Shuffle",
      description: "Toggle shuffle playback.",
    },
    {
      id: "cycleRepeat",
      label: "Repeat mode",
      description: "Cycle repeat off, queue, and one.",
    },
    {
      id: "toggleLyrics",
      label: "Lyrics panel",
      description: "Show or hide lyrics.",
    },
    {
      id: "toggleEqualizer",
      label: "Equalizer",
      description: "Show or hide the equalizer.",
    },
    {
      id: "openHelp",
      label: "Shortcut help",
      description: "Open this keyboard shortcut list.",
    },
    {
      id: "focusLibrarySearch",
      label: "Focus library search",
      description: "Focus the search input in the library panel.",
    },
    {
      id: "addCurrentToPlaylist",
      label: "Add current to playlist",
      description: "Open the add-to-playlist dialog for the now playing track.",
    },
    {
      id: "jumpToNowPlaying",
      label: "Jump to now playing",
      description: "Scroll the queue to highlight the current track.",
    },
    {
      id: "toggleFavoriteCurrent",
      label: "Favorite current track",
      description: "Toggle favorite for the now playing track.",
    },
    {
      id: "clearQueue",
      label: "Clear queue",
      description: "Remove all tracks from the queue.",
    },
  ] as const;

export const DEFAULT_KEYBOARD_SHORTCUTS: KeyboardShortcutConfig = {
  playPause: "Space",
  previousTrack: "Shift+ArrowLeft",
  nextTrack: "Shift+ArrowRight",
  seekBackward: "ArrowLeft",
  seekForward: "ArrowRight",
  seekBackwardLarge: "Ctrl+ArrowLeft",
  seekForwardLarge: "Ctrl+ArrowRight",
  volumeDown: "ArrowDown",
  volumeUp: "ArrowUp",
  toggleShuffle: "KeyS",
  cycleRepeat: "KeyR",
  toggleLyrics: "KeyL",
  toggleEqualizer: "KeyE",
  openHelp: "Shift+Slash",
  focusLibrarySearch: "Ctrl+KeyF",
  addCurrentToPlaylist: "Ctrl+KeyP",
  jumpToNowPlaying: "Ctrl+KeyQ",
  toggleFavoriteCurrent: "Ctrl+KeyB",
  clearQueue: "Ctrl+KeyK",
};

const MODIFIER_CODES = new Set([
  "AltLeft",
  "AltRight",
  "ControlLeft",
  "ControlRight",
  "MetaLeft",
  "MetaRight",
  "ShiftLeft",
  "ShiftRight",
]);

const DISPLAY_LABELS: Record<string, string> = {
  ArrowDown: "Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
  ArrowUp: "Up",
  Backquote: "`",
  Backslash: "\\",
  BracketLeft: "[",
  BracketRight: "]",
  Comma: ",",
  Delete: "Del",
  Digit0: "0",
  Digit1: "1",
  Digit2: "2",
  Digit3: "3",
  Digit4: "4",
  Digit5: "5",
  Digit6: "6",
  Digit7: "7",
  Digit8: "8",
  Digit9: "9",
  Equal: "=",
  Escape: "Esc",
  IntlBackslash: "\\",
  Minus: "-",
  NumpadAdd: "Numpad +",
  NumpadDecimal: "Numpad .",
  NumpadDivide: "Numpad /",
  NumpadMultiply: "Numpad *",
  NumpadSubtract: "Numpad -",
  Period: ".",
  Quote: "'",
  Semicolon: ";",
  Slash: "/",
  Space: "Space",
};

function normalizeCode(code: string, key: string): string | null {
  if (!code && !key) return null;
  if (MODIFIER_CODES.has(code)) return null;
  if (/^Key[A-Z]$/.test(code)) return code;
  if (/^Digit[0-9]$/.test(code)) return code;
  if (/^Numpad[0-9]$/.test(code)) return code;
  if (code) return code;
  if (key === " ") return "Space";
  if (key.length === 1) return key.toUpperCase();
  return key;
}

function isKeyboardShortcutAction(
  value: string,
): value is KeyboardShortcutAction {
  return KEYBOARD_SHORTCUT_ACTIONS.some((action) => action.id === value);
}

export function defaultKeyboardShortcuts(): KeyboardShortcutConfig {
  return { ...DEFAULT_KEYBOARD_SHORTCUTS };
}

export function normalizeKeyboardShortcutConfig(
  raw: unknown,
): KeyboardShortcutConfig {
  const defaults = defaultKeyboardShortcuts();
  if (!raw || typeof raw !== "object") return defaults;
  const candidate = raw as Record<string, unknown>;
  const next: KeyboardShortcutConfig = { ...defaults };

  for (const action of KEYBOARD_SHORTCUT_ACTIONS) {
    const value = candidate[action.id];
    if (value === null) {
      next[action.id] = null;
    } else if (typeof value === "string") {
      next[action.id] = value;
    }
  }

  return next;
}

export function displayKeyboardShortcut(shortcut: string | null): string {
  if (!shortcut) return "Unassigned";
  return shortcut
    .split("+")
    .map((part) => {
      if (part === "Ctrl") return "Ctrl";
      if (part === "Alt") return "Alt";
      if (part === "Shift") return "Shift";
      if (part === "Meta") return "Meta";
      if (/^Key[A-Z]$/.test(part)) return part.slice(3);
      if (/^Digit[0-9]$/.test(part)) return part.slice(5);
      if (/^Numpad[0-9]$/.test(part)) return `Numpad ${part.slice(6)}`;
      return DISPLAY_LABELS[part] ?? part;
    })
    .join(" + ");
}

export function normalizeKeyboardShortcutEvent(
  event: Pick<
    KeyboardEvent,
    | "altKey"
    | "code"
    | "ctrlKey"
    | "isComposing"
    | "key"
    | "metaKey"
    | "shiftKey"
  >,
): string | null {
  if (event.isComposing) return null;
  const key = normalizeCode(event.code, event.key);
  if (!key) return null;

  const parts: string[] = [];
  if (event.ctrlKey) parts.push("Ctrl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");
  if (event.metaKey) parts.push("Meta");
  parts.push(key);
  return parts.join("+");
}

export function shouldIgnoreKeyboardShortcutEvent(
  event: KeyboardEvent,
): boolean {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target.closest("[data-ignore-global-shortcuts]")) return true;
  if (
    target.closest(
      'input, textarea, select, button, a, [role="button"], [role="slider"], [role="textbox"], [role="menu"], [role="dialog"]',
    )
  ) {
    return true;
  }
  return false;
}

export function findActionForKeyboardShortcut(
  shortcuts: KeyboardShortcutConfig,
  shortcut: string,
): KeyboardShortcutAction | null {
  for (const [action, value] of Object.entries(shortcuts)) {
    if (value === shortcut && isKeyboardShortcutAction(action)) return action;
  }
  return null;
}

export function findKeyboardShortcutConflict(
  shortcuts: KeyboardShortcutConfig,
  shortcut: string,
  exceptAction: KeyboardShortcutAction,
): KeyboardShortcutActionDefinition | null {
  const conflict = KEYBOARD_SHORTCUT_ACTIONS.find(
    (action) => action.id !== exceptAction && shortcuts[action.id] === shortcut,
  );
  return conflict ?? null;
}
