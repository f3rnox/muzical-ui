'use client'

import { Suspense, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import MusicPlayer from '@/components/MusicPlayer'

type AppShellProps = {
  children: ReactNode
}

/**
 * Keeps the player mounted while route content, like settings, is shown above it.
 */
export default function AppShell(props: AppShellProps) {
  const pathname = usePathname()
  const showRouteOverlay = pathname.startsWith('/settings')

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="absolute inset-0 z-0 flex min-h-0 flex-col">
        <Suspense fallback={null}>
          <MusicPlayer />
        </Suspense>
      </div>
      {showRouteOverlay ? <div className="absolute inset-0 z-10 flex min-h-0 flex-col">{props.children}</div> : null}
    </div>
  )
}
