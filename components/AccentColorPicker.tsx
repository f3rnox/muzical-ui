'use client'

import { useCallback, useState } from 'react'
import { useAccent } from '@/components/AccentProvider'
import { ACCENT_PRESETS } from '@/lib/accent/accent-constants'
import parseHexColor from '@/lib/accent/parse-hex-color'

/**
 * Grid of accent color presets plus a custom color picker for display settings.
 */
export default function AccentColorPicker() {
  const { accentId, customHex, setAccentId, setCustomAccentHex } = useAccent()
  const [hexDraft, setHexDraft] = useState<string | null>(null)
  const hexInput = hexDraft ?? customHex
  const isCustom = accentId === 'custom'

  const onHexInputBlur = useCallback(() => {
    const parsed = parseHexColor(hexInput)
    setHexDraft(null)
    if (parsed) setCustomAccentHex(parsed)
  }, [hexInput, setCustomAccentHex])

  const onColorInputChange = useCallback(
    (value: string) => {
      setHexDraft(null)
      setCustomAccentHex(value)
    },
    [setCustomAccentHex],
  )

  const onSelectCustom = useCallback(() => {
    setAccentId('custom')
    setCustomAccentHex(customHex)
  }, [customHex, setAccentId, setCustomAccentHex])

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Accent color</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Buttons, links, progress bars, and highlights use this color across the player.
        </p>
      </div>
      <div
        className="grid grid-cols-3 gap-2 sm:grid-cols-5"
        role="radiogroup"
        aria-label="Accent color"
      >
        {ACCENT_PRESETS.map((preset) => {
          const selected = accentId === preset.id
          return (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={selected}
              title={preset.label}
              onClick={() => setAccentId(preset.id)}
              className={[
                'flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-center transition',
                selected
                  ? 'border-accent-500 bg-accent-50/80 ring-2 ring-accent-500/30 dark:bg-accent-950/30'
                  : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900/40 dark:hover:border-zinc-600',
              ].join(' ')}
            >
              <span
                className="h-7 w-7 shrink-0 rounded-full ring-1 ring-zinc-900/10 dark:ring-white/10"
                style={{ backgroundColor: preset.swatch }}
                aria-hidden
              />
              <span className="text-[10px] font-medium leading-tight text-zinc-600 dark:text-zinc-400">
                {preset.label}
              </span>
            </button>
          )
        })}
        <button
          type="button"
          role="radio"
          aria-checked={isCustom}
          title="Custom color"
          onClick={onSelectCustom}
          className={[
            'flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border px-2 py-2.5 text-center transition',
            isCustom
              ? 'border-accent-500 bg-accent-50/80 ring-2 ring-accent-500/30 dark:bg-accent-950/30'
              : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900/40 dark:hover:border-zinc-600',
          ].join(' ')}
        >
          <span
            className="h-7 w-7 shrink-0 rounded-full ring-1 ring-zinc-900/10 dark:ring-white/10"
            style={{
              background: isCustom
                ? customHex
                : 'conic-gradient(#ef4444, #f97316, #eab308, #22c55e, #3b82f6, #8b5cf6, #ef4444)',
            }}
            aria-hidden
          />
          <span className="text-[10px] font-medium leading-tight text-zinc-600 dark:text-zinc-400">
            Custom
          </span>
        </button>
      </div>
      {isCustom ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-900/50">
          <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <span className="sr-only">Pick custom accent color</span>
            <input
              type="color"
              value={customHex}
              onChange={(e) => onColorInputChange(e.target.value)}
              className="h-10 w-10 cursor-pointer rounded-lg border border-zinc-200 bg-white p-0.5 dark:border-zinc-600 dark:bg-zinc-950"
              aria-label="Custom accent color"
            />
          </label>
          <label className="flex min-w-0 flex-1 items-center gap-2">
            <span className="shrink-0 text-xs font-medium uppercase tracking-wider text-zinc-500">
              Hex
            </span>
            <input
              type="text"
              value={hexInput}
              onChange={(e) => setHexDraft(e.target.value)}
              onBlur={onHexInputBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur()
                }
              }}
              spellCheck={false}
              autoComplete="off"
              placeholder="#f59e0b"
              className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-zinc-900 outline-none ring-accent-500/0 transition focus:border-accent-400 focus:ring-2 focus:ring-accent-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              aria-label="Custom accent hex color"
            />
          </label>
        </div>
      ) : null}
    </div>
  )
}
