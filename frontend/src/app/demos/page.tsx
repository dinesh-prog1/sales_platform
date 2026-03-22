'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Header from '@/components/layout/Header'
import StatusBadge from '@/components/ui/StatusBadge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { demosApi, trialsApi } from '@/lib/api'
import { DemoBooking } from '@/types'
import {
  CalendarDays, CalendarCheck, Clock, XCircle, CheckCircle, AlertTriangle,
  RefreshCw, ExternalLink, User, Link2, CheckSquare, Inbox, Trash2, Pencil, X,
  TrendingUp, ArrowRight, Video, Bell, BellOff, ToggleLeft, ToggleRight,
  ChevronDown, Search, CalendarClock,
} from 'lucide-react'
import toast from 'react-hot-toast'

/* ═══════════════ Constants ═══════════════ */

const SLOT_LABELS: Record<string, string> = {
  morning: '10:00 AM',
  afternoon: '2:00 PM',
  evening: '6:00 PM',
}

const SLOT_OPTIONS = [
  { value: 'morning', label: 'Morning — 10:00 AM' },
  { value: 'afternoon', label: 'Afternoon — 2:00 PM' },
  { value: 'evening', label: 'Evening — 6:00 PM' },
]

function detectMeetPlatform(url: string): { label: string; color: string } | null {
  if (!url) return null
  const lower = url.toLowerCase()
  if (lower.includes('meet.google.com')) return { label: 'Google Meet', color: 'text-green-600' }
  if (lower.includes('zoom.us') || lower.includes('zoom.com')) return { label: 'Zoom', color: 'text-blue-600' }
  if (lower.includes('teams.microsoft') || lower.includes('teams.live')) return { label: 'MS Teams', color: 'text-purple-600' }
  if (lower.includes('webex')) return { label: 'Webex', color: 'text-teal-600' }
  return null
}

function isValidMeetingLink(url: string): boolean {
  if (!url.trim()) return false
  try {
    const parsed = new URL(url)
    return ['https:', 'http:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

function formatDemoDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (d.toDateString() === now.toDateString()) return 'Today'
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function daysUntilDemo(dateStr: string | null): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/* ═══════════════ Pending Section ═══════════════ */

function PendingSection({ onConfirmed, onDeleted }: { onConfirmed: () => void; onDeleted: () => void }) {
  const [items, setItems] = useState<DemoBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [links, setLinks] = useState<Record<string, string>>({})
  const [confirming, setConfirming] = useState<Record<string, boolean>>({})
  const [deleteTarget, setDeleteTarget] = useState<DemoBooking | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [autoSendEmail, setAutoSendEmail] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await demosApi.pending({ page, limit: 10 })
      setItems(res.bookings || [])
      setTotal(res.total || 0)
      setTotalPages(res.total_pages || 1)
    } catch { /* silently ignore */ }
    finally { setLoading(false) }
  }, [page])

  useEffect(() => { load() }, [load])

  const handleConfirm = async (id: string) => {
    const link = (links[id] || '').trim()
    if (!link) { toast.error('Paste a meeting link first'); return }
    if (!isValidMeetingLink(link)) { toast.error('Please enter a valid meeting URL (https://...)'); return }
    setConfirming(prev => ({ ...prev, [id]: true }))
    try {
      await demosApi.confirm(id, link)
      toast.success(autoSendEmail ? 'Demo confirmed — confirmation email sent!' : 'Demo confirmed successfully!')
      setItems(prev => prev.filter(b => b.id !== id))
      setTotal(prev => Math.max(0, prev - 1))
      onConfirmed()
    } catch (err: any) {
      toast.error(err.message || 'Confirm failed')
    } finally {
      setConfirming(prev => ({ ...prev, [id]: false }))
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await demosApi.delete(deleteTarget.id)
      toast.success('Booking deleted — time slot is now available')
      setItems(prev => prev.filter(b => b.id !== deleteTarget.id))
      setTotal(prev => Math.max(0, prev - 1))
      setDeleteTarget(null)
      onDeleted()
    } catch (err: any) {
      toast.error(err.message || 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  if (!loading && items.length === 0 && total === 0) return null

  return (
    <div className="card overflow-hidden p-0 border-amber-200">
      {/* Delete modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-semibold text-[#0f172a]">Delete Booking?</h3>
                <p className="text-sm text-[#94a3b8]">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-1">
              Delete pending booking for{' '}
              <span className="font-semibold">{deleteTarget.booker_name || deleteTarget.company_name || 'this attendee'}</span>.
            </p>
            <p className="text-sm text-[#94a3b8] mb-6">
              The time slot will become available again. Company status resets to <span className="font-medium text-blue-600">Demo Invited</span>.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Cancel</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-xl transition-colors">
                <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header with urgency */}
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center relative">
            <AlertTriangle className="w-5 h-5 text-amber-600" strokeWidth={1.5} />
            {total > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                {total}
              </span>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-amber-900 text-[15px]">
              {total === 1 ? '1 demo needs confirmation' : `${total} demos need confirmation`}
            </h3>
            <p className="text-xs text-amber-700/70">Paste a meeting link and confirm to send the invitation email</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Auto-send toggle */}
          <button onClick={() => setAutoSendEmail(!autoSendEmail)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              autoSendEmail ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200'
            }`}
            title={autoSendEmail ? 'Auto-send email enabled' : 'Auto-send email disabled'}
          >
            {autoSendEmail ? <ToggleRight className="w-3.5 h-3.5" strokeWidth={1.5} /> : <ToggleLeft className="w-3.5 h-3.5" strokeWidth={1.5} />}
            Auto email
          </button>
          <button onClick={load} className="w-8 h-8 bg-white border border-amber-200 rounded-lg flex items-center justify-center hover:bg-amber-50 transition-colors">
            <RefreshCw className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {loading ? <LoadingSpinner /> : (
        <>
          <div className="divide-y divide-gray-50">
            {items.map(demo => {
              const name = demo.booker_name || demo.company_name || '—'
              const company = demo.booker_company || demo.company_name || '—'
              const email = demo.booker_email || demo.company_email || '—'
              const linkVal = links[demo.id] || ''
              const platform = detectMeetPlatform(linkVal)
              const days = daysUntilDemo(demo.scheduled_at)

              return (
                <div key={demo.id} className="px-5 py-4 hover:bg-amber-50/30 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Attendee */}
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-white" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-[#0f172a] text-sm">{name}</span>
                        {days !== null && days <= 1 && (
                          <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">URGENT</span>
                        )}
                      </div>
                      <div className="text-xs text-[#94a3b8]">{company} · {email}</div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="inline-flex items-center gap-1 text-xs text-[#475569] font-medium">
                          <CalendarDays className="w-3 h-3" strokeWidth={1.5} />
                          {formatDemoDate(demo.scheduled_at)}
                        </span>
                        {demo.time_slot && (
                          <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-medium capitalize">
                            <Clock className="w-3 h-3" strokeWidth={1.5} />
                            {SLOT_LABELS[demo.time_slot] || demo.time_slot}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Meeting link + actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="relative">
                        <div className="flex items-center gap-1.5">
                          <div className="w-8 h-8 flex items-center justify-center text-[#94a3b8]">
                            <Link2 className="w-4 h-4" strokeWidth={1.5} />
                          </div>
                          <input
                            type="url"
                            value={linkVal}
                            onChange={e => setLinks(prev => ({ ...prev, [demo.id]: e.target.value }))}
                            placeholder="Paste meeting link..."
                            className="w-64 text-sm input-field pr-20"
                          />
                          {platform && (
                            <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium ${platform.color} bg-white px-1.5 py-0.5 rounded`}>
                              {platform.label}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleConfirm(demo.id)}
                        disabled={confirming[demo.id]}
                        className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
                      >
                        <CheckSquare className="w-3.5 h-3.5" strokeWidth={1.5} />
                        {confirming[demo.id] ? 'Sending…' : 'Confirm & Send'}
                      </button>
                      <button onClick={() => setDeleteTarget(demo)} title="Delete"
                        className="w-9 h-9 flex items-center justify-center rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <span className="text-xs text-[#94a3b8]">
                {((page - 1) * 10) + 1}–{Math.min(page * 10, total)} of {total}
              </span>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${p === page ? 'bg-[#00002d] text-cyan-400' : 'text-gray-600 hover:bg-gray-100'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ═══════════════ Post-Demo Review ═══════════════ */

function PostDemoReviewSection({ onAction }: { onAction: () => void }) {
  const [items, setItems] = useState<DemoBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [processing, setProcessing] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await demosApi.pastReview({ page, limit: 10 })
      setItems(res.bookings || [])
      setTotal(res.total || 0)
      setTotalPages(res.total_pages || 1)
    } catch { /* silently ignore */ }
    finally { setLoading(false) }
  }, [page])

  useEffect(() => { load() }, [load])

  const handleTookTrial = async (demo: DemoBooking) => {
    setProcessing(prev => ({ ...prev, [demo.id]: true }))
    try {
      await trialsApi.create({
        company_id: demo.company_id,
        demo_id: demo.id,
        booker_name: demo.booker_name || demo.company_name || '',
        booker_email: demo.booker_email || demo.company_email || '',
        booker_company: demo.booker_company || demo.company_name || '',
      })
      toast.success('Trial started — 14-day free trial activated!')
      setItems(prev => prev.filter(d => d.id !== demo.id))
      setTotal(prev => Math.max(0, prev - 1))
      onAction()
    } catch (err: any) {
      toast.error(err.message || 'Failed to start trial')
    } finally {
      setProcessing(prev => ({ ...prev, [demo.id]: false }))
    }
  }

  const handleNoTrial = async (demo: DemoBooking) => {
    setProcessing(prev => ({ ...prev, [`no_${demo.id}`]: true }))
    try {
      await demosApi.update(demo.id, { status: 'no_trial' })
      toast.success('Marked as no trial')
      setItems(prev => prev.filter(d => d.id !== demo.id))
      setTotal(prev => Math.max(0, prev - 1))
      onAction()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update')
    } finally {
      setProcessing(prev => ({ ...prev, [`no_${demo.id}`]: false }))
    }
  }

  if (!loading && items.length === 0 && total === 0) return null

  return (
    <div className="card overflow-hidden p-0 border-teal-200">
      <div className="flex items-center justify-between px-5 py-4 bg-teal-50 border-b border-teal-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center relative">
            <CheckCircle className="w-5 h-5 text-teal-600" strokeWidth={1.5} />
            {total > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-teal-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                {total}
              </span>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-teal-900 text-[15px]">Post-Demo Review</h3>
            <p className="text-xs text-teal-700/70">Completed demos awaiting trial decision</p>
          </div>
        </div>
        <button onClick={load} className="w-8 h-8 bg-white border border-teal-200 rounded-lg flex items-center justify-center hover:bg-teal-50 transition-colors">
          <RefreshCw className="w-3.5 h-3.5 text-teal-500" strokeWidth={1.5} />
        </button>
      </div>

      {loading ? <LoadingSpinner /> : (
        <>
          <div className="divide-y divide-gray-50">
            {items.map(demo => {
              const name = demo.booker_name || demo.company_name || '—'
              const company = demo.booker_company || demo.company_name || '—'
              const email = demo.booker_email || demo.company_email || '—'
              return (
                <div key={demo.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-teal-50/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-white" strokeWidth={1.5} />
                    </div>
                    <div>
                      <div className="font-semibold text-[#0f172a] text-sm">{name}</div>
                      <div className="text-xs text-[#94a3b8]">{company} · {email}</div>
                    </div>
                    <span className="text-xs text-[#475569] font-medium ml-2">
                      {demo.scheduled_at
                        ? new Date(demo.scheduled_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                        : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleTookTrial(demo)} disabled={processing[demo.id]}
                      className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors">
                      <CheckCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
                      {processing[demo.id] ? 'Starting...' : 'Took Trial'}
                    </button>
                    <button onClick={() => handleNoTrial(demo)} disabled={processing[`no_${demo.id}`]}
                      className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-60 text-gray-700 text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors border border-gray-200">
                      <XCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
                      {processing[`no_${demo.id}`] ? 'Updating...' : 'No Trial'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <span className="text-xs text-[#94a3b8]">{((page - 1) * 10) + 1}–{Math.min(page * 10, total)} of {total}</span>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${p === page ? 'bg-[#00002d] text-cyan-400' : 'text-gray-600 hover:bg-gray-100'}`}>{p}</button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ═══════════════ Conversion Funnel ═══════════════ */

function ConversionFunnel({ stats }: { stats: any }) {
  if (!stats) return null

  const stages = [
    { label: 'Invited', value: stats.total_invited || 0, color: 'bg-blue-500', lightColor: 'bg-blue-50', textColor: 'text-blue-700' },
    { label: 'Scheduled', value: stats.total_scheduled || 0, color: 'bg-indigo-500', lightColor: 'bg-indigo-50', textColor: 'text-indigo-700' },
    { label: 'Confirmed', value: stats.total_confirmed || 0, color: 'bg-green-500', lightColor: 'bg-green-50', textColor: 'text-green-700' },
    { label: 'Completed', value: stats.total_completed || 0, color: 'bg-teal-500', lightColor: 'bg-teal-50', textColor: 'text-teal-700' },
  ]

  const maxVal = Math.max(...stages.map(s => s.value), 1)

  return (
    <div className="card p-4 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-[#94a3b8]" strokeWidth={1.5} />
        <h3 className="text-sm font-semibold text-[#0f172a]">Conversion Funnel</h3>
      </div>
      <div className="flex items-end gap-2 flex-1 min-h-0">
        {stages.map((stage, i) => {
          const heightPct = Math.max((stage.value / maxVal) * 100, 10)
          const dropoff = i > 0 && stages[i - 1].value > 0
            ? Math.round((1 - stage.value / stages[i - 1].value) * 100)
            : null

          return (
            <div key={stage.label} className="flex-1 flex flex-col items-center justify-end h-full">
              {/* Dropoff */}
              {dropoff !== null && dropoff > 0 && (
                <div className="text-[10px] text-red-500 font-semibold mb-1">-{dropoff}%</div>
              )}
              {/* Bar area */}
              <div className="w-full flex-1 flex items-end min-h-0">
                <div
                  className={`w-full ${stage.color} rounded-t-lg transition-all duration-500`}
                  style={{ height: `${heightPct}%`, minHeight: '6px' }}
                />
              </div>
              {/* Value + label */}
              <div className="text-center pt-2">
                <div className={`text-base font-bold ${stage.textColor} leading-tight`}>{stage.value}</div>
                <div className="text-[10px] text-[#475569] font-medium">{stage.label}</div>
              </div>
            </div>
          )
        })}
      </div>
      {/* Conversion rate footer */}
      {stages[0].value > 0 && (
        <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[11px] text-[#94a3b8]">Overall</span>
          <span className="text-xs font-bold text-teal-600">
            {Math.round((stages[3].value / stages[0].value) * 100)}% invited → completed
          </span>
        </div>
      )}
    </div>
  )
}

/* ═══════════════ Main Page ═══════════════ */

export default function DemosPage() {
  const [demos, setDemos] = useState<DemoBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [viewMode, setViewMode] = useState<'upcoming' | 'all'>('upcoming')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<DemoBooking | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editTarget, setEditTarget] = useState<DemoBooking | null>(null)
  const [editForm, setEditForm] = useState({ status: '', meeting_link: '', notes: '', scheduled_at: '', time_slot: '' })
  const [saving, setSaving] = useState(false)
  const [reminder, setReminder] = useState<'1h' | '1d' | 'off'>('1h')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [res, statsRes] = await Promise.all([
        viewMode === 'upcoming'
          ? demosApi.upcoming({ page, limit: 15, status: statusFilter })
          : demosApi.list({ page, limit: 15, status: statusFilter }),
        demosApi.stats(),
      ])
      setDemos(res.bookings || [])
      setTotal(res.total || 0)
      setTotalPages(res.total_pages || 1)
      setStats(statsRes)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, viewMode])

  const openEdit = (demo: DemoBooking) => {
    setEditTarget(demo)
    setEditForm({
      status: demo.status,
      meeting_link: demo.meeting_link || '',
      notes: demo.notes || '',
      scheduled_at: demo.scheduled_at ? new Date(demo.scheduled_at).toISOString().slice(0, 10) : '',
      time_slot: demo.time_slot || 'morning',
    })
  }

  const handleSaveEdit = async () => {
    if (!editTarget) return
    setSaving(true)
    try {
      const slotHour = editForm.time_slot === 'morning' ? 10 : editForm.time_slot === 'afternoon' ? 14 : 18
      const scheduledDate = editForm.scheduled_at ? new Date(`${editForm.scheduled_at}T${slotHour.toString().padStart(2, '0')}:00:00`) : undefined

      await demosApi.update(editTarget.id, {
        status: editForm.status,
        meeting_link: editForm.meeting_link,
        notes: editForm.notes,
        scheduled_at: scheduledDate?.toISOString(),
      })
      await load()
      toast.success('Demo booking updated')
      setEditTarget(null)
    } catch (err: any) {
      toast.error(err.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => { load() }, [load])

  const handleDeleteSession = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await demosApi.delete(deleteTarget.id)
      await load()
      toast.success('Booking deleted')
      setDeleteTarget(null)
    } catch (err: any) {
      toast.error(err.message || 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Header title="Demo Bookings" subtitle="Manage confirmations, track sessions & conversion" />

      <div className="p-7 fade-in space-y-6">
        {/* ═══════ Stats + Funnel — unified row ═══════ */}
        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4 items-stretch">
            {/* Stats Cards — 5 in a compact grid, same card style as funnel */}
            <div className="card p-4 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays className="w-4 h-4 text-[#94a3b8]" strokeWidth={1.5} />
                <h3 className="text-sm font-semibold text-[#0f172a]">Demo Overview</h3>
              </div>
              <div className="grid grid-cols-5 gap-3 flex-1">
                {[
                  { label: 'Invited', value: stats.total_invited, icon: CalendarDays, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Scheduled', value: stats.total_scheduled, icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                  { label: 'Confirmed', value: stats.total_confirmed, icon: CalendarCheck, color: 'text-green-600', bg: 'bg-green-50' },
                  { label: 'Completed', value: stats.total_completed, icon: CheckCircle, color: 'text-teal-600', bg: 'bg-teal-50' },
                  { label: 'Cancelled', value: stats.total_cancelled, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} className="flex flex-col items-center justify-center rounded-xl bg-[#f8f9fc] py-4 px-2 group transition-colors hover:bg-gray-100/80">
                    <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center mb-2 transition-transform group-hover:scale-105`}>
                      <Icon className={`w-[18px] h-[18px] ${color}`} strokeWidth={1.5} />
                    </div>
                    <div className={`text-xl font-bold ${color} leading-tight`}>{value ?? 0}</div>
                    <div className="text-[11px] text-[#475569] font-medium mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Conversion Funnel — same card wrapper, stretches to match */}
            <ConversionFunnel stats={stats} />
          </div>
        )}

        {/* ═══════ Pending Confirmations ═══════ */}
        <PendingSection
          onConfirmed={() => setSessionKey(k => k + 1)}
          onDeleted={() => setSessionKey(k => k + 1)}
        />

        {/* ═══════ Post-Demo Review ═══════ */}
        <PostDemoReviewSection onAction={() => setSessionKey(k => k + 1)} />

        {/* ═══════ Demo Sessions Table ═══════ */}
        <div className="card overflow-hidden p-0">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-[#0f172a]">Demo Sessions</h3>
              <div className="flex rounded-xl overflow-hidden border border-gray-200">
                <button onClick={() => { setViewMode('upcoming'); setPage(1) }}
                  className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${viewMode === 'upcoming' ? 'bg-[#00002d] text-cyan-400' : 'text-gray-600 hover:bg-gray-50'}`}>
                  Upcoming
                </button>
                <button onClick={() => { setViewMode('all'); setPage(1) }}
                  className={`px-3.5 py-1.5 text-xs font-medium transition-colors ${viewMode === 'all' ? 'bg-[#00002d] text-cyan-400' : 'text-gray-600 hover:bg-gray-50'}`}>
                  All
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Reminder preference */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl">
                <Bell className="w-3.5 h-3.5 text-[#94a3b8]" strokeWidth={1.5} />
                <select value={reminder} onChange={e => setReminder(e.target.value as any)}
                  className="text-xs text-[#475569] font-medium bg-transparent border-none outline-none cursor-pointer">
                  <option value="1h">Remind 1h before</option>
                  <option value="1d">Remind 1 day before</option>
                  <option value="off">Reminders off</option>
                </select>
              </div>
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
                className="select-field min-w-[130px]">
                <option value="">All Statuses</option>
                {['confirmed', 'completed', 'cancelled', 'no_show', 'no_trial'].map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}</option>
                ))}
              </select>
              <button onClick={load} title="Refresh"
                className="w-10 h-10 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors">
                <RefreshCw className="w-4 h-4 text-[#475569]" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Content */}
          {loading ? <LoadingSpinner /> : demos.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CalendarDays className="w-8 h-8 text-gray-300" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold text-[#0f172a] mb-1">
                {viewMode === 'upcoming' ? 'No upcoming demos' : 'No demo sessions yet.'}
              </h3>
              <p className="text-sm text-[#475569] max-w-sm mx-auto">
                {viewMode === 'upcoming'
                  ? 'Confirmed demos will appear here. Confirm pending bookings above to get started.'
                  : 'Start by scheduling your first demo. Invite companies from the pipeline and confirm bookings here.'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#475569] uppercase tracking-wider">Attendee</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#475569] uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#475569] uppercase tracking-wider">Time</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#475569] uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#475569] uppercase tracking-wider">Meeting</th>
                  <th className="px-4 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {demos.map((demo) => {
                  const displayName = demo.booker_name || demo.company_name || '—'
                  const displayCompany = demo.booker_company || demo.company_name || '—'
                  const displayEmail = demo.booker_email || demo.company_email || '—'
                  const days = daysUntilDemo(demo.scheduled_at)
                  const platform = detectMeetPlatform(demo.meeting_link || '')

                  return (
                    <tr key={demo.id} className="hover:bg-[#f8f9fc] transition-colors group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-white" strokeWidth={1.5} />
                          </div>
                          <div>
                            <div className="font-semibold text-[#0f172a] text-sm">{displayName}</div>
                            <div className="text-[#94a3b8] text-xs">{displayCompany} · {displayEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[#0f172a] font-medium">{formatDemoDate(demo.scheduled_at)}</span>
                          {days !== null && days >= 0 && days <= 1 && demo.status === 'confirmed' && (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">SOON</span>
                          )}
                        </div>
                        {demo.scheduled_at && (
                          <div className="text-[11px] text-[#94a3b8]">
                            {new Date(demo.scheduled_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {demo.time_slot ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-medium capitalize">
                            <Clock className="w-3 h-3" strokeWidth={1.5} />
                            {SLOT_LABELS[demo.time_slot] || demo.time_slot}
                          </span>
                        ) : <span className="text-[#94a3b8] text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3.5"><StatusBadge status={demo.status} /></td>
                      <td className="px-4 py-3.5">
                        {demo.meeting_link ? (
                          <a href={demo.meeting_link} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline transition-colors group/link">
                            {platform ? (
                              <>
                                <Video className={`w-3.5 h-3.5 ${platform.color}`} strokeWidth={1.5} />
                                <span className={platform.color}>{platform.label}</span>
                              </>
                            ) : (
                              <>
                                <ExternalLink className="w-3.5 h-3.5 text-blue-600" strokeWidth={1.5} />
                                <span className="text-blue-600">Join</span>
                              </>
                            )}
                          </a>
                        ) : <span className="text-[#94a3b8] text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(demo)} title="Edit / Reschedule"
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#475569] hover:text-blue-600 hover:bg-blue-50 transition-colors">
                            <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
                          </button>
                          <button onClick={() => setDeleteTarget(demo)} title="Delete"
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#475569] hover:text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
              <span className="text-xs text-[#94a3b8]">
                {((page - 1) * 15) + 1}–{Math.min(page * 15, total)} of {total}
              </span>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${p === page ? 'bg-[#00002d] text-cyan-400' : 'text-gray-600 hover:bg-gray-100'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ═══════ Delete Session Modal ═══════ */}
        {deleteTarget && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-5 h-5 text-red-600" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-semibold text-[#0f172a]">Delete Demo Booking?</h3>
                  <p className="text-sm text-[#94a3b8]">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 mb-1">
                Delete the demo session for{' '}
                <span className="font-semibold">{deleteTarget.booker_name || deleteTarget.company_name || 'this attendee'}</span>
                {deleteTarget.scheduled_at && (
                  <> on <span className="font-semibold">{new Date(deleteTarget.scheduled_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span></>
                )}.
              </p>
              <p className="text-sm text-[#94a3b8] mb-6">
                The time slot will be freed. Company status resets to <span className="font-medium text-blue-600">Demo Invited</span>.
              </p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Cancel</button>
                <button onClick={handleDeleteSession} disabled={deleting}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-xl transition-colors">
                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ Edit / Reschedule Modal ═══════ */}
        {editTarget && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setEditTarget(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <CalendarClock className="w-5 h-5 text-blue-600" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#0f172a]">Edit / Reschedule Demo</h3>
                    <p className="text-sm text-[#94a3b8]">{editTarget.booker_name || editTarget.company_name || 'Demo'}</p>
                  </div>
                </div>
                <button onClick={() => setEditTarget(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                  <X className="w-4 h-4 text-[#475569]" strokeWidth={1.5} />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-[#0f172a] mb-1.5">Status</label>
                  <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full select-field">
                    {['pending', 'confirmed', 'completed', 'cancelled', 'no_show', 'no_trial'].map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>

                {/* Date & Time Slot (Reschedule) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[#0f172a] mb-1.5">Date</label>
                    <input type="date" value={editForm.scheduled_at}
                      onChange={e => setEditForm(f => ({ ...f, scheduled_at: e.target.value }))}
                      className="w-full input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0f172a] mb-1.5">Time Slot</label>
                    <select value={editForm.time_slot}
                      onChange={e => setEditForm(f => ({ ...f, time_slot: e.target.value }))}
                      className="w-full select-field">
                      {SLOT_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Meeting Link */}
                <div>
                  <label className="block text-sm font-medium text-[#0f172a] mb-1.5">Meeting Link</label>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" strokeWidth={1.5} />
                    <input type="url" value={editForm.meeting_link}
                      onChange={e => setEditForm(f => ({ ...f, meeting_link: e.target.value }))}
                      placeholder="Paste meeting link..."
                      className="w-full input-field pl-10" />
                    {detectMeetPlatform(editForm.meeting_link) && (
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium ${detectMeetPlatform(editForm.meeting_link)!.color}`}>
                        {detectMeetPlatform(editForm.meeting_link)!.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-[#0f172a] mb-1.5">Notes</label>
                  <textarea value={editForm.notes}
                    onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                    rows={3} placeholder="Add any notes..."
                    className="w-full input-field resize-none" />
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 justify-end px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
                <button onClick={() => setEditTarget(null)} disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Cancel</button>
                <button onClick={handleSaveEdit} disabled={saving}
                  className="btn-primary flex items-center gap-2 text-sm disabled:opacity-60">
                  <CheckCircle className="w-4 h-4" strokeWidth={1.5} />
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
