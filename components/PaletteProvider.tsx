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
import applyPaletteToDocument from '@/lib/palette/apply-palette-to-document'
import { DEFAULT_PALETTE_ID, type PaletteId } from '@/lib/palette/palette-constants'
import readStoredPaletteId from '@/lib/palette/read-stored-palette-id'
import writeStoredPaletteId from '@/lib/palette/write-stored-palette-id'

type PaletteContextValue = {
  paletteId: PaletteId
  setPaletteId: (next: PaletteId) => void
}

const PaletteContext = createContext<PaletteContextValue | null>(null)

/**
 * Persists the active color palette and keeps document theme tokens in sync.
 */
export function PaletteProvider(props: { children: ReactNode }) {
  const [paletteId, setPaletteIdState] = useState<PaletteId>(DEFAULT_PALETTE_ID)

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const stored = readStoredPaletteId()
      setPaletteIdState(stored)
      applyPaletteToDocument(stored)
    })
    return () => cancelAnimationFrame(id)
  }, [])

  const setPaletteId = useCallback((next: PaletteId) => {
    setPaletteIdState(next)
    writeStoredPaletteId(next)
    applyPaletteToDocument(next)
  }, [])

  const value = useMemo(() => ({ paletteId, setPaletteId }), [paletteId, setPaletteId])

  return <PaletteContext.Provider value={value}>{props.children}</PaletteContext.Provider>
}

/**
 * Access the active color palette from client components.
 */
export function usePalette(): PaletteContextValue {
  const ctx = useContext(PaletteContext)
  if (!ctx) {
    throw new Error('usePalette must be used within PaletteProvider')
  }
  return ctx
}
