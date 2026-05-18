'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import applyAccentSelectionToDocument from '@/lib/accent/apply-accent-selection-to-document'
import { DEFAULT_ACCENT_ID, DEFAULT_CUSTOM_ACCENT_HEX, type AccentId } from '@/lib/accent/accent-constants'
import readStoredAccentSelection from '@/lib/accent/read-stored-accent-selection'
import writeStoredAccentSelection from '@/lib/accent/write-stored-accent-selection'
import parseHexColor from '@/lib/accent/parse-hex-color'

type AccentContextValue = {
  accentId: AccentId
  customHex: string
  setAccentId: (next: AccentId) => void
  setCustomAccentHex: (hex: string) => void
}

const AccentContext = createContext<AccentContextValue | null>(null)

/**
 * Persists accent preset or custom color and keeps document theme variables in sync.
 */
export function AccentProvider(props: { children: ReactNode }) {
  const [accentId, setAccentIdState] = useState<AccentId>(DEFAULT_ACCENT_ID)
  const [customHex, setCustomHexState] = useState<string>(DEFAULT_CUSTOM_ACCENT_HEX)

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const stored = readStoredAccentSelection()
      setAccentIdState(stored.accentId)
      setCustomHexState(stored.customHex)
      applyAccentSelectionToDocument(stored)
    })
    return () => cancelAnimationFrame(id)
  }, [])

  const applySelection = useCallback((accent: AccentId, hex: string) => {
    const selection = { accentId: accent, customHex: hex }
    writeStoredAccentSelection(selection)
    applyAccentSelectionToDocument(selection)
  }, [])

  const setAccentId = useCallback(
    (next: AccentId) => {
      setAccentIdState(next)
      applySelection(next, customHex)
    },
    [applySelection, customHex],
  )

  const setCustomAccentHex = useCallback(
    (raw: string) => {
      const parsed = parseHexColor(raw)
      if (!parsed) return
      setCustomHexState(parsed)
      setAccentIdState('custom')
      applySelection('custom', parsed)
    },
    [applySelection],
  )

  const value = useMemo(
    () => ({ accentId, customHex, setAccentId, setCustomAccentHex }),
    [accentId, customHex, setAccentId, setCustomAccentHex],
  )

  return <AccentContext.Provider value={value}>{props.children}</AccentContext.Provider>
}

/**
 * Access current accent preset from client components.
 */
export function useAccent(): AccentContextValue {
  const ctx = useContext(AccentContext)
  if (!ctx) {
    throw new Error('useAccent must be used within AccentProvider')
  }
  return ctx
}
