'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import MetricCard from '@/components/ui/MetricCard'
import PipelineChart from '@/components/charts/PipelineChart'
import EmailTrendChart from '@/components/charts/EmailTrendChart'
import SizeDonutChart from '@/components/charts/SizeDonutChart'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { analyticsApi } from '@/lib/api'
import { DashboardData } from '@/types'
import {
  Building2, Mail, Handshake, CalendarCheck,
  FlaskConical, TrendingUp, UserX, MessageSquare,
  Upload, CalendarDays, Clock, ArrowRight, ChevronRight
} from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    analyticsApi.dashboard()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'

  if (loading) return (
    <div className="p-6">
      <div className="welcome-banner mb-6 h-24 animate-pulse" />
      <LoadingSpinner size="lg" />
    </div>
  )

  const d = data

  // Funnel stages
  const funnelStages = [
    { label: 'Companies Uploaded', value: d?.pipeline.total_companies ?? 0, color: '#3b82f6', icon: '🏢' },
    { label: 'Outreach Sent', value: d?.pipeline.outreach_sent ?? 0, color: '#6366f1', icon: '📧' },
    { label: 'Interested', value: d?.pipeline.interested ?? 0, color: '#8b5cf6', icon: '🤝' },
    { label: 'Demo Scheduled', value: d?.pipeline.demo_scheduled ?? 0, color: '#06b6d4', icon: '📅' },
    { label: 'Demo Completed', value: d?.pipeline.demo_completed ?? 0, color: '#10b981', icon: '✅' },
    { label: 'Trial Started', value: d?.pipeline.trial_started ?? 0, color: '#f59e0b', icon: '🧪' },
    { label: 'Converted', value: d?.pipeline.converted ?? 0, color: '#059669', icon: '💰' },
  ]
  const maxFunnel = funnelStages[0].value || 1

  return (
    <div className="p-6 fade-in">
      {/* Welcome Banner */}
      <div className="welcome-banner mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/70 rounded-full flex items-center justify-center text-2xl font-bold text-blue-700 shadow-sm">
            AS
          </div>
          <div>
            <div className="text-gray-600 text-sm font-medium">{greeting} 👋</div>
            <div className="text-gray-800 text-2xl font-bold">AI Sales Platform</div>
            <div className="text-gray-500 text-sm mt-0.5">
              {now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access */}
      <div className="mb-6">
        <h2 className="text-gray-700 font-semibold text-sm mb-3 flex items-center gap-2">
          <span className="w-1 h-4 bg-blue-600 rounded-full" />
          Quick Access
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Upload Companies', icon: Upload, href: '/companies', desc: 'Import from Excel' },
            { label: 'Email Campaigns', icon: Mail, href: '/emails', desc: 'Manage outreach' },
            { label: 'Demo Bookings', icon: CalendarDays, href: '/demos', desc: 'Track demos' },
            { label: 'Trial Reports', icon: Clock, href: '/trials', desc: 'Monitor trials' },
          ].map(({ label, icon: Icon, href, desc }) => (
            <Link key={href} href={href}>
              <div className="quick-access-card group">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-sm">{label}</div>
                  <div className="text-white/70 text-xs">{desc}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Main Metrics */}
      <div className="mb-3">
        <h2 className="text-gray-700 font-semibold text-sm flex items-center gap-2">
          <span className="w-1 h-4 bg-blue-600 rounded-full" />
          Pipeline Overview
        </h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Companies"
          value={d?.pipeline.total_companies ?? 0}
          subtitle="Uploaded in system"
          icon={Building2}
          gradient="metric-card-blue"
          trend={{ value: 12, label: 'vs last month' }}
        />
        <MetricCard
          title="Emails Sent"
          value={d?.email.total_sent ?? 0}
          subtitle={`${d?.email.sent_today ?? 0} sent today`}
          icon={Mail}
          gradient="metric-card-indigo"
          trend={{ value: 8, label: 'vs last week' }}
        />
        <MetricCard
          title="Interested"
          value={d?.pipeline.interested ?? 0}
          subtitle="Replied with interest"
          icon={Handshake}
          gradient="metric-card-purple"
        />
        <MetricCard
          title="Demo Scheduled"
          value={d?.pipeline.demo_scheduled ?? 0}
          subtitle={`${d?.pipeline.demo_completed ?? 0} completed`}
          icon={CalendarCheck}
          gradient="metric-card-cyan"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Free Trials"
          value={d?.trials.active ?? 0}
          subtitle="Currently active"
          icon={FlaskConical}
          gradient="metric-card-teal"
        />
        <MetricCard
          title="Paid Conversions"
          value={d?.trials.converted ?? 0}
          subtitle={`${d?.pipeline.conversion_rate?.toFixed(1) ?? 0}% conversion rate`}
          icon={TrendingUp}
          gradient="metric-card-green"
          trend={{ value: 5, label: 'vs last month' }}
        />
        <MetricCard
          title="Trial Drop-offs"
          value={d?.trials.dropped ?? 0}
          subtitle={`${d?.trials.expiring_in_3_days ?? 0} expiring soon`}
          icon={UserX}
          gradient="metric-card-orange"
        />
        <MetricCard
          title="Feedback Sent"
          value={d?.trials.feedback_sent ?? 0}
          subtitle="Feedback requests"
          icon={MessageSquare}
          gradient="metric-card-red"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {d?.daily_trend && <EmailTrendChart data={d.daily_trend} />}
        {d?.pipeline_chart && <PipelineChart data={d.pipeline_chart} />}
      </div>

      {/* Funnel + Size Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Funnel */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-gray-800 text-base">Pipeline Funnel</h3>
            <Link href="/analytics" className="flex items-center gap-1 text-blue-600 text-xs font-medium hover:underline">
              Full Analytics <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {funnelStages.map((stage, i) => {
              const pct = Math.round((stage.value / maxFunnel) * 100)
              const convPct = i > 0 && funnelStages[i - 1].value > 0
                ? Math.round((stage.value / funnelStages[i - 1].value) * 100)
                : null
              return (
                <div key={stage.label}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{stage.icon}</span>
                      <span className="text-gray-700 font-medium">{stage.label}</span>
                      {convPct !== null && (
                        <span className="flex items-center gap-0.5 text-gray-400 text-xs">
                          <ChevronRight className="w-3 h-3" />
                          {convPct}% conv.
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-gray-800">{stage.value.toLocaleString()}</span>
                  </div>
                  <div className="h-7 bg-gray-100 rounded-lg overflow-hidden">
                    <div
                      className="h-full rounded-lg flex items-center justify-end pr-3 transition-all duration-700"
                      style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: stage.color }}
                    >
                      {pct > 8 && (
                        <span className="text-white text-xs font-semibold">{pct}%</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Size Donut */}
        {d?.size_breakdown && (
          <SizeDonutChart data={d.size_breakdown} />
        )}
      </div>
    </div>
  )
}
