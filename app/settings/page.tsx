import type { Metadata } from 'next'
import LibrarySettingsPage from '@/components/LibrarySettingsPage'

export const metadata: Metadata = {
  title: 'Library · Muzical',
  description: 'Configure local music library scan folders',
}

export default function SettingsRoute() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <LibrarySettingsPage />
    </div>
  )
}
