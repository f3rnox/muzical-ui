"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import defaultPlaybackPreferences from "@/lib/playback/default-playback-preferences";
import {
  clampEqualizerGainDb,
  defaultEqualizerGainsDb,
  normalizeEqualizerGainsDb,
} from "@/lib/playback/equalizer";
import readStoredPlaybackPreferences from "@/lib/playback/read-stored-playback-preferences";
import writeStoredPlaybackPreferences from "@/lib/playback/write-stored-playback-preferences";
import { defaultKeyboardShortcuts } from "@/lib/keyboard-shortcuts";
import type { KeyboardShortcutAction } from "@/types/keyboard-shortcuts";
import type { PlaybackPreferences } from "@/types/playback-preferences";
import type { RepeatMode } from "@/types/repeat-mode";

type PlaybackPreferencesContextValue = {
  preferences: PlaybackPreferences;
  setRepeatMode: (mode: RepeatMode) => void;
  setShuffle: (on: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  setRememberVolume: (on: boolean) => void;
  setVolume: (volume: number) => void;
  setSeekStepSmallSec: (seconds: number) => void;
  setSeekStepLargeSec: (seconds: number) => void;
  setAutoAdvanceOnEnd: (on: boolean) => void;
  setEqualizerBandGain: (index: number, gainDb: number) => void;
  resetEqualizer: () => void;
  setKeyboardShortcut: (
    action: KeyboardShortcutAction,
    shortcut: string | null,
  ) => void;
  resetKeyboardShortcuts: () => void;
  patchPreferences: (partial: Partial<PlaybackPreferences>) => void;
};

const PlaybackPreferencesContext =
  createContext<PlaybackPreferencesContextValue | null>(null);

/**
 * Persists and shares playback defaults between the player and settings.
 */
export function PlaybackPreferencesProvider(props: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<PlaybackPreferences>(
    defaultPlaybackPreferences,
  );

  useEffect(() => {
    queueMicrotask(() => {
      setPreferences(readStoredPlaybackPreferences());
    });
  }, []);

  const patchPreferences = useCallback(
    (partial: Partial<PlaybackPreferences>) => {
      setPreferences((prev) => {
        const next = {
          ...prev,
          ...partial,
          equalizerGainsDb: normalizeEqualizerGainsDb(
            partial.equalizerGainsDb ?? prev.equalizerGainsDb,
          ),
        };
        writeStoredPlaybackPreferences(next);
        return next;
      });
    },
    [],
  );

  const setRepeatMode = useCallback(
    (mode: RepeatMode) => {
      patchPreferences({ repeatMode: mode });
    },
    [patchPreferences],
  );

  const setShuffle = useCallback(
    (on: boolean) => {
      patchPreferences({ shuffle: on });
    },
    [patchPreferences],
  );

  const setPlaybackRate = useCallback(
    (rate: number) => {
      patchPreferences({ playbackRate: rate });
    },
    [patchPreferences],
  );

  const setRememberVolume = useCallback(
    (on: boolean) => {
      patchPreferences({ rememberVolume: on });
    },
    [patchPreferences],
  );

  const setVolume = useCallback((volume: number) => {
    const clamped = Math.min(1, Math.max(0, volume));
    setPreferences((prev) => {
      const next = { ...prev, volume: clamped };
      if (prev.rememberVolume) writeStoredPlaybackPreferences(next);
      return next;
    });
  }, []);

  const setSeekStepSmallSec = useCallback(
    (seconds: number) => {
      const clamped = Math.min(120, Math.max(1, Math.floor(seconds) || 5));
      patchPreferences({ seekStepSmallSec: clamped });
    },
    [patchPreferences],
  );

  const setSeekStepLargeSec = useCallback(
    (seconds: number) => {
      const clamped = Math.min(600, Math.max(1, Math.floor(seconds) || 30));
      patchPreferences({ seekStepLargeSec: clamped });
    },
    [patchPreferences],
  );

  const setAutoAdvanceOnEnd = useCallback(
    (on: boolean) => {
      patchPreferences({ autoAdvanceOnEnd: on });
    },
    [patchPreferences],
  );

  const setEqualizerBandGain = useCallback((index: number, gainDb: number) => {
    if (!Number.isInteger(index)) return;
    setPreferences((prev) => {
      const nextGains = normalizeEqualizerGainsDb(prev.equalizerGainsDb);
      if (index < 0 || index >= nextGains.length) return prev;
      nextGains[index] = clampEqualizerGainDb(gainDb);
      const next = { ...prev, equalizerGainsDb: nextGains };
      writeStoredPlaybackPreferences(next);
      return next;
    });
  }, []);

  const resetEqualizer = useCallback(() => {
    patchPreferences({ equalizerGainsDb: defaultEqualizerGainsDb() });
  }, [patchPreferences]);

  const setKeyboardShortcut = useCallback(
    (action: KeyboardShortcutAction, shortcut: string | null) => {
      setPreferences((prev) => {
        const next = {
          ...prev,
          keyboardShortcuts: {
            ...prev.keyboardShortcuts,
            [action]: shortcut,
          },
        };
        writeStoredPlaybackPreferences(next);
        return next;
      });
    },
    [],
  );

  const resetKeyboardShortcuts = useCallback(() => {
    patchPreferences({ keyboardShortcuts: defaultKeyboardShortcuts() });
  }, [patchPreferences]);

  const value = useMemo(
    () => ({
      preferences,
      setRepeatMode,
      setShuffle,
      setPlaybackRate,
      setRememberVolume,
      setVolume,
      setSeekStepSmallSec,
      setSeekStepLargeSec,
      setAutoAdvanceOnEnd,
      setEqualizerBandGain,
      resetEqualizer,
      setKeyboardShortcut,
      resetKeyboardShortcuts,
      patchPreferences,
    }),
    [
      preferences,
      setRepeatMode,
      setShuffle,
      setPlaybackRate,
      setRememberVolume,
      setVolume,
      setSeekStepSmallSec,
      setSeekStepLargeSec,
      setAutoAdvanceOnEnd,
      setEqualizerBandGain,
      resetEqualizer,
      setKeyboardShortcut,
      resetKeyboardShortcuts,
      patchPreferences,
    ],
  );

  return (
    <PlaybackPreferencesContext.Provider value={value}>
      {props.children}
    </PlaybackPreferencesContext.Provider>
  );
}

/**
 * Access playback preferences from client components.
 */
export function usePlaybackPreferences(): PlaybackPreferencesContextValue {
  const ctx = useContext(PlaybackPreferencesContext);
  if (!ctx) {
    throw new Error(
      "usePlaybackPreferences must be used within PlaybackPreferencesProvider",
    );
  }
  return ctx;
}
