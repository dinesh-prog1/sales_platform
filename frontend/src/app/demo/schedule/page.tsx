'use client'

import { FormEvent, Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { demosApi } from '@/lib/api'

function DemoScheduleContent() {
  const params = useSearchParams()
  const companyId = params.get('company_id') || ''
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    preferred_date: '',
    message: '',
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await demosApi.publicSchedule({
        company_id: companyId,
        name: form.name,
        email: form.email,
        preferred_date: form.preferred_date ? new Date(form.preferred_date).toISOString() : '',
        message: form.message,
      })
      setSubmitted(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-6">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white border border-slate-200 shadow-sm p-8">
        <p className="text-sm uppercase tracking-[0.24em] text-sky-600">Employee Galaxy</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Schedule a product walkthrough</h1>
        <p className="mt-3 text-slate-600 leading-7">
          Share your preferred time and any context about your HR, payroll, attendance, or workforce operations process.
        </p>

        {submitted ? (
          <div className="mt-8 rounded-2xl bg-emerald-50 border border-emerald-100 p-5 text-emerald-700">
            Thanks. Your meeting request has been recorded in AI Sales and the team will follow up shortly.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Your name"
              className="border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-sky-400"
            />
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Work email"
              className="border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-sky-400"
            />
            <input
              type="datetime-local"
              value={form.preferred_date}
              onChange={(e) => setForm({ ...form, preferred_date: e.target.value })}
              className="border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-sky-400 md:col-span-2"
            />
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="What would you like the demo to focus on?"
              className="border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-sky-400 md:col-span-2 min-h-36"
            />
            <button
              type="submit"
              disabled={saving || !companyId}
              className="md:col-span-2 rounded-2xl bg-sky-600 text-white px-4 py-3 text-sm font-medium hover:bg-sky-700 disabled:opacity-60"
            >
              {saving ? 'Submitting...' : 'Submit demo request'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}

export default function DemoSchedulePage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-50 flex items-center justify-center px-6">Loading...</main>}>
      <DemoScheduleContent />
    </Suspense>
  )
}
