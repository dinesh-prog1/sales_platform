'use client'

import { useEffect, useState } from 'react'
import MetricCard from '@/components/ui/MetricCard'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { analyticsApi } from '@/lib/api'
import { DashboardData } from '@/types'
import {
  Building2, Mail, Handshake, CalendarCheck,
  FlaskConical, TrendingUp, UserX, MessageSquare,
  Upload, CalendarDays, Clock, ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

function spark(base: number, count = 7): number[] {
  return Array.from({ length: count }, (_, i) =>
    Math.max(0, base + Math.round((Math.random() - 0.4) * base * 0.6 * (i / count)))
  )
}

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
    <div className="p-7">
      <div className="h-28 bg-[#00002d] rounded-2xl mb-6 animate-pulse" />
      <LoadingSpinner size="lg" />
    </div>
  )

  const d = data

  return (
    <div className="p-7 fade-in">
      {/* ── Welcome Banner ── */}
      <div className="welcome-banner mb-7">
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/[0.06] border border-white/[0.06] rounded-2xl flex items-center justify-center">
              <Image
                src="/icon-exhibix-white.png"
                alt="Exhibix"
                width={32}
                height={32}
                className="w-8 h-8 object-contain"
              />
            </div>
            <div>
              <div className="text-white/40 text-xs font-medium tracking-wide uppercase">{greeting}</div>
              <div className="text-white text-xl font-bold tracking-[0.08em] mt-1">
                Welcome back
              </div>
              <div className="text-white/30 text-xs mt-1 font-normal">
                {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2">
              <div className="status-dot active" />
              <span className="text-white/50 text-xs font-medium">Automation Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Access ── */}
      <div className="mb-7">
        <h2 className="section-title mb-4">Quick Access</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Upload Companies', icon: Upload, href: '/companies', desc: 'Import from Excel' },
            { label: 'Email Campaigns', icon: Mail, href: '/emails', desc: 'Manage outreach' },
            { label: 'Demo Bookings', icon: CalendarDays, href: '/demos', desc: 'Track demos' },
            { label: 'Trial Reports', icon: Clock, href: '/trials', desc: 'Monitor trials' },
          ].map(({ label, icon: Icon, href, desc }) => (
            <Link key={href} href={href}>
              <div className="quick-access-card group">
                <div className="icon-wrap">
                  <Icon className="w-[18px] h-[18px]" strokeWidth={1.5} />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-[13px] text-[#0f172a]">{label}</div>
                  <div className="text-[#94a3b8] text-[11px] mt-0.5">{desc}</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#cbd5e1] group-hover:text-[#00d4ff] group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Pipeline Overview ── */}
      <h2 className="section-title mb-4">Pipeline Overview</h2>

      {/* Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <MetricCard
          title="Total Companies"
          value={d?.pipeline.total_companies ?? 0}
          subtitle="Uploaded in system"
          icon={Building2}
          gradient="metric-card-navy"
          variant="outline"
          trend={{ value: 12, label: 'vs last month' }}
          sparkData={spark(d?.pipeline.total_companies ?? 3)}
          sparkType="bar"
          sparkColor="#00d4ff"
        />
        <MetricCard
          title="Emails Sent"
          value={d?.email.total_sent ?? 0}
          subtitle={`${d?.email.sent_today ?? 0} sent today`}
          icon={Mail}
          gradient="metric-card-navy"
          variant="outline"
          trend={{ value: 8, label: 'vs last week' }}
          sparkData={spark(d?.email.total_sent ?? 5)}
          sparkType="area"
          sparkColor="#00d4ff"
        />
        <MetricCard
          title="Interested"
          value={d?.pipeline.interested ?? 0}
          subtitle="Replied with interest"
          icon={Handshake}
          gradient="metric-card-navy"
          variant="outline"
          trend={{ value: -10, label: 'need improvement' }}
          sparkData={spark(d?.pipeline.interested ?? 2)}
          sparkType="area"
          sparkColor="#00d4ff"
        />
        <MetricCard
          title="Demo Scheduled"
          value={d?.pipeline.demo_scheduled ?? 0}
          subtitle={`${d?.pipeline.demo_completed ?? 0} completed`}
          icon={CalendarCheck}
          gradient="metric-card-navy"
          variant="outline"
          trend={{ value: 5, label: 'vs last month' }}
          sparkData={spark(d?.pipeline.demo_scheduled ?? 1)}
          sparkType="area"
          sparkColor="#00d4ff"
        />
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Free Trials"
          value={d?.trials.active ?? 0}
          subtitle="Currently active"
          icon={FlaskConical}
          gradient="metric-card-navy"
          variant="outline"
          trend={{ value: 5, label: 'vs last month' }}
          sparkData={spark(d?.trials.active ?? 1)}
          sparkType="area"
          sparkColor="#00d4ff"
        />
        <MetricCard
          title="Paid Conversions"
          value={d?.trials.converted ?? 0}
          subtitle={`${d?.pipeline.conversion_rate?.toFixed(1) ?? 0}% conversion rate`}
          icon={TrendingUp}
          gradient="metric-card-navy"
          variant="outline"
          trend={{ value: 5, label: 'vs last month' }}
          sparkData={spark(d?.trials.converted ?? 1)}
          sparkType="area"
          sparkColor="#10b981"
        />
        <MetricCard
          title="Trial Drop-offs"
          value={d?.trials.dropped ?? 0}
          subtitle={`${d?.trials.expiring_in_3_days ?? 0} expiring soon`}
          icon={UserX}
          gradient="metric-card-navy"
          variant="outline"
          trend={{ value: -22, label: 'last month' }}
          sparkData={spark(d?.trials.dropped ?? 2)}
          sparkType="area"
          sparkColor="#f43f5e"
        />
        <MetricCard
          title="Feedback Sent"
          value={d?.trials.feedback_sent ?? 0}
          subtitle="Feedback requests"
          icon={MessageSquare}
          gradient="metric-card-navy"
          variant="outline"
          sparkData={spark(d?.trials.feedback_sent ?? 1)}
          sparkType="area"
          sparkColor="#00d4ff"
        />
      </div>
    </div>
  )
}
