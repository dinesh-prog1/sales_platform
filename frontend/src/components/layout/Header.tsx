'use client'

import { Bell, User, Search, Command } from 'lucide-react'

interface HeaderProps {
  title?: string
  subtitle?: string
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="top-header">
      <div className="flex-1 flex items-center gap-4">
        {title && (
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-[#0f172a] font-semibold text-base leading-tight tracking-[-0.02em]">{title}</h1>
              {subtitle && <p className="text-[#94a3b8] text-[11px] mt-0.5 font-normal">{subtitle}</p>}
            </div>
          </div>
        )}

        {/* Search — always visible */}
        <div className="flex items-center gap-2 bg-[#f8f9fc] border border-[#e5e7eb] rounded-xl px-3 py-[7px] w-64 ml-auto group focus-within:border-[#00d4ff] focus-within:ring-2 focus-within:ring-[rgba(0,212,255,0.06)] transition-all">
          <Search className="w-3.5 h-3.5 text-[#94a3b8] group-focus-within:text-[#00d4ff] transition-colors flex-shrink-0" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent text-[#0f172a] placeholder-[#94a3b8] text-[13px] outline-none w-full"
          />
          <kbd className="hidden sm:flex items-center gap-0.5 text-[9px] text-[#94a3b8] bg-white border border-[#e5e7eb] rounded px-1.5 py-0.5 font-medium flex-shrink-0">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-4">
        <button className="relative w-8 h-8 bg-[#f8f9fc] border border-[#e5e7eb] rounded-lg flex items-center justify-center hover:bg-[#f1f5f9] hover:border-[#cbd5e1] transition-all">
          <Bell className="w-3.5 h-3.5 text-[#475569]" strokeWidth={1.5} />
          <span className="absolute -top-0.5 -right-0.5 w-[13px] h-[13px] bg-[#00d4ff] rounded-full text-[#00002d] text-[7px] flex items-center justify-center font-bold">
            3
          </span>
        </button>

        <button className="flex items-center gap-2 bg-[#f8f9fc] border border-[#e5e7eb] hover:bg-[#f1f5f9] hover:border-[#cbd5e1] rounded-lg px-2 py-1 transition-all">
          <div className="w-6 h-6 bg-[#00002d] rounded-md flex items-center justify-center">
            <User className="w-3 h-3 text-cyan-400" strokeWidth={1.5} />
          </div>
          <span className="text-[#475569] text-[13px] font-medium hidden sm:block">Admin</span>
        </button>
      </div>
    </header>
  )
}
