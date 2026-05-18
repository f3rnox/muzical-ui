type SettingsSwitchRowProps = {
  title: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
  ariaLabel: string
}

/**
 * Labeled switch row for boolean settings.
 */
export default function SettingsSwitchRow(props: SettingsSwitchRowProps) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">{props.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{props.description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={props.checked}
        aria-label={props.ariaLabel}
        onClick={() => props.onChange(!props.checked)}
        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent p-0.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900 ${
          props.checked ? 'bg-amber-500' : 'bg-zinc-300 dark:bg-zinc-600'
        }`}
      >
        <span
          aria-hidden
          className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            props.checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}
