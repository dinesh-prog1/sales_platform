'use client'

import { useEffect, useState, useCallback } from 'react'
import Header from '@/components/layout/Header'
import StatusBadge from '@/components/ui/StatusBadge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { demosApi } from '@/lib/api'
import { DemoBooking } from '@/types'
import {
  CalendarDays, CalendarCheck, Clock, XCircle, CheckCircle,
  RefreshCw, ExternalLink, User, Link2, CheckSquare, Inbox, Trash2,
} from 'lucide-react'
import toast from 'react-hot-toast'

const SLOT_LABELS: Record<string, string> = {
  morning: '10:00 AM',
  afternoon: '2:00 PM',
  evening: '6:00 PM',
}

// ─── Pending Confirmations ────────────────────────────────────────────────────

function PendingSection({ onConfirmed, onDeleted }: { onConfirmed: () => void; onDeleted: () => void }) {
  const [items, setItems] = useState<DemoBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  // meeting link state keyed by booking id
  const [links, setLinks] = useState<Record<string, string>>({})
  const [confirming, setConfirming] = useState<Record<string, boolean>>({})
  const [deleteTarget, setDeleteTarget] = useState<DemoBooking | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await demosApi.pending({ page, limit: 10 })
      setItems(res.bookings || [])
      setTotal(res.total || 0)
      setTotalPages(res.total_pages || 1)
    } catch {
      /* silently ignore */
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { load() }, [load])

  const handleConfirm = async (id: string) => {
    const link = (links[id] || '').trim()
    if (!link) {
      toast.error('Paste a meeting link first')
      return
    }
    setConfirming(prev => ({ ...prev, [id]: true }))
    try {
      await demosApi.confirm(id, link)
      toast.success('Demo confirmed — confirmation email sent!')
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

  if (!loading && items.length === 0 && total === 0) {
    return null // hide section when nothing pending
  }

  return (
    <div className="card overflow-hidden p-0 mb-6">
      {/* Section header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-amber-100 bg-amber-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
            <Inbox className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">Pending Demo Confirmations</h3>
            <p className="text-xs text-gray-500">Paste a meeting link and confirm to send the email</p>
          </div>
          {total > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
              {total}
            </span>
          )}
        </div>
        <button onClick={load} className="w-8 h-8 bg-white border border-amber-200 rounded-lg flex items-center justify-center hover:bg-amber-50 transition-colors">
          <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Attendee</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date / Slot</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-72">Meeting Link</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map(demo => {
                const name = demo.booker_name || demo.company_name || '—'
                const company = demo.booker_company || demo.company_name || '—'
                const email = demo.booker_email || demo.company_email || '—'
                return (
                  <tr key={demo.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800 text-sm">{name}</div>
                          <div className="text-gray-400 text-xs">{company} · {email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-700 font-medium">
                        {demo.scheduled_at
                          ? new Date(demo.scheduled_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                          : <span className="text-gray-400">Not set</span>}
                      </div>
                      {demo.time_slot && (
                        <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-medium mt-0.5 capitalize">
                          <Clock className="w-3 h-3" />
                          {demo.time_slot} · {SLOT_LABELS[demo.time_slot] || ''}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center text-gray-400">
                          <Link2 className="w-4 h-4" />
                        </div>
                        <input
                          type="url"
                          value={links[demo.id] || ''}
                          onChange={e => setLinks(prev => ({ ...prev, [demo.id]: e.target.value }))}
                          placeholder="https://meet.google.com/..."
                          className="flex-1 min-w-0 text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleConfirm(demo.id)}
                          disabled={confirming[demo.id]}
                          className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          {confirming[demo.id] ? 'Sending…' : 'Confirm & Send'}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(demo)}
                          title="Delete booking"
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <span className="text-sm text-gray-500">
                Showing {((page - 1) * 10) + 1}–{Math.min(page * 10, total)} of {total} pending
              </span>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${p === page ? 'bg-amber-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Delete Booking?</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-1">
              You are about to delete the pending booking for{' '}
              <span className="font-semibold">{deleteTarget.booker_name || deleteTarget.company_name || 'this attendee'}</span>.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              The time slot will be unblocked and available for new bookings. The company status will be reset to <span className="font-medium text-blue-600">Demo Invited</span>.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Deleting…' : 'Delete Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Demo Sessions ────────────────────────────────────────────────────────────

export default function DemosPage() {
  const [demos, setDemos] = useState<DemoBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [viewMode, setViewMode] = useState<'upcoming' | 'all'>('upcoming')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [sessionKey, setSessionKey] = useState(0) // bump to refresh sessions
  const [deleteTarget, setDeleteTarget] = useState<DemoBooking | null>(null)
  const [deleting, setDeleting] = useState(false)

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
  }, [page, statusFilter, viewMode, sessionKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const handleDeleteSession = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await demosApi.delete(deleteTarget.id)
      toast.success('Booking deleted — time slot is now available')
      setDemos(prev => prev.filter(d => d.id !== deleteTarget.id))
      setTotal(prev => Math.max(0, prev - 1))
      setDeleteTarget(null)
      setSessionKey(k => k + 1) // refresh stats
    } catch (err: any) {
      toast.error(err.message || 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Header title="Demo Bookings" subtitle="Manage pending confirmations and track all demo sessions" />

      <div className="p-6 fade-in">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {[
              { label: 'Invited', value: stats.total_invited, icon: CalendarDays, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Scheduled', value: stats.total_scheduled, icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: 'Confirmed', value: stats.total_confirmed, icon: CalendarCheck, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Completed', value: stats.total_completed, icon: CheckCircle, color: 'text-teal-600', bg: 'bg-teal-50' },
              { label: 'Cancelled', value: stats.total_cancelled, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="card flex items-center gap-3">
                <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <div className={`text-xl font-bold ${color}`}>{value ?? 0}</div>
                  <div className="text-xs text-gray-500">{label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pending Confirmations section — hides itself when empty */}
        <PendingSection
          onConfirmed={() => setSessionKey(k => k + 1)}
          onDeleted={() => setSessionKey(k => k + 1)}
        />

        {/* Demo Sessions */}
        <div className="card overflow-hidden p-0">
          {/* Header with filters */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-gray-800">Demo Sessions</h3>
              <div className="flex rounded-lg overflow-hidden border border-gray-200">
                <button
                  onClick={() => { setViewMode('upcoming'); setPage(1) }}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'upcoming' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                  Upcoming
                </button>
                <button
                  onClick={() => { setViewMode('all'); setPage(1) }}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'all' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                  All
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 outline-none">
                <option value="">All Statuses</option>
                {['confirmed', 'completed', 'cancelled', 'no_show'].map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}</option>
                ))}
              </select>
              <button onClick={load} className="w-8 h-8 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
                <RefreshCw className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {loading ? <LoadingSpinner /> : demos.length === 0 ? (
            <div className="py-16 text-center">
              <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">
                {viewMode === 'upcoming' ? 'No upcoming demos' : 'No demo sessions yet'}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Confirmed demos will appear here after you confirm pending bookings above
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Attendee</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Time Slot</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Meeting</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {demos.map((demo) => {
                  const displayName = demo.booker_name || demo.company_name || '—'
                  const displayCompany = demo.booker_company || demo.company_name || '—'
                  const displayEmail = demo.booker_email || demo.company_email || '—'
                  return (
                    <tr key={demo.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800 text-sm">{displayName}</div>
                            <div className="text-gray-400 text-xs">{displayCompany} · {displayEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-600">
                        {demo.scheduled_at
                          ? new Date(demo.scheduled_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                          : <span className="text-gray-400">Not scheduled</span>
                        }
                      </td>
                      <td className="px-4 py-3.5">
                        {demo.time_slot ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-medium capitalize">
                            <Clock className="w-3 h-3" />
                            {demo.time_slot} · {SLOT_LABELS[demo.time_slot] || ''}
                          </span>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3.5"><StatusBadge status={demo.status} /></td>
                      <td className="px-4 py-3.5">
                        {demo.meeting_link ? (
                          <a href={demo.meeting_link} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium">
                            <ExternalLink className="w-3 h-3" /> Join Meet
                          </a>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => setDeleteTarget(demo)}
                          title="Delete booking"
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <span className="text-sm text-gray-500">
                Showing {((page - 1) * 15) + 1}–{Math.min(page * 15, total)} of {total}
              </span>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${p === page ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Delete session confirmation modal */}
        {deleteTarget && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Delete Demo Booking?</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 mb-1">
                You are about to delete the demo session for{' '}
                <span className="font-semibold">{deleteTarget.booker_name || deleteTarget.company_name || 'this attendee'}</span>
                {deleteTarget.scheduled_at && (
                  <> scheduled on{' '}
                    <span className="font-semibold">
                      {new Date(deleteTarget.scheduled_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  </>
                )}.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                The time slot will be unblocked and available for new bookings. The company status will be reset to <span className="font-medium text-blue-600">Demo Invited</span>.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteSession}
                  disabled={deleting}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  {deleting ? 'Deleting…' : 'Delete Booking'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
