'use client'

import { usePathname } from 'next/navigation'
import AdminAccessGate from '@/components/auth/AdminAccessGate'
import Sidebar from '@/components/layout/Sidebar'

// These paths are public-facing (outside companies) — no platform sidebar
const PUBLIC_PREFIXES = ['/demo/', '/interest/', '/trial/', '/payment/']

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublic = PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))

  if (isPublic) {
    return <>{children}</>
  }

  return (
    <AdminAccessGate>
      <div className="flex">
        <Sidebar />
        <main className="main-content flex-1">
          {children}
        </main>
      </div>
    </AdminAccessGate>
  )
}
