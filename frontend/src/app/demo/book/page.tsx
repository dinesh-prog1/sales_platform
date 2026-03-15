'use client'

import { useState, useEffect, Suspense } from 'react'
import { demosApi } from '@/lib/api'
import { CalendarDays, Clock, User, Mail, Building2, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const TIME_SLOTS = [
  { value: 'morning',   label: 'Morning',   time: '10:00 AM', emoji: '🌅' },
  { value: 'afternoon', label: 'Afternoon', time: '2:00 PM',  emoji: '☀️' },
  { value: 'evening',   label: 'Evening',   time: '6:00 PM',  emoji: '🌆' },
]

function BookingForm() {
  const [form, setForm] = useState({
    full_name: '', company_name: '', email: '',
    demo_date: '', time_slot: '',
  })
  const [takenSlots, setTakenSlots] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [booking, setBooking] = useState<any>(null)

  // When date changes, fetch slot availability
  useEffect(() => {
    if (!form.demo_date) return
    demosApi.slots(form.demo_date)
      .then((data: any) => setTakenSlots(data.taken_slots || []))
      .catch(() => setTakenSlots([]))
  }, [form.demo_date])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.full_name || !form.company_name || !form.email || !form.demo_date || !form.time_slot) {
      toast.error('All fields are required')
      return
    }
    setLoading(true)
    try {
      const result = await demosApi.book(form)
      setBooking(result)
      setSubmitted(true)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (submitted && booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Demo Confirmed!</h2>
          <p className="text-gray-500 mb-6">Your demo session has been successfully booked.</p>

          <div className="bg-blue-50 rounded-xl p-4 text-left space-y-3 mb-6">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="text-gray-600">Name:</span>
              <span className="font-semibold text-gray-800">{form.full_name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="text-gray-600">Company:</span>
              <span className="font-semibold text-gray-800">{form.company_name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="text-gray-600">Date:</span>
              <span className="font-semibold text-gray-800">{form.demo_date}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="text-gray-600">Time:</span>
              <span className="font-semibold text-gray-800">
                {TIME_SLOTS.find(s => s.value === form.time_slot)?.label} — {TIME_SLOTS.find(s => s.value === form.time_slot)?.time}
              </span>
            </div>
          </div>

          {booking.meeting_link && (
            <a href={booking.meeting_link} target="_blank" rel="noopener noreferrer"
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-semibold text-sm transition-colors">
              Join Google Meet
            </a>
          )}
          <p className="text-xs text-gray-400 mt-4">A confirmation email has been sent to {form.email}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-7">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CalendarDays className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Book a Product Demo</h1>
          <p className="text-gray-500 text-sm mt-2">Choose a date and time that works for you. We'll send a Google Meet link.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="Your full name"
                className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                required />
            </div>
          </div>

          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Name *</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={form.company_name}
                onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                placeholder="Your company name"
                className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                required />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@company.com"
                className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                required />
            </div>
          </div>

          {/* Demo Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Demo Date *</label>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="date" value={form.demo_date}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => { setForm(f => ({ ...f, demo_date: e.target.value, time_slot: '' })) }}
                className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                required />
            </div>
          </div>

          {/* Time Slot */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Demo Time Slot *</label>
            <div className="grid grid-cols-3 gap-2">
              {TIME_SLOTS.map(slot => {
                const isTaken = takenSlots.includes(slot.value)
                const isSelected = form.time_slot === slot.value
                return (
                  <button
                    key={slot.value}
                    type="button"
                    disabled={isTaken}
                    onClick={() => !isTaken && setForm(f => ({ ...f, time_slot: slot.value }))}
                    className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all text-sm font-medium
                      ${isTaken
                        ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                        : isSelected
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-blue-300 text-gray-700 hover:bg-blue-50'
                      }`}
                  >
                    <span className="text-xl mb-1">{slot.emoji}</span>
                    <span>{slot.label}</span>
                    <span className="text-xs opacity-75">{slot.time}</span>
                    {isTaken && <span className="text-xs text-red-400 mt-0.5">Booked</span>}
                  </button>
                )
              })}
            </div>
            {form.demo_date && takenSlots.length === 3 && (
              <p className="text-red-500 text-xs mt-2">All slots are booked for this date. Please choose another date.</p>
            )}
          </div>

          <button type="submit" disabled={loading || !form.time_slot}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl py-3 font-semibold text-sm transition-colors mt-2">
            {loading ? 'Booking...' : 'Confirm Demo Booking'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function DemoBookPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <BookingForm />
    </Suspense>
  )
}
