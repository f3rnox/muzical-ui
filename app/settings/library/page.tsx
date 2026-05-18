import type { Metadata } from 'next'
import LibrarySettingsPanel from '@/components/LibrarySettingsPanel'

export const metadata: Metadata = {
  title: 'Library · Settings · Muzical',
  description: 'Configure local music library scan folders',
}

export default function LibrarySettingsPage() {
  return <LibrarySettingsPanel />
}
