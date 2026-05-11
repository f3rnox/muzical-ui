'use client'

import { useCallback } from 'react'

export type PanelResizeHandleProps = {
  'aria-label': string
  onSessionStart: () => void
  onSessionMove: (deltaXFromStart: number) => void
  onSessionEnd: () => void
}

/**
 * Vertical drag handle for resizable flex columns (hide on small screens via parent).
 */
export default function PanelResizeHandle(props: PanelResizeHandleProps) {
  const { 'aria-label': ariaLabel, onSessionStart, onSessionMove, onSessionEnd } = props

  const onPointerDown = useCallback(
    (e: { currentTarget: HTMLDivElement; clientX: number; pointerId: number; preventDefault: () => void }) => {
      e.preventDefault()
      const el = e.currentTarget
      const startX = e.clientX
      onSessionStart()
      el.setPointerCapture(e.pointerId)
      const move = (ev: PointerEvent): void => {
        onSessionMove(ev.clientX - startX)
      }
      const up = (ev: PointerEvent): void => {
        try {
          el.releasePointerCapture(ev.pointerId)
        } catch {
          /* ignore */
        }
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        window.removeEventListener('pointercancel', up)
        onSessionEnd()
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
      window.addEventListener('pointercancel', up)
    },
    [onSessionEnd, onSessionMove, onSessionStart],
  )

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={ariaLabel}
      tabIndex={0}
      onPointerDown={onPointerDown}
      className="group relative z-10 flex w-0 shrink-0 cursor-col-resize justify-center outline-none max-lg:hidden"
    >
      <div
        className="absolute top-0 bottom-0 left-1/2 w-3 -translate-x-1/2 bg-transparent transition-colors group-hover:bg-amber-500/15 group-active:bg-amber-500/25"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 bg-zinc-200 dark:bg-zinc-700"
        aria-hidden
      />
    </div>
  )
}
