'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

type SettingsSaveNotificationContextValue = {
  notifySettingsSaved: (message?: string) => void
}

const NOTIFICATION_DISMISS_MS = 2200

const SettingsSaveNotificationContext = createContext<SettingsSaveNotificationContextValue>({
  notifySettingsSaved: () => undefined,
})

/**
 * Settings-only save toast. Callers stay decoupled from the notification UI.
 */
export function SettingsSaveNotificationProvider(props: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearDismissTimer = useCallback(() => {
    if (!timerRef.current) return
    clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])

  const dismiss = useCallback(() => {
    clearDismissTimer()
    setMessage(null)
  }, [clearDismissTimer])

  const notifySettingsSaved = useCallback(
    (nextMessage = 'Settings saved') => {
      clearDismissTimer()
      setMessage(nextMessage)
      timerRef.current = setTimeout(() => {
        setMessage(null)
        timerRef.current = null
      }, NOTIFICATION_DISMISS_MS)
    },
    [clearDismissTimer],
  )

  useEffect(() => clearDismissTimer, [clearDismissTimer])

  const value = useMemo(() => ({ notifySettingsSaved }), [notifySettingsSaved])

  return (
    <SettingsSaveNotificationContext.Provider value={value}>
      {props.children}
      {message ? (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-auto fixed bottom-4 right-4 z-50 w-[min(100vw-2rem,22rem)] rounded-xl border border-emerald-200/90 bg-white/95 p-4 pr-10 shadow-lg shadow-zinc-900/10 backdrop-blur-sm dark:border-emerald-800/80 dark:bg-zinc-900/95 dark:shadow-black/40"
        >
          <button
            type="button"
            onClick={dismiss}
            className="absolute right-2 top-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            aria-label="Dismiss notification"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                aria-hidden
              >
                <path d="M5 12.5l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <p className="min-w-0 text-sm font-medium text-zinc-900 dark:text-zinc-100">{message}</p>
          </div>
        </div>
      ) : null}
    </SettingsSaveNotificationContext.Provider>
  )
}

/**
 * Report that a settings control persisted successfully.
 */
export function useSettingsSaveNotification(): SettingsSaveNotificationContextValue {
  return useContext(SettingsSaveNotificationContext)
}

type SettingsSaveNotificationProps = {
  show: boolean
  onDismiss: () => void
  message?: string
}

export default function SettingsSaveNotification({
  show,
  onDismiss,
  message = 'Settings saved',
}: SettingsSaveNotificationProps) {
  const { notifySettingsSaved } = useSettingsSaveNotification()

  useEffect(() => {
    if (show) {
      notifySettingsSaved(message)
      onDismiss()
    }
  }, [show, onDismiss, message, notifySettingsSaved])

  return null
}
