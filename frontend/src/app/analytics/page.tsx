'use client'

import { useEffect, useState, useMemo } from 'react'
import Header from '@/components/layout/Header'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { analyticsApi } from '@/lib/api'
import { DashboardData } from '@/types'
import {
  BarChart3, TrendingUp, Target, Percent, AlertTriangle,
  ArrowRight, ArrowDown, Lightbulb, Activity, Send, Users,
  FlaskConical, Crown, XCircle, Mail, Eye, MessageSquare, Zap,
  ChevronDown, ChevronRight, Info,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import toast from 'react-hot-toast'

/* ------------------------------------------------------------------ */
/*  Funnel config                                                      */
/* ------------------------------------------------------------------ */

const FUNNEL_STAGES = [
  { key: 'uploaded', label: 'Uploaded', icon: Users, color: '#475569', bg: 'bg-slate-100', accent: 'border-slate-300' },
  { key: 'outreach', label: 'Outreach', icon: Send, color: '#3B82F6', bg: 'bg-blue-50', accent: 'border-blue-300' },
  { key: 'interested', label: 'Interested', icon: TrendingUp, color: '#8B5CF6', bg: 'bg-purple-50', accent: 'border-purple-300' },
  { key: 'demo', label: 'Demo', icon: Target, color: '#EC4899', bg: 'bg-pink-50', accent: 'border-pink-300' },
  { key: 'trial', label: 'Trial', icon: FlaskConical, color: '#F59E0B', bg: 'bg-amber-50', accent: 'border-amber-300' },
  { key: 'paid', label: 'Paid', icon: Crown, color: '#10B981', bg: 'bg-emerald-50', accent: 'border-emerald-300' },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function pct(a: number, b: number): string {
  if (b <= 0) return '0'
  return ((a / b) * 100).toFixed(1)
}

function getInsightLevel(rate: number): 'good' | 'warn' | 'bad' {
  if (rate >= 30) return 'good'
  if (rate >= 10) return 'warn'
  return 'bad'
}

const INSIGHT_STYLES = {
  good: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'text-emerald-500' },
  warn: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: 'text-amber-500' },
  bad: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'text-red-500' },
}

/* ------------------------------------------------------------------ */
/*  Component: FunnelVisual                                            */
/* ------------------------------------------------------------------ */

function FunnelVisual({ stages }: { stages: { label: string; count: number; color: string; icon: any; bg: string; accent: string }[] }) {
  const maxCount = Math.max(...stages.map(s => s.count), 1)

  return (
    <div className="space-y-1.5">
      {stages.map((stage, i) => {
        const prev = i > 0 ? stages[i - 1].count : stage.count
        const convRate = prev > 0 ? (stage.count / prev) * 100 : 0
        const dropOff = i > 0 ? prev - stage.count : 0
        const barWidth = Math.max((stage.count / maxCount) * 100, 4)
        const Icon = stage.icon

        return (
          <div key={stage.label}>
            {/* Drop-off indicator between stages */}
            {i > 0 && (
              <div className="flex items-center gap-2 pl-8 py-0.5">
                <ArrowDown className="w-3 h-3 text-gray-300" />
                <span className={`text-[10px] font-medium ${
                  convRate >= 50 ? 'text-green-600' : convRate >= 20 ? 'text-amber-600' : 'text-red-500'
                }`}>
                  {convRate.toFixed(1)}% conversion
                </span>
                {dropOff > 0 && (
                  <span className="text-[10px] text-gray-400">
                    ({dropOff} lost)
                  </span>
                )}
              </div>
            )}
            {/* Stage bar */}
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 ${stage.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-3.5 h-3.5" style={{ color: stage.color }} strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-medium text-gray-700">{stage.label}</span>
                  <span className="text-xs font-bold" style={{ color: stage.color }}>{stage.count.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${barWidth}%`, backgroundColor: stage.color }}
                  />
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Component: InsightCard                                             */
/* ------------------------------------------------------------------ */

function InsightCard({ message, level, detail }: { message: string; level: 'good' | 'warn' | 'bad'; detail?: string }) {
  const s = INSIGHT_STYLES[level]
  return (
    <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border ${s.bg} ${s.border}`}>
      <Lightbulb className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${s.icon}`} strokeWidth={1.5} />
      <div>
        <p className={`text-xs font-medium ${s.text}`}>{message}</p>
        {detail && <p className="text-[10px] text-gray-500 mt-0.5">{detail}</p>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function AnalyticsPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    analyticsApi.dashboard()
      .then(setData)
      .catch((err: any) => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Derived data
  const d = data
  const funnelStages = useMemo(() => {
    if (!d) return []
    return FUNNEL_STAGES.map((s, i) => ({
      ...s,
      count: [
        d.pipeline.total_companies,
        d.pipeline.outreach_sent,
        d.pipeline.interested,
        d.pipeline.demo_completed,
        d.pipeline.trial_started,
        d.pipeline.converted,
      ][i] ?? 0,
    }))
  }, [d])

  // Intelligent insights
  const insights = useMemo(() => {
    if (!d) return []
    const list: { message: string; level: 'good' | 'warn' | 'bad'; detail?: string }[] = []
    const p = d.pipeline
    const e = d.email

    // Pipeline bottleneck detection
    if (p.total_companies > 0 && p.outreach_sent === 0) {
      list.push({ message: 'No outreach sent — pipeline is blocked at stage 1', level: 'bad', detail: 'Send outreach emails to uploaded companies to begin the pipeline.' })
    } else if (p.total_companies > 0 && p.outreach_sent > 0 && p.interested === 0) {
      list.push({ message: 'Zero interested leads — outreach may need improvement', level: 'bad', detail: 'Review email templates and subject lines for better engagement.' })
    }

    if (p.interested > 0 && p.demo_completed === 0) {
      list.push({ message: 'Interested leads exist but no demos completed', level: 'warn', detail: 'Schedule and confirm demo bookings to advance the pipeline.' })
    }

    if (p.demo_completed > 0 && p.trial_started === 0) {
      list.push({ message: 'Demos done but no trials started', level: 'warn', detail: 'Follow up post-demo to convert interest into trial signups.' })
    }

    // Email performance
    if (e.total_sent > 0) {
      const openR = e.open_rate
      if (openR < 15) {
        list.push({ message: `Low email open rate (${openR.toFixed(1)}%)`, level: 'bad', detail: 'Improve subject lines, send timing, or sender reputation.' })
      } else if (openR > 40) {
        list.push({ message: `Strong open rate (${openR.toFixed(1)}%)`, level: 'good', detail: 'Email engagement is healthy — maintain current approach.' })
      }

      const replyR = e.reply_rate
      if (replyR < 5 && e.total_sent > 10) {
        list.push({ message: `Low reply rate (${replyR.toFixed(1)}%)`, level: 'warn', detail: 'Consider personalizing email content or adding clear CTAs.' })
      }

      if (e.total_failed > 0 && (e.total_failed / e.total_sent) > 0.1) {
        list.push({ message: `High email failure rate (${((e.total_failed / (e.total_sent + e.total_failed)) * 100).toFixed(1)}%)`, level: 'bad', detail: 'Check SMTP configuration and verify recipient addresses.' })
      }
    }

    // Trials
    const t = d.trials
    if (t.active > 0 && t.expiring_in_3_days > 0) {
      list.push({ message: `${t.expiring_in_3_days} trial${t.expiring_in_3_days > 1 ? 's' : ''} expiring soon`, level: 'warn', detail: 'Send conversion reminders before trials expire.' })
    }

    if (t.converted > 0 && (t.active + t.converted) > 0) {
      const trialConv = (t.converted / (t.active + t.converted + t.expired + t.dropped)) * 100
      if (trialConv > 30) {
        list.push({ message: `Good trial conversion rate (${trialConv.toFixed(1)}%)`, level: 'good' })
      }
    }

    // Positive pipeline signal
    if (p.converted > 0 && p.conversion_rate > 5) {
      list.push({ message: `Pipeline is converting at ${p.conversion_rate.toFixed(1)}%`, level: 'good', detail: 'End-to-end funnel is healthy.' })
    }

    return list.slice(0, 5) // Max 5 insights
  }, [d])

  // Drop-off analysis data
  const dropOffs = useMemo(() => {
    if (funnelStages.length < 2) return []
    return funnelStages.slice(1).map((stage, i) => {
      const prev = funnelStages[i]
      const rate = prev.count > 0 ? (stage.count / prev.count) * 100 : 0
      const lost = prev.count - stage.count
      return {
        from: prev.label,
        to: stage.label,
        rate,
        lost,
        fromCount: prev.count,
        toCount: stage.count,
        color: stage.color,
      }
    })
  }, [funnelStages])

  if (loading) return (
    <>
      <Header title="Analytics" subtitle="Pipeline insights and performance" />
      <div className="p-5"><LoadingSpinner size="lg" /></div>
    </>
  )

  return (
    <>
      <Header title="Analytics" subtitle="Pipeline insights and performance" />

      <div className="px-5 pt-4 pb-5 fade-in space-y-3">

        {/* ───── Section 1: Funnel + Drop-off Analysis ───── */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-3 items-stretch">

          {/* Conversion Funnel */}
          <div className="card !py-3 !px-4 h-full">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-[#475569]" strokeWidth={1.5} />
                <h3 className="text-xs font-semibold text-[#0f172a]">Conversion Funnel</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#94a3b8]">Overall</span>
                <span className={`text-xs font-bold ${
                  (d?.pipeline.conversion_rate ?? 0) > 5 ? 'text-green-600' :
                  (d?.pipeline.conversion_rate ?? 0) > 0 ? 'text-amber-600' : 'text-gray-400'
                }`}>
                  {d?.pipeline.conversion_rate?.toFixed(1) ?? '0.0'}%
                </span>
              </div>
            </div>
            <FunnelVisual stages={funnelStages} />
          </div>

          {/* Drop-off Analysis + Insights */}
          <div className="flex flex-col gap-3 h-full">
            {/* Drop-off Analysis */}
            <div className="card !py-3 !px-4 flex-1">
              <div className="flex items-center gap-1.5 mb-2.5">
                <ArrowDown className="w-3.5 h-3.5 text-[#475569]" strokeWidth={1.5} />
                <h3 className="text-xs font-semibold text-[#0f172a]">Drop-off Analysis</h3>
              </div>
              <div className="space-y-1.5">
                {dropOffs.map(d => {
                  const level = d.rate >= 50 ? 'good' : d.rate >= 20 ? 'warn' : 'bad'
                  const barColor = level === 'good' ? 'bg-green-400' : level === 'warn' ? 'bg-amber-400' : 'bg-red-400'
                  const textColor = level === 'good' ? 'text-green-600' : level === 'warn' ? 'text-amber-600' : 'text-red-500'
                  return (
                    <div key={`${d.from}-${d.to}`} className="flex items-center gap-2">
                      <div className="w-[52px] text-[10px] text-gray-500 text-right truncate flex-shrink-0">{d.from}</div>
                      <ArrowRight className="w-3 h-3 text-gray-300 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] text-gray-600 truncate">{d.to}</span>
                          <span className={`text-[10px] font-bold ${textColor}`}>{d.rate.toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${Math.min(d.rate, 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              {dropOffs.length === 0 && (
                <p className="text-[10px] text-[#94a3b8] text-center py-4">No pipeline data yet</p>
              )}
            </div>

            {/* Intelligent Insights (compact) */}
            {insights.length > 0 && (
              <div className="card !py-3 !px-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Lightbulb className="w-3.5 h-3.5 text-[#475569]" strokeWidth={1.5} />
                  <h3 className="text-xs font-semibold text-[#0f172a]">Insights</h3>
                </div>
                <div className="space-y-1.5">
                  {insights.map((ins, i) => (
                    <InsightCard key={i} {...ins} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ───── Section 2: Conversion Metrics (KPIs) ───── */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-2.5">
          {[
            { label: 'Overall Conversion', value: `${d?.pipeline.conversion_rate?.toFixed(1) ?? 0}%`, icon: Percent, color: 'text-green-600', bg: 'bg-green-50', sub: 'Uploaded → Paid' },
            { label: 'Open Rate', value: `${d?.email.open_rate?.toFixed(1) ?? 0}%`, icon: Eye, color: 'text-cyan-600', bg: 'bg-cyan-50', sub: `${d?.email.total_opened ?? 0} of ${d?.email.total_sent ?? 0}` },
            { label: 'Reply Rate', value: `${d?.email.reply_rate?.toFixed(1) ?? 0}%`, icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-50', sub: `${d?.email.total_replied ?? 0} replies` },
            { label: 'Emails Sent', value: (d?.email.total_sent ?? 0).toLocaleString(), icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50', sub: `${d?.email.sent_today ?? 0} today` },
            { label: 'Trial Conv.', value: (() => { const t = d?.trials; if (!t) return '0%'; const tot = (t.active || 0) + (t.converted || 0) + (t.expired || 0) + (t.dropped || 0); return tot > 0 ? `${((t.converted / tot) * 100).toFixed(1)}%` : '0%' })(), icon: FlaskConical, color: 'text-amber-600', bg: 'bg-amber-50', sub: `${d?.trials.converted ?? 0} converted` },
            { label: 'Dropped', value: (d?.pipeline.dropped ?? 0).toLocaleString(), icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', sub: `${d?.companies.not_interested ?? 0} not interested` },
          ].map(({ label, value, icon: Icon, color, bg, sub }) => (
            <div key={label} className="card !py-2.5 !px-3">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 ${bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-3.5 h-3.5 ${color}`} strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <div className={`text-base font-bold leading-tight ${color}`}>{value}</div>
                  <div className="text-[10px] text-[#94a3b8] leading-none truncate">{label}</div>
                </div>
              </div>
              <div className="text-[9px] text-[#94a3b8] mt-1 pl-9 truncate">{sub}</div>
            </div>
          ))}
        </div>

        {/* ───── Section 3: Activity Trends ───── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Email Send Trend */}
          <div className="card !py-3 !px-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#475569]" strokeWidth={1.5} />
                <h3 className="text-xs font-semibold text-[#0f172a]">Email Activity</h3>
              </div>
              <span className="text-[10px] text-[#94a3b8]">Last 30 days</span>
            </div>
            {(d?.daily_trend ?? []).length > 0 ? (
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={d?.daily_trend ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="emailGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', fontSize: 11 }}
                    formatter={(v: number) => [v, 'Emails Sent']}
                  />
                  <Area type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} fill="url(#emailGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[140px] flex items-center justify-center">
                <div className="text-center">
                  <Mail className="w-8 h-8 text-gray-200 mx-auto mb-1" strokeWidth={1.5} />
                  <p className="text-[10px] text-[#94a3b8]">No email activity in the last 30 days</p>
                </div>
              </div>
            )}
          </div>

          {/* Pipeline Stage Distribution */}
          <div className="card !py-3 !px-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#475569]" strokeWidth={1.5} />
                <h3 className="text-xs font-semibold text-[#0f172a]">Pipeline Distribution</h3>
              </div>
              <span className="text-[10px] text-[#94a3b8]">{d?.companies.total ?? 0} total</span>
            </div>
            {(d?.pipeline_chart ?? []).length > 0 ? (
              <div className="space-y-1.5">
                {(d?.pipeline_chart ?? []).map((stage) => {
                  const total = d?.companies.total || 1
                  const widthPct = Math.max((stage.count / total) * 100, 2)
                  return (
                    <div key={stage.stage} className="flex items-center gap-2">
                      <div className="w-[80px] text-[10px] text-gray-600 text-right truncate flex-shrink-0">{stage.stage}</div>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${widthPct}%`, backgroundColor: stage.color }} />
                      </div>
                      <div className="w-8 text-[10px] font-bold text-gray-700 text-right">{stage.count}</div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="h-[140px] flex items-center justify-center">
                <div className="text-center">
                  <Users className="w-8 h-8 text-gray-200 mx-auto mb-1" strokeWidth={1.5} />
                  <p className="text-[10px] text-[#94a3b8]">No company data yet</p>
                </div>
              </div>
            )}
            {/* Size breakdown mini */}
            {(d?.size_breakdown ?? []).length > 0 && (
              <div className="mt-3 pt-2 border-t border-gray-100 flex items-center gap-3">
                <span className="text-[9px] text-[#94a3b8] uppercase tracking-wider">By size:</span>
                {(d?.size_breakdown ?? []).map(s => (
                  <span key={s.size} className="text-[10px] text-gray-600">
                    <span className="font-medium capitalize">{s.size}</span> {s.count}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ───── Section 4: Pipeline Summary Table ───── */}
        <div className="card !p-0 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-[#475569]" strokeWidth={1.5} />
            <h3 className="text-xs font-semibold text-[#0f172a]">Pipeline Summary</h3>
          </div>
          <table className="w-full">
            <thead className="table-header">
              <tr>
                <th className="text-left px-4 py-2 text-[10px] font-semibold text-[#475569] uppercase tracking-wider">Stage</th>
                <th className="text-right px-4 py-2 text-[10px] font-semibold text-[#475569] uppercase tracking-wider">Count</th>
                <th className="text-right px-4 py-2 text-[10px] font-semibold text-[#475569] uppercase tracking-wider">% of Total</th>
                <th className="text-right px-4 py-2 text-[10px] font-semibold text-[#475569] uppercase tracking-wider">Stage Conv.</th>
                <th className="text-left px-4 py-2 text-[10px] font-semibold text-[#475569] uppercase tracking-wider w-[120px]">Progress</th>
                <th className="text-left px-4 py-2 text-[10px] font-semibold text-[#475569] uppercase tracking-wider">Drop-off</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {funnelStages.map((stage, i) => {
                const total = d?.pipeline.total_companies || 1
                const prev = i > 0 ? funnelStages[i - 1].count : stage.count
                const stageConv = i === 0 ? 100 : prev > 0 ? (stage.count / prev) * 100 : 0
                const totalPct = (stage.count / total) * 100
                const lost = i > 0 ? prev - stage.count : 0
                const Icon = stage.icon
                const convColor = stageConv >= 50 ? 'text-green-600' : stageConv >= 20 ? 'text-amber-600' : i === 0 ? 'text-[#94a3b8]' : 'text-red-500'

                return (
                  <tr key={stage.label} className="hover:bg-[#f8f9fc] transition-colors">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 ${stage.bg} rounded flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-3 h-3" style={{ color: stage.color }} strokeWidth={1.5} />
                        </div>
                        <span className="text-xs font-medium text-gray-700">{stage.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-xs text-right font-bold text-gray-800">{stage.count.toLocaleString()}</td>
                    <td className="px-4 py-2 text-xs text-right text-gray-500">{totalPct.toFixed(1)}%</td>
                    <td className="px-4 py-2 text-xs text-right">
                      <span className={`font-semibold ${convColor}`}>
                        {i === 0 ? '—' : `${stageConv.toFixed(1)}%`}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden w-full">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${totalPct}%`, backgroundColor: stage.color }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-400">
                      {i === 0 ? '—' : lost > 0 ? (
                        <span className="text-red-400">−{lost}</span>
                      ) : (
                        <span className="text-green-500">±0</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ───── Section 5: Detailed Metrics Breakdown ───── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Email Performance */}
          <div className="card !py-3 !px-4">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Mail className="w-3.5 h-3.5 text-[#475569]" strokeWidth={1.5} />
              <h3 className="text-xs font-semibold text-[#0f172a]">Email Performance</h3>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Total Sent', value: d?.email.total_sent ?? 0, color: 'text-blue-600' },
                { label: 'Opened', value: d?.email.total_opened ?? 0, pct: d?.email.open_rate, color: 'text-cyan-600' },
                { label: 'Replied', value: d?.email.total_replied ?? 0, pct: d?.email.reply_rate, color: 'text-purple-600' },
                { label: 'Failed', value: d?.email.total_failed ?? 0, color: 'text-red-500' },
              ].map(m => (
                <div key={m.label} className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">{m.label}</span>
                  <div className="flex items-center gap-2">
                    {m.pct !== undefined && <span className="text-[10px] text-[#94a3b8]">{m.pct.toFixed(1)}%</span>}
                    <span className={`text-xs font-bold ${m.color}`}>{m.value.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trial Metrics */}
          <div className="card !py-3 !px-4">
            <div className="flex items-center gap-1.5 mb-2.5">
              <FlaskConical className="w-3.5 h-3.5 text-[#475569]" strokeWidth={1.5} />
              <h3 className="text-xs font-semibold text-[#0f172a]">Trial Metrics</h3>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Active', value: d?.trials.active ?? 0, color: 'text-cyan-600' },
                { label: 'Converted', value: d?.trials.converted ?? 0, color: 'text-green-600' },
                { label: 'Expired', value: d?.trials.expired ?? 0, color: 'text-orange-500' },
                { label: 'Dropped', value: d?.trials.dropped ?? 0, color: 'text-red-500' },
                { label: 'Expiring Soon', value: d?.trials.expiring_in_3_days ?? 0, color: 'text-amber-600' },
              ].map(m => (
                <div key={m.label} className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">{m.label}</span>
                  <span className={`text-xs font-bold ${m.color}`}>{m.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Company Breakdown */}
          <div className="card !py-3 !px-4">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Users className="w-3.5 h-3.5 text-[#475569]" strokeWidth={1.5} />
              <h3 className="text-xs font-semibold text-[#0f172a]">Company Breakdown</h3>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Total Companies', value: d?.companies.total ?? 0, color: 'text-gray-800' },
                { label: 'Small', value: d?.companies.small ?? 0, color: 'text-blue-600' },
                { label: 'Medium', value: d?.companies.medium ?? 0, color: 'text-indigo-600' },
                { label: 'Large', value: d?.companies.large ?? 0, color: 'text-purple-600' },
                { label: 'Not Interested', value: d?.companies.not_interested ?? 0, color: 'text-red-500' },
              ].map(m => (
                <div key={m.label} className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">{m.label}</span>
                  <span className={`text-xs font-bold ${m.color}`}>{m.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </>
  )
}
