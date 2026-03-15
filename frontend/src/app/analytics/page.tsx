'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import PipelineChart from '@/components/charts/PipelineChart'
import EmailTrendChart from '@/components/charts/EmailTrendChart'
import SizeDonutChart from '@/components/charts/SizeDonutChart'
import { analyticsApi, emailsApi } from '@/lib/api'
import { DashboardData } from '@/types'
import { BarChart3, TrendingUp, Target, Percent } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import toast from 'react-hot-toast'

export default function AnalyticsPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    analyticsApi.dashboard()
      .then(setData)
      .catch((err: any) => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <>
      <Header title="Analytics" subtitle="Full pipeline insights" />
      <div className="p-6"><LoadingSpinner size="lg" /></div>
    </>
  )

  const d = data

  // Conversion funnel data
  const funnelData = [
    { name: 'Uploaded', value: d?.pipeline.total_companies ?? 0 },
    { name: 'Outreach', value: d?.pipeline.outreach_sent ?? 0 },
    { name: 'Interested', value: d?.pipeline.interested ?? 0 },
    { name: 'Demo', value: d?.pipeline.demo_completed ?? 0 },
    { name: 'Trial', value: d?.pipeline.trial_started ?? 0 },
    { name: 'Paid', value: d?.pipeline.converted ?? 0 },
  ]

  const funnelColors = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981']

  return (
    <>
      <Header title="Analytics" subtitle="Full pipeline insights" />

      <div className="p-6 fade-in">
        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            {
              title: 'Overall Conversion',
              value: `${d?.pipeline.conversion_rate?.toFixed(1) ?? 0}%`,
              icon: Percent,
              color: 'text-green-600',
              bg: 'from-green-50 to-emerald-50',
              desc: 'Uploaded → Paid',
            },
            {
              title: 'Email Open Rate',
              value: `${d?.email.open_rate?.toFixed(1) ?? 0}%`,
              icon: TrendingUp,
              color: 'text-blue-600',
              bg: 'from-blue-50 to-indigo-50',
              desc: 'Opened / Sent',
            },
            {
              title: 'Reply Rate',
              value: `${d?.email.reply_rate?.toFixed(1) ?? 0}%`,
              icon: Target,
              color: 'text-purple-600',
              bg: 'from-purple-50 to-violet-50',
              desc: 'Replied / Sent',
            },
            {
              title: 'Trial Conversion',
              value: d?.trials.active
                ? `${Math.round((d.trials.converted / Math.max(d.trials.active + d.trials.converted, 1)) * 100)}%`
                : '0%',
              icon: BarChart3,
              color: 'text-teal-600',
              bg: 'from-teal-50 to-cyan-50',
              desc: 'Trial → Paid',
            },
          ].map(({ title, value, icon: Icon, color, bg, desc }) => (
            <div key={title} className={`card bg-gradient-to-br ${bg}`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
              </div>
              <div className={`text-3xl font-bold ${color} mb-1`}>{value}</div>
              <div className="text-gray-700 font-medium text-sm">{title}</div>
              <div className="text-gray-400 text-xs mt-0.5">{desc}</div>
            </div>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <EmailTrendChart data={d?.daily_trend ?? []} />
          <PipelineChart data={d?.pipeline_chart ?? []} />
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <SizeDonutChart data={d?.size_breakdown ?? []} />

          {/* Funnel */}
          <div className="card lg:col-span-2">
            <h3 className="font-semibold text-gray-800 mb-4 text-base">Conversion Funnel</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={funnelData} layout="vertical" margin={{ top: 0, right: 60, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748b' }} width={70} />
                <Tooltip
                  formatter={(v: number) => [v.toLocaleString(), 'Companies']}
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={32}>
                  {funnelData.map((_, i) => <Cell key={i} fill={funnelColors[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary Table */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 text-base">Pipeline Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Stage</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Count</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">% of Total</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">% of Prev</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {funnelData.map((row, i) => {
                  const total = d?.pipeline.total_companies || 1
                  const prev = i > 0 ? funnelData[i - 1].value : row.value
                  return (
                    <tr key={row.name} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-700 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ background: funnelColors[i] }} />
                        {row.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-gray-800">{row.value.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">
                        {total > 0 ? `${((row.value / total) * 100).toFixed(1)}%` : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <span className={`font-medium ${
                          i === 0 ? 'text-gray-400' :
                          prev > 0 ? 'text-green-600' : 'text-gray-400'
                        }`}>
                          {i === 0 ? '—' : prev > 0 ? `${((row.value / prev) * 100).toFixed(1)}%` : '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
