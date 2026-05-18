import type { Metadata } from 'next'
import YouTubeSettingsPanel from '@/components/YouTubeSettingsPanel'

export const metadata: Metadata = {
  title: 'YouTube · Settings · Muzical',
  description: 'YouTube Data API configuration for Muzical',
}

export default function YoutubeSettingsPage() {
  return <YouTubeSettingsPanel />
}
