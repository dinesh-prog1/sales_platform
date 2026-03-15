'use client'

import { useEffect, useState, useCallback } from 'react'
import Header from '@/components/layout/Header'
import StatusBadge from '@/components/ui/StatusBadge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { trialsApi, demosApi, companiesApi } from '@/lib/api'
import { Trial } from '@/types'
import { FlaskConical, TrendingUp, XCircle, Clock, AlertTriangle, RefreshCw, CheckCircle, Ban, CalendarCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

interface PendingDemo {
  id: string
  company_id?: string
  company_name?: string
  company_email?: string
  booker_name?: string
  booker_email?: string
  booker_company?: string
  scheduled_at: string
  time_slot?: string
  actioning?: boolean
}

export default function TrialsPage() {
  const [trials, setTrials] = useState<Trial[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  // Post-demo review state
  const [pendingDemos, setPendingDemos] = useState<PendingDemo[]>([])
  const [pendingLoading, setPendingLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [res, statsRes] = await Promise.all([
        trialsApi.list({ page, limit: 15, status: statusFilter }),
        trialsApi.stats(),
      ])
      setTrials(res.trials || [])
      setTotal(res.total || 0)
      setStats(statsRes)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  const loadPendingDemos = useCallback(async () => {
    setPendingLoading(true)
    try {
      // Fetch completed demos that need trial review
      const res = await demosApi.list({ status: 'completed', limit: 50 })
      const demos: PendingDemo[] = (res.demos || res.bookings || []).map((d: any) => ({
        id: d.id,
        company_id: d.company_id || '',
        company_name: d.company_name || d.booker_company || '',
        company_email: d.company_email || d.booker_email || '',
        booker_name: d.booker_name || d.attendee_name || '',
        booker_email: d.booker_email || d.company_email || '',
        booker_company: d.booker_company || d.company_name || '',
        scheduled_at: d.scheduled_at,
        time_slot: d.time_slot || '',
      }))
      setPendingDemos(demos)
    } catch {
      // silently ignore if endpoint doesn't return completed demos
      setPendingDemos([])
    } finally {
      setPendingLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadPendingDemos() }, [loadPendingDemos])

  const handleStartTrial = async (demo: PendingDemo) => {
    setPendingDemos(prev => prev.map(d => d.id === demo.id ? { ...d, actioning: true } : d))
    try {
      await trialsApi.create({
        company_id: demo.company_id || undefined,
        demo_id: demo.id,
        company_name: demo.company_name || demo.booker_company,
        company_email: demo.company_email || demo.booker_email,
      })
      toast.success(`Trial started for ${demo.company_name || demo.booker_company}`)
      setPendingDemos(prev => prev.filter(d => d.id !== demo.id))
      load() // refresh trials list
    } catch (err: any) {
      toast.error(err.message)
      setPendingDemos(prev => prev.map(d => d.id === demo.id ? { ...d, actioning: false } : d))
    }
  }

  const handleMarkDropped = async (demo: PendingDemo) => {
    setPendingDemos(prev => prev.map(d => d.id === demo.id ? { ...d, actioning: true } : d))
    try {
      if (demo.company_id) {
        await companiesApi.updateStatus(demo.company_id, 'dropped', 'No trial started after demo')
      }
      // Also update demo status to dropped/no-trial via demo update
      await demosApi.update(demo.id, { status: 'no_trial' })
      toast.success(`Marked as dropped — ${demo.company_name || demo.booker_company}`)
      setPendingDemos(prev => prev.filter(d => d.id !== demo.id))
    } catch (err: any) {
      toast.error(err.message)
      setPendingDemos(prev => prev.map(d => d.id === demo.id ? { ...d, actioning: false } : d))
    }
  }

  return (
    <>
      <Header title="Trial Management" subtitle="Track free trial lifecycle" />

      <div className="p-6 fade-in">
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {[
              { label: 'Active Trials', value: stats.total_active, icon: FlaskConical, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Converted', value: stats.total_converted, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Dropped', value: stats.total_dropped, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
              { label: 'Expired', value: stats.total_expired, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
              { label: 'Expiring Soon', value: stats.expiring_in_3_days, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
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

        {/* Expiring Soon Alert */}
        {stats?.expiring_in_3_days > 0 && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-amber-800 font-semibold text-sm">
                {stats.expiring_in_3_days} trial{stats.expiring_in_3_days > 1 ? 's' : ''} expiring in 3 days
              </p>
              <p className="text-amber-600 text-xs mt-0.5">
                Reminder emails will be sent automatically
              </p>
            </div>
          </div>
        )}

        {/* Post-Demo Review Section */}
        {!pendingLoading && pendingDemos.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <CalendarCheck className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-semibold text-gray-800">Post-Demo Review</h2>
              <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {pendingDemos.length} pending
              </span>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              These demos have been completed. Did the company start a trial?
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {pendingDemos.map(demo => {
                const displayName = demo.company_name || demo.booker_company || 'Unknown Company'
                const displayEmail = demo.company_email || demo.booker_email || ''
                const displayContact = demo.booker_name || ''
                return (
                  <div
                    key={demo.id}
                    className="bg-white border border-indigo-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-semibold text-gray-800 text-sm">{displayName}</div>
                        {displayContact && (
                          <div className="text-xs text-gray-500 mt-0.5">{displayContact}</div>
                        )}
                        {displayEmail && (
                          <div className="text-xs text-gray-400">{displayEmail}</div>
                        )}
                      </div>
                      <span className="bg-indigo-50 text-indigo-600 text-xs font-medium px-2 py-0.5 rounded-lg whitespace-nowrap ml-2">
                        Demo Done
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mb-4">
                      Held {formatDistanceToNow(new Date(demo.scheduled_at), { addSuffix: true })}
                      {demo.time_slot && (
                        <span className="ml-1 capitalize">· {demo.time_slot}</span>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-gray-600 mb-2">
                      Did this company start a trial?
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStartTrial(demo)}
                        disabled={demo.actioning}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-xs font-medium px-3 py-2 rounded-xl transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        {demo.actioning ? 'Saving...' : 'Yes — Start Trial'}
                      </button>
                      <button
                        onClick={() => handleMarkDropped(demo)}
                        disabled={demo.actioning}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-red-50 hover:text-red-600 disabled:opacity-60 text-gray-600 text-xs font-medium px-3 py-2 rounded-xl transition-colors border border-gray-200 hover:border-red-200"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        {demo.actioning ? 'Saving...' : 'No — Mark Dropped'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="card mb-4">
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none"
            >
              <option value="">All Statuses</option>
              {['active', 'converted', 'expired', 'dropped'].map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <button onClick={load} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 hover:bg-gray-100 px-3 py-2 rounded-xl text-sm text-gray-600 transition-colors">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        {/* Trials Table */}
        <div className="card overflow-hidden p-0">
          {loading ? <LoadingSpinner /> : trials.length === 0 ? (
            <div className="py-16 text-center">
              <FlaskConical className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No trials found</p>
              <p className="text-gray-400 text-sm mt-1">Trials start after demo completion</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Company</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Started</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Expires</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reminder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {trials.map((trial) => {
                  const isExpiringSoon = trial.status === 'active' &&
                    new Date(trial.expires_at) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)

                  return (
                    <tr key={trial.id} className={`hover:bg-blue-50/30 transition-colors ${isExpiringSoon ? 'bg-amber-50/40' : ''}`}>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-gray-800 text-sm">{trial.company_name}</div>
                        <div className="text-gray-400 text-xs">{trial.company_email}</div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-gray-600">
                        {new Date(trial.started_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className={`text-sm font-medium ${isExpiringSoon ? 'text-amber-600' : 'text-gray-600'}`}>
                          {new Date(trial.expires_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(trial.expires_at), { addSuffix: true })}
                        </div>
                      </td>
                      <td className="px-4 py-3.5"><StatusBadge status={trial.status} /></td>
                      <td className="px-4 py-3.5 text-sm text-gray-600">
                        {trial.plan_selected || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-medium ${trial.reminder_sent ? 'text-green-600' : 'text-gray-400'}`}>
                          {trial.reminder_sent ? '✓ Sent' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {total > 15 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-gray-500">
              Showing {(page - 1) * 15 + 1}–{Math.min(page * 15, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * 15 >= total}
                className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
