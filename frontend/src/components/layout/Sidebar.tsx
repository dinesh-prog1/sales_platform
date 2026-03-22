'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { adminAuthStorage } from '@/lib/api'
import {
  LayoutDashboard, Building2, Mail, CalendarDays,
  FlaskConical, BarChart3, Settings, Zap, LogOut
} from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/companies', label: 'Companies', icon: Building2 },
  { href: '/emails', label: 'Email Campaigns', icon: Mail },
  { href: '/demos', label: 'Demo Bookings', icon: CalendarDays },
  { href: '/trials', label: 'Trials', icon: FlaskConical },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="sidebar">
      {/* Logo + Brand */}
      <div className="flex flex-col items-center pt-5 pb-3 gap-1.5">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center">
          <Image
            src="/icon-exhibix-white.png"
            alt="Exhibix"
            width={40}
            height={40}
            className="w-10 h-10 object-contain"
          />
        </div>
        <span className="brand-text">EXHIBIX</span>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-white/[0.06]" />

      {/* Navigation */}
      <nav className="flex-1 py-4 flex flex-col items-center gap-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link key={href} href={href} className="sidebar-icon-link group" title={label}>
              <div className={clsx(
                'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200',
                isActive
                  ? 'bg-white/[0.08] text-cyan-400'
                  : 'text-white/30 hover:text-white/70 hover:bg-white/[0.04]'
              )}>
                <Icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2 : 1.5} />
              </div>
              {/* Tooltip */}
              <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#161650] text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none shadow-xl border border-white/[0.06] z-[60]">
                {label}
                <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-[#161650] rotate-45 border-l border-b border-white/[0.06]" />
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Bottom — status */}
      <div className="pb-5 flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center group relative">
          <Zap className="w-4 h-4 text-cyan-400/60" />
          <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#161650] text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none shadow-xl border border-white/[0.06] z-[60]">
            Pipeline Active
            <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-[#161650] rotate-45 border-l border-b border-white/[0.06]" />
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            adminAuthStorage.clear()
            window.location.reload()
          }}
          className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center group relative text-white/30 hover:text-white/70 hover:bg-white/[0.04]"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.5} />
          <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#161650] text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none shadow-xl border border-white/[0.06] z-[60]">
            Sign Out
            <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-[#161650] rotate-45 border-l border-b border-white/[0.06]" />
          </div>
        </button>
      </div>
    </div>
  )
}
