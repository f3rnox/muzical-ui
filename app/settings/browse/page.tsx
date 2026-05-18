import type { Metadata } from 'next'
import BrowseSettingsPanel from '@/components/BrowseSettingsPanel'

export const metadata: Metadata = {
  title: 'Browse · Settings · Muzical',
  description: 'Browse tab defaults for Muzical',
}

export default function BrowseSettingsPage() {
  return <BrowseSettingsPanel />
}
