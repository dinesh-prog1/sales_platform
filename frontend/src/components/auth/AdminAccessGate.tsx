'use client'

import { useEffect, useState } from 'react'
import { adminAuthStorage } from '@/lib/api'

export default function AdminAccessGate({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState('')
  const [ready, setReady] = useState(false)
  const [input, setInput] = useState('')

  useEffect(() => {
    const existing = adminAuthStorage.get()
    setToken(existing)
    setReady(true)
  }, [])

  if (!ready) {
    return <div className="min-h-screen bg-slate-50" />
  }

  if (token) {
    return <>{children}</>
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-6 py-12">
      <div className="max-w-lg w-full rounded-3xl bg-white border border-slate-200 shadow-sm p-8">
        <p className="text-sm uppercase tracking-[0.24em] text-blue-600 font-medium">Admin Access</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Enter your admin API token</h1>
        <p className="mt-4 text-slate-600 leading-7">
          This dashboard now protects admin endpoints. Paste the token from your AWS secret or local environment to continue.
        </p>

        <div className="mt-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Admin token</label>
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste ADMIN_API_TOKEN"
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            const next = input.trim()
            if (!next) return
            window.localStorage.setItem(adminAuthStorage.key, next)
            setToken(next)
          }}
          className="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
        >
          Unlock dashboard
        </button>
      </div>
    </main>
  )
}
