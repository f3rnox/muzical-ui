'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import readStoredDefaultBrowseView from '@/lib/browse/read-stored-default-browse-view'

/**
 * On first load without `?view=`, navigates to the stored default browse tab.
 */
export default function useApplyDefaultBrowseView(): void {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const appliedRef = useRef(false)

  useEffect(() => {
    if (appliedRef.current) return
    appliedRef.current = true
    if (searchParams.has('view')) return
    const defaultView = readStoredDefaultBrowseView()
    if (defaultView === 'library') return
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', defaultView)
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])
}
