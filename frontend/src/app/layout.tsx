import type { Metadata } from 'next'
import './globals.css'
import ConditionalLayout from '@/components/layout/ConditionalLayout'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'AI Sales Platform',
  description: 'AI-powered B2B Sales Automation Platform',
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
              borderRadius: '12px',
              background: '#1e293b',
              color: '#fff',
              fontSize: '14px',
            },
          }}
        />
        <ConditionalLayout>{children}</ConditionalLayout>
      </body>
    </html>
  )
}
