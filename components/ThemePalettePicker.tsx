'use client'

import { usePalette } from '@/components/PaletteProvider'
import { useSettingsSaveNotification } from '@/components/SettingsSaveNotification'
import { useTheme } from '@/components/ThemeProvider'
import { COLOR_PALETTES } from '@/lib/palette/palette-constants'

/**
 * Grid of color palette themes for display settings.
 */
export default function ThemePalettePicker() {
  const { paletteId, setPaletteId } = usePalette()
  const { notifySettingsSaved } = useSettingsSaveNotification()
  const { scheme } = useTheme()

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Color palette</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Choose a coordinated accent and page tint. Works with light and dark mode from the top bar.
        </p>
      </div>
      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
        role="radiogroup"
        aria-label="Color palette"
      >
        {COLOR_PALETTES.map((palette) => {
          const selected = paletteId === palette.id
          const previewBg = scheme === 'dark' ? palette.darkBackground : palette.lightBackground
          return (
            <button
              key={palette.id}
              type="button"
              role="radio"
              aria-checked={selected}
              title={palette.label}
              onClick={() => {
                setPaletteId(palette.id)
                notifySettingsSaved('Display settings saved')
              }}
              className={[
                'flex cursor-pointer flex-col items-stretch gap-2 rounded-xl border p-2 text-left transition',
                selected
                  ? 'border-accent-500 bg-accent-50/80 ring-2 ring-accent-500/30 dark:bg-accent-950/30'
                  : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900/40 dark:hover:border-zinc-600',
              ].join(' ')}
            >
              <span
                className="flex h-10 w-full overflow-hidden rounded-lg ring-1 ring-zinc-900/10 dark:ring-white/10"
                aria-hidden
              >
                <span className="flex-[2]" style={{ backgroundColor: previewBg }} />
                <span className="flex-1" style={{ backgroundColor: palette.accent }} />
                <span
                  className="flex-1"
                  style={{
                    backgroundColor: palette.accent,
                    opacity: 0.45,
                  }}
                />
              </span>
              <span className="px-0.5">
                <span className="block text-xs font-medium text-zinc-900 dark:text-zinc-100">{palette.label}</span>
                <span className="mt-0.5 block text-[10px] leading-snug text-zinc-500 dark:text-zinc-400">
                  {palette.description}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
