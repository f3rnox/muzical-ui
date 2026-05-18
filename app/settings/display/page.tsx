import type { Metadata } from 'next'
import DisplaySettingsPanel from '@/components/DisplaySettingsPanel'

export const metadata: Metadata = {
  title: 'Display · Settings · Muzical',
  description: 'Display preferences for Muzical',
}

export default function DisplaySettingsPage() {
  return <DisplaySettingsPanel />
}
