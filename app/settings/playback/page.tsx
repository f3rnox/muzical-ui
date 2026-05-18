import type { Metadata } from 'next'
import PlaybackSettingsPanel from '@/components/PlaybackSettingsPanel'

export const metadata: Metadata = {
  title: 'Playback · Settings · Muzical',
  description: 'Playback preferences for Muzical',
}

export default function PlaybackSettingsPage() {
  return <PlaybackSettingsPanel />
}
