import type { Metadata } from 'next'
import './globals.css'
import ConditionalLayout from '@/components/layout/ConditionalLayout'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'EXHIBIX - Sales Automation Platform',
  description: 'EXHIBIX - AI-powered B2B Sales Automation Platform',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              borderRadius: '14px',
              background: '#00002d',
              color: '#fff',
              fontSize: '14px',
              border: '1px solid rgba(0,212,255,0.15)',
            },
          }}
        />
        <ConditionalLayout>{children}</ConditionalLayout>
      </body>
    </html>
  )
}
