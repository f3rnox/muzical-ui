"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePlaybackPreferences } from "@/components/PlaybackPreferencesProvider";
import { useSettingsSaveNotification } from "@/components/SettingsSaveNotification";
import {
  DEFAULT_KEYBOARD_SHORTCUTS,
  KEYBOARD_SHORTCUT_ACTIONS,
  displayKeyboardShortcut,
  findKeyboardShortcutConflict,
  normalizeKeyboardShortcutEvent,
} from "@/lib/keyboard-shortcuts";
import type { KeyboardShortcutAction } from "@/types/keyboard-shortcuts";

type CaptureState = {
  action: KeyboardShortcutAction;
  error: string | null;
} | null;

const ACTION_BY_ID = new Map(
  KEYBOARD_SHORTCUT_ACTIONS.map((action) => [action.id, action]),
);

/**
 * Per-device keyboard shortcut editor.
 */
export default function KeyboardShortcutsSettingsPanel() {
  const { preferences, setKeyboardShortcut, resetKeyboardShortcuts } =
    usePlaybackPreferences();
  const { notifySettingsSaved } = useSettingsSaveNotification();
  const [capture, setCapture] = useState<CaptureState>(null);

  const shortcuts = preferences.keyboardShortcuts;

  const shortcutRows = useMemo(
    () =>
      KEYBOARD_SHORTCUT_ACTIONS.map((action) => ({
        ...action,
        shortcut: shortcuts[action.id],
        defaultShortcut: DEFAULT_KEYBOARD_SHORTCUTS[action.id],
      })),
    [shortcuts],
  );

  const stopCapture = useCallback(() => setCapture(null), []);

  const startCapture = useCallback((action: KeyboardShortcutAction) => {
    setCapture({ action, error: null });
  }, []);

  const clearShortcut = useCallback(
    (action: KeyboardShortcutAction) => {
      setKeyboardShortcut(action, null);
      notifySettingsSaved("Keyboard shortcut cleared");
      setCapture(null);
    },
    [notifySettingsSaved, setKeyboardShortcut],
  );

  const resetShortcut = useCallback(
    (action: KeyboardShortcutAction) => {
      setKeyboardShortcut(action, DEFAULT_KEYBOARD_SHORTCUTS[action]);
      notifySettingsSaved("Keyboard shortcut reset");
      setCapture(null);
    },
    [notifySettingsSaved, setKeyboardShortcut],
  );

  const resetAll = useCallback(() => {
    resetKeyboardShortcuts();
    notifySettingsSaved("Keyboard shortcuts reset");
    setCapture(null);
  }, [notifySettingsSaved, resetKeyboardShortcuts]);

  useEffect(() => {
    if (!capture) return undefined;

    const onKeyDown = (event: KeyboardEvent): void => {
      event.preventDefault();
      event.stopPropagation();

      if (event.key === "Escape") {
        setCapture(null);
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        clearShortcut(capture.action);
        return;
      }

      const shortcut = normalizeKeyboardShortcutEvent(event);
      if (!shortcut) return;

      const conflict = findKeyboardShortcutConflict(
        shortcuts,
        shortcut,
        capture.action,
      );
      if (conflict) {
        setCapture({
          action: capture.action,
          error: `${displayKeyboardShortcut(shortcut)} is already assigned to ${conflict.label}.`,
        });
        return;
      }

      setKeyboardShortcut(capture.action, shortcut);
      notifySettingsSaved("Keyboard shortcut saved");
      setCapture(null);
    };

    document.addEventListener("keydown", onKeyDown, { capture: true });
    return () =>
      document.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [
    capture,
    clearShortcut,
    notifySettingsSaved,
    setKeyboardShortcut,
    shortcuts,
  ]);

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Keyboard shortcuts
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Player controls used when focus is not inside an input, button,
            link, slider, or dialog.
          </p>
        </div>
        <button
          type="button"
          onClick={resetAll}
          className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Reset all
        </button>
      </div>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-zinc-200 px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:border-zinc-800 sm:grid-cols-[minmax(12rem,1fr)_9rem_9rem_13rem]">
          <span>Action</span>
          <span className="hidden sm:block">Shortcut</span>
          <span className="hidden sm:block">Default</span>
          <span className="text-right">Edit</span>
        </div>
        <ul
          role="list"
          className="divide-y divide-zinc-200 dark:divide-zinc-800"
        >
          {shortcutRows.map((row) => {
            const recording = capture?.action === row.id;
            const hasCustomValue = row.shortcut !== row.defaultShortcut;
            return (
              <li
                key={row.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-3 sm:grid-cols-[minmax(12rem,1fr)_9rem_9rem_13rem] sm:items-center"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {row.label}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {row.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 sm:hidden">
                    <ShortcutBadge value={row.shortcut} />
                    <ShortcutBadge
                      value={row.defaultShortcut}
                      label="Default"
                    />
                  </div>
                  {recording && capture.error ? (
                    <p
                      className="mt-2 text-xs font-medium text-red-600 dark:text-red-400"
                      role="alert"
                    >
                      {capture.error}
                    </p>
                  ) : null}
                </div>

                <div className="hidden sm:block">
                  <ShortcutBadge value={row.shortcut} />
                </div>
                <div className="hidden sm:block">
                  <ShortcutBadge value={row.defaultShortcut} />
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      recording ? stopCapture() : startCapture(row.id)
                    }
                    className={[
                      "inline-flex h-8 items-center justify-center rounded-lg border px-3 text-xs font-medium transition",
                      recording
                        ? "border-accent-500 bg-accent-500/15 text-accent-900 dark:text-accent-100"
                        : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800",
                    ].join(" ")}
                  >
                    {recording ? "Cancel" : "Record"}
                  </button>
                  <button
                    type="button"
                    onClick={() => clearShortcut(row.id)}
                    disabled={!row.shortcut}
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => resetShortcut(row.id)}
                    disabled={!hasCustomValue}
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Reset
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {capture ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 p-4"
          role="presentation"
          onClick={stopCapture}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-950"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Recording {ACTION_BY_ID.get(capture.action)?.label}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Press a key combination. Escape cancels. Backspace or Delete
              clears this shortcut.
            </p>
            {capture.error ? (
              <p
                className="mt-3 text-sm font-medium text-red-600 dark:text-red-400"
                role="alert"
              >
                {capture.error}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ShortcutBadge(props: { value: string | null; label?: string }) {
  return (
    <span className="inline-flex min-h-7 min-w-0 items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-[11px] font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
      {props.label ? (
        <span className="font-sans text-[10px] uppercase tracking-wider text-zinc-400">
          {props.label}
        </span>
      ) : null}
      <span>{displayKeyboardShortcut(props.value)}</span>
    </span>
  );
}
