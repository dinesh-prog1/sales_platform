'use client'

import { useEffect, useState } from 'react'
import { adminAuthStorage, api } from '@/lib/api'
import toast from 'react-hot-toast'

export default function AdminAccessGate({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState('')
  const [ready, setReady] = useState(false)
  const [email, setEmail] = useState('admin@localhost')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Sign in to your admin dashboard</h1>
        <p className="mt-4 text-slate-600 leading-7">
          Use your admin email and password to start a secure JWT session for the platform.
        </p>

        <div className="mt-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Admin email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@localhost"
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter admin password"
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <button
          type="button"
          onClick={async () => {
            const nextEmail = email.trim()
            const nextPassword = password.trim()
            if (!nextEmail || !nextPassword) {
              toast.error('Enter your admin email and password.')
              return
            }

            try {
              setSubmitting(true)
              const response = await api.post('/auth/login', {
                email: nextEmail,
                password: nextPassword,
              })
              const nextToken = response.data?.token
              if (!nextToken) {
                throw new Error('Login succeeded but no session token was returned.')
              }
              adminAuthStorage.set(nextToken)
              setToken(nextToken)
              setPassword('')
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Login failed'
              toast.error(message)
            } finally {
              setSubmitting(false)
            }
          }}
          disabled={submitting}
          className="mt-5 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
        >
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
      </div>
    </main>
  )
}
