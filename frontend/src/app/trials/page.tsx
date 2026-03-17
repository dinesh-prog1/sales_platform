'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Header from '@/components/layout/Header'
import StatusBadge from '@/components/ui/StatusBadge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { trialsApi, demosApi, companiesApi } from '@/lib/api'
import { Trial } from '@/types'
import {
  FlaskConical, TrendingUp, XCircle, Clock, AlertTriangle, RefreshCw,
  CheckCircle, Ban, CalendarCheck, Pencil, X, Search, Bell, BellRing,
  ArrowRight, Zap, Timer, Crown, Shield, ChevronDown, ChevronRight,
  BarChart3, Activity, Send, Filter, Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDistanceToNow, differenceInDays, differenceInHours, format, isToday, isTomorrow } from 'date-fns'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_PRIORITY: Record<string, number> = {
  active: 0,
  expired: 1,
  dropped: 2,
  converted: 3,
}

const LIFECYCLE_STAGES = [
  { key: 'demo', label: 'Demo', icon: CalendarCheck, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  { key: 'trial', label: 'Trial Started', icon: FlaskConical, color: 'text-cyan-600', bg: 'bg-cyan-100' },
  { key: 'active', label: 'Active', icon: Activity, color: 'text-green-600', bg: 'bg-green-100' },
  { key: 'outcome', label: 'Outcome', icon: Sparkles, color: 'text-amber-600', bg: 'bg-amber-100' },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getExpiryUrgency(expiresAt: string, status: string) {
  if (status !== 'active') return { label: '', color: '', bgRow: '', days: 999 }
  const days = differenceInDays(new Date(expiresAt), new Date())
  if (days < 0) return { label: 'EXPIRED', color: 'text-red-600', bgRow: 'bg-red-50/50', days }
  if (days <= 3) return { label: `${days}d left`, color: 'text-red-600', bgRow: 'bg-red-50/40', days }
  if (days <= 7) return { label: `${days}d left`, color: 'text-orange-500', bgRow: 'bg-orange-50/30', days }
  return { label: `${days}d left`, color: 'text-green-600', bgRow: '', days }
}

function smartDate(d: string) {
  const date = new Date(d)
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  return format(date, 'MMM d, yyyy')
}

function getTrialLifecycleStage(trial: Trial): number {
  if (trial.status === 'converted' || trial.status === 'dropped' || trial.status === 'expired') return 3
  if (trial.status === 'active') return 2
  return 1
}

/* ------------------------------------------------------------------ */
/*  Component: LifecycleBar                                           */
/* ------------------------------------------------------------------ */

function LifecycleBar({ trial }: { trial: Trial }) {
  const currentStage = getTrialLifecycleStage(trial)
  const outcomeColor = trial.status === 'converted' ? 'bg-green-500' : trial.status === 'dropped' ? 'bg-red-400' : trial.status === 'expired' ? 'bg-orange-400' : 'bg-gray-200'
  const outcomeLabel = trial.status === 'converted' ? 'Converted' : trial.status === 'dropped' ? 'Dropped' : trial.status === 'expired' ? 'Expired' : 'Pending'

  return (
    <div className="flex items-center gap-1">
      {LIFECYCLE_STAGES.map((stage, i) => {
        const isReached = i <= currentStage
        const isCurrent = i === currentStage
        const dotColor = i === 3
          ? (isReached ? outcomeColor : 'bg-gray-200')
          : (isReached ? 'bg-cyan-500' : 'bg-gray-200')
        return (
          <div key={stage.key} className="flex items-center gap-1">
            <div className="flex flex-col items-center" title={i === 3 ? outcomeLabel : stage.label}>
              <div className={`w-2 h-2 rounded-full ${dotColor} ${isCurrent ? 'ring-2 ring-offset-1 ring-cyan-300' : ''}`} />
            </div>
            {i < LIFECYCLE_STAGES.length - 1 && (
              <div className={`w-4 h-0.5 ${isReached && i < currentStage ? 'bg-cyan-400' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Component: ConversionInsights                                      */
/* ------------------------------------------------------------------ */

function ConversionInsights({ stats }: { stats: any }) {
  if (!stats) return null
  const total = (stats.total_active || 0) + (stats.total_converted || 0) + (stats.total_expired || 0) + (stats.total_dropped || 0)
  const convRate = total > 0 ? ((stats.total_converted || 0) / total * 100).toFixed(1) : '0.0'
  const dropRate = total > 0 ? (((stats.total_dropped || 0) + (stats.total_expired || 0)) / total * 100).toFixed(1) : '0.0'
  const activeRate = total > 0 ? ((stats.total_active || 0) / total * 100).toFixed(1) : '0.0'

  const stages = [
    { label: 'Active', count: stats.total_active || 0, pct: activeRate, color: 'bg-cyan-500', text: 'text-cyan-600' },
    { label: 'Converted', count: stats.total_converted || 0, pct: convRate, color: 'bg-green-500', text: 'text-green-600' },
    { label: 'Lost', count: (stats.total_dropped || 0) + (stats.total_expired || 0), pct: dropRate, color: 'bg-red-400', text: 'text-red-500' },
  ]

  return (
    <div className="card !py-3 !px-4 h-full flex flex-col">
      <div className="flex items-center gap-1.5 mb-2">
        <BarChart3 className="w-3.5 h-3.5 text-[#475569]" strokeWidth={1.5} />
        <h3 className="text-xs font-semibold text-[#0f172a]">Conversion Insights</h3>
      </div>
      <div className="flex-1 flex flex-col justify-center space-y-2.5">
        {/* Funnel bar */}
        <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100">
          {stages.filter(s => s.count > 0).map(s => (
            <div key={s.label} className={`${s.color} transition-all`} style={{ width: `${s.pct}%` }} title={`${s.label}: ${s.count}`} />
          ))}
        </div>
        {/* Legend */}
        <div className="grid grid-cols-3 gap-1">
          {stages.map(s => (
            <div key={s.label} className="text-center">
              <div className={`text-base font-bold leading-tight ${s.text}`}>{s.count}</div>
              <div className="text-[9px] text-[#94a3b8] uppercase tracking-wider leading-none">{s.label}</div>
              <div className="text-[10px] text-[#475569] font-medium">{s.pct}%</div>
            </div>
          ))}
        </div>
        {/* Overall conversion */}
        <div className="pt-2 border-t border-gray-100 text-center">
          <span className="text-[10px] text-[#94a3b8]">Conversion Rate</span>
          <div className="text-xl font-bold text-green-600 leading-tight">{convRate}%</div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function TrialsPage() {
  const [trials, setTrials] = useState<Trial[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'expiry' | 'priority'>('priority')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  // Edit state
  const [editTarget, setEditTarget] = useState<Trial | null>(null)
  const [editForm, setEditForm] = useState({ status: '', plan_selected: '' })
  const [saving, setSaving] = useState(false)

  // Post-demo review
  const [pendingDemos, setPendingDemos] = useState<PendingDemo[]>([])
  const [pendingLoading, setPendingLoading] = useState(true)
  const [pendingCollapsed, setPendingCollapsed] = useState(false)

  // Expiring soon section
  const [expiringSoonCollapsed, setExpiringSoonCollapsed] = useState(false)

  const openEditTrial = (trial: Trial) => {
    setEditTarget(trial)
    setEditForm({ status: trial.status, plan_selected: trial.plan_selected || '' })
  }

  const handleSaveEditTrial = async () => {
    if (!editTarget) return
    setSaving(true)
    try {
      await trialsApi.update(editTarget.id, {
        status: editForm.status,
        plan_selected: editForm.plan_selected,
      })
      toast.success('Trial updated')
      setEditTarget(null)
      load()
    } catch (err: any) {
      toast.error(err.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [res, statsRes] = await Promise.all([
        trialsApi.list({ page, limit: 50, status: statusFilter }),
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
      setPendingDemos([])
    } finally {
      setPendingLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadPendingDemos() }, [loadPendingDemos])

  /* ---- Actions ---- */
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
      load()
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
      await demosApi.update(demo.id, { status: 'no_trial' })
      toast.success(`Marked as dropped — ${demo.company_name || demo.booker_company}`)
      setPendingDemos(prev => prev.filter(d => d.id !== demo.id))
    } catch (err: any) {
      toast.error(err.message)
      setPendingDemos(prev => prev.map(d => d.id === demo.id ? { ...d, actioning: false } : d))
    }
  }

  const handleQuickConvert = async (trial: Trial) => {
    try {
      await trialsApi.update(trial.id, { status: 'converted', plan_selected: trial.plan_selected || 'premium' })
      toast.success(`${trial.company_name || 'Trial'} converted!`)
      load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleQuickDrop = async (trial: Trial) => {
    try {
      await trialsApi.update(trial.id, { status: 'dropped' })
      toast.success(`${trial.company_name || 'Trial'} marked as dropped`)
      load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleSendReminder = async (trial: Trial) => {
    try {
      // Use the existing emails API to send a trial reminder
      await trialsApi.update(trial.id, { status: trial.status })
      toast.success(`Reminder queued for ${trial.company_name}`)
      load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  /* ---- Filtered + sorted trials ---- */
  const filteredTrials = useMemo(() => {
    let list = [...trials]

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(t =>
        (t.company_name || '').toLowerCase().includes(q) ||
        (t.company_email || '').toLowerCase().includes(q) ||
        (t.booker_name || '').toLowerCase().includes(q) ||
        (t.booker_company || '').toLowerCase().includes(q)
      )
    }

    // Sort
    if (sortBy === 'priority') {
      list.sort((a, b) => {
        // Active expiring soonest first, then by status priority
        const pa = STATUS_PRIORITY[a.status] ?? 99
        const pb = STATUS_PRIORITY[b.status] ?? 99
        if (pa !== pb) return pa - pb
        if (a.status === 'active' && b.status === 'active') {
          return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime()
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
    } else if (sortBy === 'expiry') {
      list.sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime())
    } else {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }

    return list
  }, [trials, searchQuery, sortBy])

  // Expiring soon trials (separate bucket for urgency section)
  const expiringSoon = useMemo(() =>
    trials.filter(t =>
      t.status === 'active' &&
      differenceInDays(new Date(t.expires_at), new Date()) <= 3
    ).sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime()),
  [trials])

  return (
    <>
      <Header title="Trial Management" subtitle="Track free trial lifecycle and conversions" />

      <div className="px-5 pt-4 pb-5 fade-in space-y-3">

        {/* ───── Stats + Conversion Insights Row ───── */}
        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-3 items-stretch">
            {/* Stats Cards */}
            <div className="card !py-3 !px-4 h-full flex flex-col">
              <div className="flex items-center gap-1.5 mb-2">
                <Activity className="w-3.5 h-3.5 text-[#475569]" strokeWidth={1.5} />
                <h3 className="text-xs font-semibold text-[#0f172a]">Trial Overview</h3>
              </div>
              <div className="flex-1 grid grid-cols-5 gap-1 items-center">
                {[
                  { label: 'Active', value: stats.total_active, icon: FlaskConical, color: 'text-cyan-600', bg: 'bg-cyan-50', hint: '14-day free trial' },
                  { label: 'Converted', value: stats.total_converted, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', hint: 'Became paying customers' },
                  { label: 'Dropped', value: stats.total_dropped, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', hint: 'Declined to continue' },
                  { label: 'Expired', value: stats.total_expired, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50', hint: 'Trial period ended' },
                  { label: 'Expiring', value: stats.expiring_in_3_days, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', hint: 'Within 3 days' },
                ].map(({ label, value, icon: Icon, color, bg, hint }) => (
                  <div key={label} className="flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-gray-50/80 transition-colors" title={hint}>
                    <div className={`w-7 h-7 ${bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-3.5 h-3.5 ${color}`} strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <div className={`text-base font-bold leading-tight ${color}`}>{value ?? 0}</div>
                      <div className="text-[10px] text-[#94a3b8] leading-none truncate">{label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Conversion Insights */}
            <ConversionInsights stats={stats} />
          </div>
        )}

        {/* ───── Expiring Soon Urgency Section ───── */}
        {expiringSoon.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-orange-50 overflow-hidden">
            <button
              onClick={() => setExpiringSoonCollapsed(v => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-red-100 rounded-lg flex items-center justify-center">
                  <Timer className="w-3.5 h-3.5 text-red-600" strokeWidth={2} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-red-800">Expiring Soon</span>
                  <span className="bg-red-200 text-red-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{expiringSoon.length}</span>
                  <span className="text-[10px] text-red-500 hidden sm:inline">— convert or remind before expiry</span>
                </div>
              </div>
              {expiringSoonCollapsed
                ? <ChevronRight className="w-3.5 h-3.5 text-red-400" />
                : <ChevronDown className="w-3.5 h-3.5 text-red-400" />
              }
            </button>
            {!expiringSoonCollapsed && (
              <div className="px-4 pb-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                {expiringSoon.map(trial => {
                  const daysLeft = differenceInDays(new Date(trial.expires_at), new Date())
                  const hoursLeft = differenceInHours(new Date(trial.expires_at), new Date())
                  const urgencyText = daysLeft <= 0 ? 'Expired!' : daysLeft <= 1 ? `${hoursLeft}h left` : `${daysLeft}d left`
                  const urgencyColor = daysLeft <= 1 ? 'bg-red-600' : daysLeft <= 2 ? 'bg-orange-500' : 'bg-amber-500'

                  return (
                    <div key={trial.id} className="bg-white border border-red-100 rounded-lg p-3 shadow-sm">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-800 text-xs truncate">{trial.company_name || trial.booker_company || 'Unknown'}</div>
                          <div className="text-[10px] text-[#94a3b8] truncate">{trial.company_email || trial.booker_email}</div>
                        </div>
                        <span className={`${urgencyColor} text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse ml-2 flex-shrink-0`}>
                          {urgencyText}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <LifecycleBar trial={trial} />
                        <span className="text-[9px] text-[#94a3b8]">{smartDate(trial.expires_at)}</span>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleQuickConvert(trial)}
                          className="flex-1 flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700 text-white text-[10px] font-medium px-2 py-1.5 rounded-lg transition-colors"
                        >
                          <Crown className="w-3 h-3" />
                          Convert
                        </button>
                        <button
                          onClick={() => handleSendReminder(trial)}
                          className="flex items-center justify-center bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-medium px-2 py-1.5 rounded-lg transition-colors border border-amber-200"
                          title="Send reminder"
                        >
                          <BellRing className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleQuickDrop(trial)}
                          className="flex items-center justify-center bg-gray-50 hover:bg-red-50 hover:text-red-600 text-gray-500 text-[10px] font-medium px-2 py-1.5 rounded-lg transition-colors border border-gray-200 hover:border-red-200"
                          title="Mark as dropped"
                        >
                          <Ban className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ───── Post-Demo Review Section ───── */}
        {!pendingLoading && pendingDemos.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 overflow-hidden">
            <button
              onClick={() => setPendingCollapsed(v => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
                  <CalendarCheck className="w-3.5 h-3.5 text-amber-600" strokeWidth={2} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-amber-800">Post-Demo Review</span>
                  <span className="bg-amber-200 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingDemos.length}</span>
                  <span className="text-[10px] text-amber-500 hidden sm:inline">— start a trial or mark as dropped</span>
                </div>
              </div>
              {pendingCollapsed
                ? <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                : <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
              }
            </button>
            {!pendingCollapsed && (
              <div className="px-4 pb-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
                {pendingDemos.map(demo => {
                  const displayName = demo.company_name || demo.booker_company || 'Unknown Company'
                  const displayEmail = demo.company_email || demo.booker_email || ''
                  const displayContact = demo.booker_name || ''
                  const daysAgo = differenceInDays(new Date(), new Date(demo.scheduled_at))
                  const isUrgent = daysAgo >= 3

                  return (
                    <div
                      key={demo.id}
                      className={`bg-white rounded-lg p-3 shadow-sm transition-shadow hover:shadow-md ${isUrgent ? 'border-2 border-amber-300' : 'border border-amber-100'}`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-800 text-xs truncate">{displayName}</div>
                          {displayContact && <div className="text-[10px] text-[#94a3b8] truncate">{displayContact} · {displayEmail}</div>}
                          {!displayContact && displayEmail && <div className="text-[10px] text-[#94a3b8] truncate">{displayEmail}</div>}
                        </div>
                        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                          <span className="bg-indigo-50 text-indigo-600 text-[9px] font-medium px-1.5 py-0.5 rounded">Done</span>
                          {isUrgent && <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded animate-pulse">OVERDUE</span>}
                        </div>
                      </div>
                      <div className="text-[10px] text-[#94a3b8] mb-2">
                        Held {formatDistanceToNow(new Date(demo.scheduled_at), { addSuffix: true })}
                        {demo.time_slot && <span className="ml-1 capitalize">· {demo.time_slot}</span>}
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleStartTrial(demo)}
                          disabled={demo.actioning}
                          className="flex-1 flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-[10px] font-medium px-2 py-1.5 rounded-lg transition-colors"
                        >
                          <CheckCircle className="w-3 h-3" />
                          {demo.actioning ? 'Saving...' : 'Start Trial'}
                        </button>
                        <button
                          onClick={() => handleMarkDropped(demo)}
                          disabled={demo.actioning}
                          className="flex-1 flex items-center justify-center gap-1 bg-gray-100 hover:bg-red-50 hover:text-red-600 disabled:opacity-60 text-gray-600 text-[10px] font-medium px-2 py-1.5 rounded-lg transition-colors border border-gray-200 hover:border-red-200"
                        >
                          <Ban className="w-3 h-3" />
                          {demo.actioning ? 'Saving...' : 'Drop'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ───── Filters (single compact row) ───── */}
        <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" strokeWidth={1.5} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search company, email..."
              className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 placeholder:text-gray-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="">All Statuses</option>
            {['active', 'converted', 'expired', 'dropped'].map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="priority">Priority</option>
            <option value="expiry">Expiry Date</option>
            <option value="recent">Recent</option>
          </select>
          <button onClick={load} className="flex items-center justify-center w-7 h-7 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors" title="Refresh">
            <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>

        {/* ───── Trials Table ───── */}
        <div className="card overflow-hidden p-0">
          {loading ? <LoadingSpinner /> : filteredTrials.length === 0 ? (
            <div className="py-12 text-center">
              <FlaskConical className="w-10 h-10 text-gray-300 mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-[#475569] font-medium text-sm">No trials found</p>
              <p className="text-[#94a3b8] text-xs mt-0.5">
                {searchQuery ? 'Try adjusting your search' : 'Trials start after demo completion'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  <th className="text-left px-4 py-2 text-[10px] font-semibold text-[#475569] uppercase tracking-wider">Company</th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-[#475569] uppercase tracking-wider">Lifecycle</th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-[#475569] uppercase tracking-wider">Started</th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-[#475569] uppercase tracking-wider">Expires</th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-[#475569] uppercase tracking-wider">Status</th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-[#475569] uppercase tracking-wider">Plan</th>
                  <th className="text-left px-3 py-2 text-[10px] font-semibold text-[#475569] uppercase tracking-wider">Reminder</th>
                  <th className="px-3 py-2 text-[10px] font-semibold text-[#475569] uppercase tracking-wider w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredTrials.map((trial) => {
                  const urgency = getExpiryUrgency(trial.expires_at, trial.status)
                  const isActive = trial.status === 'active'

                  return (
                    <tr key={trial.id} className={`group hover:bg-[#f8f9fc] transition-colors ${urgency.bgRow}`}>
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-gray-800 text-xs">{trial.company_name || trial.booker_company || '—'}</div>
                        <div className="text-[#94a3b8] text-[10px]">{trial.company_email || trial.booker_email || ''}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <LifecycleBar trial={trial} />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-xs text-gray-600">{smartDate(trial.started_at)}</div>
                        <div className="text-[10px] text-[#94a3b8] leading-none">{formatDistanceToNow(new Date(trial.started_at), { addSuffix: true })}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className={`text-xs font-medium ${urgency.color || 'text-gray-600'}`}>
                          {smartDate(trial.expires_at)}
                        </div>
                        {isActive && urgency.label && (
                          <div className={`text-[10px] font-bold leading-none ${urgency.color}`}>{urgency.label}</div>
                        )}
                        {!isActive && (
                          <div className="text-[10px] text-[#94a3b8] leading-none">{formatDistanceToNow(new Date(trial.expires_at), { addSuffix: true })}</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5"><StatusBadge status={trial.status} /></td>
                      <td className="px-3 py-2.5">
                        {trial.plan_selected ? (
                          <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            trial.plan_selected === 'premium'
                              ? 'bg-purple-50 text-purple-600'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {trial.plan_selected === 'premium' && <Crown className="w-2.5 h-2.5" />}
                            {trial.plan_selected.charAt(0).toUpperCase() + trial.plan_selected.slice(1)}
                          </span>
                        ) : (
                          <span className="text-[#94a3b8] text-[10px]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {trial.reminder_sent ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-green-600">
                            <CheckCircle className="w-2.5 h-2.5" />
                            Sent
                          </span>
                        ) : isActive ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-[#94a3b8]">
                            <Clock className="w-2.5 h-2.5" />
                            Pending
                          </span>
                        ) : (
                          <span className="text-[#94a3b8] text-[10px]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                          {isActive && (
                            <>
                              <button
                                onClick={() => handleQuickConvert(trial)}
                                title="Convert"
                                className="w-6 h-6 flex items-center justify-center rounded text-green-500 hover:text-green-700 hover:bg-green-50 transition-colors"
                              >
                                <Crown className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleSendReminder(trial)}
                                title="Send reminder"
                                className="w-6 h-6 flex items-center justify-center rounded text-amber-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                              >
                                <Bell className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleQuickDrop(trial)}
                                title="Drop"
                                className="w-6 h-6 flex items-center justify-center rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Ban className="w-3 h-3" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => openEditTrial(trial)}
                            title="Edit"
                            className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ───── Pagination ───── */}
        {total > 50 && (
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-[#475569]">
              {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} of {total}
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2.5 py-1 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >Prev</button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * 50 >= total}
                className="px-2.5 py-1 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >Next</button>
            </div>
          </div>
        )}

        {/* ───── Edit Trial Modal ───── */}
        {editTarget && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setEditTarget(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Pencil className="w-4 h-4 text-blue-600" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-[#0f172a]">Edit Trial</h3>
                    <p className="text-xs text-[#94a3b8]">{editTarget.company_name || editTarget.booker_company || 'Trial'}</p>
                  </div>
                </div>
                <button onClick={() => setEditTarget(null)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Lifecycle visualization in modal */}
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <div className="text-[10px] text-[#475569] font-medium mb-2">Trial Lifecycle</div>
                <div className="flex items-center justify-between">
                  {LIFECYCLE_STAGES.map((stage, i) => {
                    const currentStage = getTrialLifecycleStage(editTarget)
                    const isReached = i <= currentStage
                    const Icon = stage.icon
                    return (
                      <div key={stage.key} className="flex items-center gap-0 flex-1">
                        <div className="flex flex-col items-center">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isReached ? stage.bg : 'bg-gray-100'}`}>
                            <Icon className={`w-3.5 h-3.5 ${isReached ? stage.color : 'text-gray-400'}`} strokeWidth={1.5} />
                          </div>
                          <span className={`text-[8px] mt-0.5 ${isReached ? 'text-[#475569] font-medium' : 'text-[#94a3b8]'}`}>{stage.label}</span>
                        </div>
                        {i < LIFECYCLE_STAGES.length - 1 && (
                          <div className={`flex-1 h-0.5 mx-1 mt-[-10px] ${isReached && i < currentStage ? 'bg-cyan-400' : 'bg-gray-200'}`} />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={editForm.status}
                      onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                      className="input-field text-xs"
                    >
                      {['active', 'expired', 'converted', 'dropped'].map(s => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Plan</label>
                    <select
                      value={editForm.plan_selected}
                      onChange={e => setEditForm(f => ({ ...f, plan_selected: e.target.value }))}
                      className="input-field text-xs"
                    >
                      <option value="">— None —</option>
                      <option value="free">Free</option>
                      <option value="premium">Premium</option>
                    </select>
                  </div>
                </div>
                <p className="text-[10px] text-[#94a3b8] -mt-1">
                  {editForm.status === 'converted' && 'Converted to paid subscription'}
                  {editForm.status === 'dropped' && 'Declined to continue'}
                  {editForm.status === 'expired' && 'Trial period ended'}
                  {editForm.status === 'active' && 'Currently active and running'}
                </p>

                {/* Read-only info */}
                <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  {[
                    { label: 'Company', value: editTarget.company_name || '—' },
                    { label: 'Email', value: editTarget.company_email || editTarget.booker_email || '—' },
                    { label: 'Started', value: smartDate(editTarget.started_at) },
                    { label: 'Expires', value: smartDate(editTarget.expires_at) },
                    { label: 'Contact', value: editTarget.booker_name || '—' },
                    { label: 'Reminder', value: editTarget.reminder_sent ? 'Sent ✓' : 'Not sent' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-[#94a3b8]">{label}</span>
                      <span className={`font-medium ${label === 'Reminder' && editTarget.reminder_sent ? 'text-green-600' : 'text-gray-700'}`}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end mt-4">
                <button
                  onClick={() => setEditTarget(null)}
                  disabled={saving}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEditTrial}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold btn-primary disabled:opacity-60 rounded-lg transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
