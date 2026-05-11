import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Script from 'next/script'
import { LibraryProvider } from '@/components/LibraryProvider'
import { ThemeProvider } from '@/components/ThemeProvider'
import { getThemeInitScript } from '@/lib/theme-init-script'
import './globals.css'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'Muzical',
  description: 'Local music player',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full min-h-0 antialiased`}
    >
      <body className="flex h-full min-h-0 flex-col overflow-hidden bg-background font-sans text-foreground">
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: getThemeInitScript() }}
        />
        <div className="flex min-h-0 flex-1 flex-col">
          <ThemeProvider>
            <LibraryProvider>{children}</LibraryProvider>
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
