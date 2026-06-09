import type { Metadata } from 'next'
import LastfmSettingsPanel from '@/components/LastfmSettingsPanel'

export const metadata: Metadata = {
  title: 'Last.fm · Settings · Muzical',
  description: 'Last.fm API key, shared secret and scrobbling configuration',
}

export default function LastfmSettingsPage() {
  return <LastfmSettingsPanel />
}
