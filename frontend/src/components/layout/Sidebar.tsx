'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Building2, Mail, CalendarDays,
  FlaskConical, BarChart3, Settings, Zap, ChevronRight, TrendingUp
} from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/companies', label: 'Companies', icon: Building2 },
  { href: '/emails', label: 'Email Campaigns', icon: Mail },
  { href: '/demos', label: 'Demo Bookings', icon: CalendarDays },
  { href: '/trials', label: 'Trial Management', icon: FlaskConical },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="sidebar">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-tight">AI Sales</div>
            <div className="text-blue-200 text-xs">Automation Platform</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="px-3 mb-2">
          <p className="text-blue-300 text-xs font-semibold uppercase tracking-wider px-3 mb-1">Main Menu</p>
        </div>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link key={href} href={href} className={clsx('sidebar-link', isActive && 'active')}>
              <Icon className="w-4 h-4" />
              <span className="flex-1">{label}</span>
              {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-4 border-t border-white/10">
        <div className="bg-white/10 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-300" />
            <span className="text-white text-xs font-semibold">Pipeline Active</span>
          </div>
          <div className="text-blue-200 text-xs">Automation running</div>
          <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-green-400 rounded-full" style={{ width: '68%' }} />
          </div>
          <div className="text-blue-200 text-xs mt-1">68% efficiency</div>
        </div>
      </div>
    </div>
  )
}
