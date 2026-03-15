'use client'

import { Bell, User, Search } from 'lucide-react'

interface HeaderProps {
  title?: string
  subtitle?: string
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="top-header shadow-sm">
      <div className="flex-1">
        {title && (
          <div>
            <h1 className="text-white font-semibold text-base leading-tight">{title}</h1>
            {subtitle && <p className="text-blue-200 text-xs">{subtitle}</p>}
          </div>
        )}
        {!title && (
          <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5 max-w-xs">
            <Search className="w-4 h-4 text-blue-200" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent text-white placeholder-blue-200 text-sm outline-none w-full"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button className="relative w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors">
          <Bell className="w-4 h-4 text-white" />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
            3
          </span>
        </button>

        <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1.5 transition-colors">
          <div className="w-7 h-7 bg-white/30 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <span className="text-white text-sm font-medium hidden sm:block">Admin</span>
        </button>
      </div>
    </header>
  )
}
