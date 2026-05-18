import type { Metadata } from 'next'
import LastfmSettingsPanel from '@/components/LastfmSettingsPanel'

export const metadata: Metadata = {
  title: 'Last.fm · Settings · Muzical',
  description: 'Last.fm API configuration for related song discovery in Muzical',
}

export default function LastfmSettingsPage() {
  return <LastfmSettingsPanel />
}
