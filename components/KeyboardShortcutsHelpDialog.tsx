"use client";

import { useEffect, useId, useRef } from "react";
import {
  KEYBOARD_SHORTCUT_ACTIONS,
  displayKeyboardShortcut,
} from "@/lib/keyboard-shortcuts";
import type { KeyboardShortcutConfig } from "@/types/keyboard-shortcuts";

type KeyboardShortcutsHelpDialogProps = {
  shortcuts: KeyboardShortcutConfig;
  onClose: () => void;
};

/**
 * Modal list of active keyboard shortcuts.
 */
export default function KeyboardShortcutsHelpDialog(
  props: KeyboardShortcutsHelpDialogProps,
) {
  const { onClose, shortcuts } = props;
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/50 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-ignore-global-shortcuts
        className="flex max-h-[min(85vh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-950"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
            >
              Keyboard shortcuts
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              Current player controls for this device.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 cursor-pointer rounded-lg px-2 py-1 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Close
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          <dl className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {KEYBOARD_SHORTCUT_ACTIONS.map((action) => (
              <div
                key={action.id}
                className="grid gap-2 px-3 py-2.5 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <dt className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {action.label}
                  </dt>
                  <dd className="mt-0.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {action.description}
                  </dd>
                </div>
                <dd className="sm:text-right">
                  <kbd className="inline-flex min-h-7 items-center rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-[11px] font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                    {displayKeyboardShortcut(shortcuts[action.id])}
                  </kbd>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
