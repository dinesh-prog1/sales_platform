'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { subscriptionsApi } from '@/lib/api'

function PaymentFormContent() {
  const params = useSearchParams()

  const [plan, setPlan] = useState<'free' | 'premium'>('premium')
  const [companyName, setCompanyName] = useState(params.get('company_name') || '')
  const [contactPerson, setContactPerson] = useState(params.get('contact_person') || '')
  const [email, setEmail] = useState(params.get('email') || '')
  const [phone, setPhone] = useState('')
  const [numUsers, setNumUsers] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [subscriptionData, setSubscriptionData] = useState<any>(null)

  const trialId = params.get('trial_id') || ''
  const companyId = params.get('company_id') || ''

  const pricePerUser = plan === 'premium' ? 99 : 0
  const totalAmount = numUsers * pricePerUser
  const maxFreeUsers = 10

  const handleNumUsersChange = (val: number) => {
    if (plan === 'free' && val > maxFreeUsers) val = maxFreeUsers
    if (val < 1) val = 1
    setNumUsers(val)
  }

  const handlePlanChange = (newPlan: 'free' | 'premium') => {
    setPlan(newPlan)
    if (newPlan === 'free' && numUsers > maxFreeUsers) {
      setNumUsers(maxFreeUsers)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!companyName.trim() || !contactPerson.trim() || !email.trim()) {
      setError('Please fill in all required fields.')
      return
    }
    setSubmitting(true)
    try {
      const res = await subscriptionsApi.create({
        company_id: companyId || undefined,
        trial_id: trialId || undefined,
        company_name: companyName.trim(),
        contact_person: contactPerson.trim(),
        email: email.trim(),
        phone: phone.trim(),
        plan,
        num_users: numUsers,
      })
      setSubscriptionData(res)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Failed to create subscription. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success && subscriptionData) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-4 py-12">
        <div className="max-w-lg w-full bg-white rounded-3xl shadow-lg border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm uppercase tracking-[0.24em] text-blue-600 font-medium">Employee Galaxy</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Subscription Created!</h1>
          <div className="mt-6 bg-slate-50 rounded-2xl p-5 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Plan</span>
              <span className="font-semibold text-slate-800 capitalize">{subscriptionData.plan}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Users</span>
              <span className="font-semibold text-slate-800">{subscriptionData.num_users}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Price per user</span>
              <span className="font-semibold text-slate-800">Rs. {subscriptionData.price_per_user}/month</span>
            </div>
            <hr className="border-slate-200" />
            <div className="flex justify-between text-base">
              <span className="font-semibold text-slate-700">Total</span>
              <span className="font-bold text-blue-600 text-lg">Rs. {subscriptionData.total_amount}/month</span>
            </div>
          </div>
          <p className="mt-5 text-sm text-slate-500">
            Our team will reach out to you shortly to activate your account.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-sm uppercase tracking-[0.24em] text-blue-600 font-medium">Employee Galaxy</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Choose Your Plan</h1>
          <p className="mt-2 text-slate-500">Select a plan that best fits your organization</p>
        </div>

        {/* Plan Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Free Plan */}
          <button
            type="button"
            onClick={() => handlePlanChange('free')}
            className={`relative text-left rounded-2xl border-2 p-6 transition-all ${
              plan === 'free'
                ? 'border-blue-500 bg-white shadow-lg shadow-blue-100'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            {plan === 'free' && (
              <div className="absolute top-4 right-4 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            <h3 className="text-xl font-bold text-slate-900">Free</h3>
            <div className="mt-2">
              <span className="text-3xl font-bold text-slate-900">Rs. 0</span>
              <span className="text-slate-500 text-sm">/month</span>
            </div>
            <ul className="mt-4 space-y-2.5">
              {[
                'Up to 10 users',
                'Basic attendance tracking',
                'Social feed access',
                'Email support',
              ].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                  <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
          </button>

          {/* Premium Plan */}
          <button
            type="button"
            onClick={() => handlePlanChange('premium')}
            className={`relative text-left rounded-2xl border-2 p-6 transition-all ${
              plan === 'premium'
                ? 'border-blue-500 bg-white shadow-lg shadow-blue-100'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <span className="absolute -top-3 left-6 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-600 text-white">
              Most Popular
            </span>
            {plan === 'premium' && (
              <div className="absolute top-4 right-4 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            <h3 className="text-xl font-bold text-slate-900 mt-1">Premium</h3>
            <div className="mt-2">
              <span className="text-3xl font-bold text-slate-900">Rs. 99</span>
              <span className="text-slate-500 text-sm">/user/month</span>
            </div>
            <ul className="mt-4 space-y-2.5">
              {[
                'Unlimited users',
                'Advanced attendance & leave management',
                'Full social feed features',
                'Payroll management',
                'Priority support',
                'Custom integrations',
              ].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                  <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Subscription Details</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Company Name *</label>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="Your company name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Contact Person *</label>
              <input
                type="text"
                value={contactPerson}
                onChange={e => setContactPerson(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email *</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Number of Users {plan === 'free' && <span className="text-slate-400">(max {maxFreeUsers})</span>}
              </label>
              <input
                type="number"
                min={1}
                max={plan === 'free' ? maxFreeUsers : undefined}
                value={numUsers}
                onChange={e => handleNumUsersChange(parseInt(e.target.value) || 1)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Selected Plan</label>
              <div className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 text-slate-700 font-medium capitalize">
                {plan} — Rs. {pricePerUser}/user/month
              </div>
            </div>
          </div>

          {/* Total calculation */}
          <div className="mt-6 bg-blue-50 rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">
                {numUsers} user{numUsers !== 1 ? 's' : ''} x Rs. {pricePerUser}/month
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {plan === 'free' ? 'Free plan — no charges' : 'Billed monthly'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-700">Rs. {totalAmount.toLocaleString('en-IN')}</p>
              <p className="text-xs text-slate-500">/month</p>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
          >
            {submitting ? 'Creating Subscription...' : `Subscribe — Rs. ${totalAmount.toLocaleString('en-IN')}/month`}
          </button>
        </form>
      </div>
    </main>
  )
}

export default function PaymentFormPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center"><p className="text-slate-500">Loading...</p></main>}>
      <PaymentFormContent />
    </Suspense>
  )
}
