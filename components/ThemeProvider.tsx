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
import type { ColorScheme } from '@/lib/theme-constants'
import { THEME_STORAGE_KEY } from '@/lib/theme-constants'

type ThemeContextValue = {
  scheme: ColorScheme
  setScheme: (next: ColorScheme) => void
  toggleScheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applySchemeToDocument(scheme: ColorScheme): void {
  document.documentElement.classList.toggle('dark', scheme === 'dark')
}

/**
 * Persists light/dark choice and keeps `document.documentElement` in sync with Tailwind `dark:` variants.
 */
export function ThemeProvider(props: { children: ReactNode }) {
  const [scheme, setSchemeState] = useState<ColorScheme>('light')

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const raw = localStorage.getItem(THEME_STORAGE_KEY)
      const next: ColorScheme = raw === 'dark' ? 'dark' : 'light'
      setSchemeState(next)
      applySchemeToDocument(next)
    })
    return () => cancelAnimationFrame(id)
  }, [])

  const setScheme = useCallback((next: ColorScheme) => {
    setSchemeState(next)
    localStorage.setItem(THEME_STORAGE_KEY, next)
    applySchemeToDocument(next)
  }, [])

  const toggleScheme = useCallback(() => {
    setSchemeState((prev) => {
      const next: ColorScheme = prev === 'light' ? 'dark' : 'light'
      localStorage.setItem(THEME_STORAGE_KEY, next)
      applySchemeToDocument(next)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ scheme, setScheme, toggleScheme }),
    [scheme, setScheme, toggleScheme],
  )

  return <ThemeContext.Provider value={value}>{props.children}</ThemeContext.Provider>
}

/**
 * Access current theme and toggles from client components.
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return ctx
}
