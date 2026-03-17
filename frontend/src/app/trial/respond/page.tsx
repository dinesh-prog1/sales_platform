'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { trialsApi } from '@/lib/api'

function TrialRespondContent() {
  const params = useSearchParams()
  const router = useRouter()
  const [message, setMessage] = useState('Processing your response...')
  const [redirecting, setRedirecting] = useState(false)
  const called = useRef(false)

  const trialId = params.get('trial_id') || ''
  const action = params.get('action') || ''

  useEffect(() => {
    if (called.current) return
    called.current = true

    if (!trialId || !action) {
      setMessage('Invalid link — missing parameters.')
      return
    }

    trialsApi.respond({ trial_id: trialId, action })
      .then((res: any) => {
        if (action === 'interested' && res.redirect) {
          setMessage('Thank you for your interest! Redirecting to plan selection...')
          setRedirecting(true)
          setTimeout(() => {
            const url = new URL(res.redirect, window.location.origin)
            // Add any extra params from the response
            if (res.company_name) url.searchParams.set('company_name', res.company_name)
            if (res.email) url.searchParams.set('email', res.email)
            if (res.contact_person) url.searchParams.set('contact_person', res.contact_person)
            if (res.trial_id) url.searchParams.set('trial_id', res.trial_id)
            if (res.company_id) url.searchParams.set('company_id', res.company_id)
            router.push(url.pathname + url.search)
          }, 1500)
        } else if (action === 'interested') {
          setMessage('Thank you for your interest! Redirecting to plan selection...')
          setRedirecting(true)
          // Fallback: build URL from response data
          const qs = new URLSearchParams()
          if (res.trial_id || trialId) qs.set('trial_id', res.trial_id || trialId)
          if (res.company_id) qs.set('company_id', res.company_id)
          if (res.company_name) qs.set('company_name', res.company_name)
          if (res.email) qs.set('email', res.email)
          if (res.contact_person) qs.set('contact_person', res.contact_person)
          setTimeout(() => router.push(`/payment/form?${qs.toString()}`), 1500)
        } else {
          setMessage('Your preference has been recorded. Thank you for trying our platform.')
        }
      })
      .catch((err) => setMessage(err.message || 'Something went wrong. Please try again.'))
  }, [trialId, action, router])

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-6">
      <div className="max-w-xl rounded-3xl bg-white border border-slate-200 shadow-sm p-8 text-center">
        <p className="text-sm uppercase tracking-[0.24em] text-blue-600 font-medium">Employee Galaxy</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">
          {action === 'interested' ? 'Welcome Back!' : 'Thank You'}
        </h1>
        <p className="mt-4 text-slate-600 leading-7">{message}</p>
        {redirecting && (
          <div className="mt-6 flex items-center justify-center gap-2 text-blue-600">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm font-medium">Redirecting...</span>
          </div>
        )}
      </div>
    </main>
  )
}

export default function TrialRespondPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-6"><p className="text-slate-500">Loading...</p></main>}>
      <TrialRespondContent />
    </Suspense>
  )
}
