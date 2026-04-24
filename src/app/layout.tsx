import type { Metadata } from 'next'
import { Noto_Sans_TC } from 'next/font/google'
import { getLocale, getMessages } from 'next-intl/server'
import './globals.css'

const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-noto-sans-tc',
})
import { ThemeProvider } from '@/components/layout/theme-provider'
import { ErrorLogger } from '@/components/ErrorLogger'
import { DevDatabaseBadge } from '@/components/dev-database-badge'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AppInitializer } from '@/components/AppInitializer'
import { GlobalDialogs } from '@/lib/ui/alert-dialog'
import { SWRProvider } from '@/lib/swr'
import { ReactQueryProvider } from '@/lib/react-query/provider'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { IntlProvider } from '@/components/providers/IntlProvider'
import { Toaster } from 'sonner'
import { LAYOUT_LABELS } from './constants/labels'

export const dynamic = 'force-dynamic'
export const dynamicParams = true

export const metadata: Metadata = {
  title: LAYOUT_LABELS.TITLE,
  description: LAYOUT_LABELS.DESCRIPTION,
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} className={notoSansTC.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased font-sans">
        <ErrorLogger />
        <GlobalDialogs />
        <Toaster position="top-right" richColors closeButton />
        <IntlProvider locale={locale} messages={messages}>
          <AppInitializer>
            <ErrorBoundary>
              <ReactQueryProvider>
                <SWRProvider>
                  <ThemeProvider>{children}</ThemeProvider>
                </SWRProvider>
              </ReactQueryProvider>
            </ErrorBoundary>
          </AppInitializer>
        </IntlProvider>
        <DevDatabaseBadge />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
