import type { Metadata } from 'next'
import SettingsShell from '@/components/SettingsShell'

export const metadata: Metadata = {
  title: 'Settings · Muzical',
  description: 'Configure Muzical on this device',
}

export default function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <SettingsShell>{children}</SettingsShell>
    </div>
  )
}
