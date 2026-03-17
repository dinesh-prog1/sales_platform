'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { emailsApi } from '@/lib/api'

function InterestRespondContent() {
  const params = useSearchParams()
  const [message, setMessage] = useState('Recording your response...')
  const called = useRef(false)

  // Extract to primitives so the effect dep array uses stable string values
  // rather than the SearchParams object reference (which changes every render).
  const companyId = params.get('company_id') || ''
  const action = params.get('action') || ''

  useEffect(() => {
    if (called.current) return
    called.current = true

    emailsApi.respondOutreach({ company_id: companyId, action })
      .then(() => {
        setMessage(
          action === 'interested'
            ? 'Thanks for your interest. We have sent a follow-up email with the demo scheduling form.'
            : 'Your preference has been recorded. We will stop this outreach sequence.'
        )
      })
      .catch((err) => setMessage(err.message))
  }, [companyId, action])

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="max-w-xl rounded-3xl bg-white border border-slate-200 shadow-sm p-8 text-center">
        <p className="text-sm uppercase tracking-[0.24em] text-sky-600">Employee Galaxy</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Thank you</h1>
        <p className="mt-4 text-slate-600 leading-7">{message}</p>
      </div>
    </main>
  )
}

export default function InterestRespondPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-50 flex items-center justify-center px-6">Loading...</main>}>
      <InterestRespondContent />
    </Suspense>
  )
}
