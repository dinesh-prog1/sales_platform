'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import Header from '@/components/layout/Header'
import StatusBadge from '@/components/ui/StatusBadge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { emailsApi, companiesApi } from '@/lib/api'
import { EmailLog, EmailInsightStats, SearchSuggestion, EmailSuggestion } from '@/types'
import {
  Mail, Send, XCircle, Eye, MessageCircle, RefreshCw, Search,
  Settings, ChevronLeft, ChevronRight, Trash2, AlertTriangle, Clock,
  ChevronDown, ChevronUp, RotateCcw, FileText, TrendingUp, Zap,
  Inbox, CheckCircle2, Users, BarChart3, X,
} from 'lucide-react'
import toast from 'react-hot-toast'

/* ═══════════════ Constants & Helpers ═══════════════ */

const CAMPAIGN_TYPES = [
  { key: 'outreach', label: 'Outreach Campaign', icon: Send, accent: 'blue' },
  { key: 'demo_invite', label: 'Demo Invite', icon: Mail, accent: 'purple' },
  { key: 'demo_confirm', label: 'Demo Confirmation', icon: CheckCircle2, accent: 'indigo' },
  { key: 'post_demo', label: 'Post-Demo Follow-up', icon: TrendingUp, accent: 'teal' },
  { key: 'trial_reminder', label: 'Trial Reminder', icon: Clock, accent: 'amber' },
  { key: 'trial_conversion', label: 'Trial Conversion', icon: Zap, accent: 'emerald' },
  { key: 'feedback', label: 'Feedback Request', icon: MessageCircle, accent: 'cyan' },
] as const

const ACCENT_STYLES: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200',    iconBg: 'bg-blue-100' },
  purple:  { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200',  iconBg: 'bg-purple-100' },
  indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200',  iconBg: 'bg-indigo-100' },
  teal:    { bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200',    iconBg: 'bg-teal-100' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   iconBg: 'bg-amber-100' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', iconBg: 'bg-emerald-100' },
  cyan:    { bg: 'bg-cyan-50',    text: 'text-cyan-700',    border: 'border-cyan-200',    iconBg: 'bg-cyan-100' },
}

const STATUS_PRIORITY: Record<string, number> = {
  failed: 0, pending: 1, queued: 2, sent: 3, opened: 4, replied: 5,
}

function timeUntilScheduledAt(scheduledAt: string): string {
  const diffMs = new Date(scheduledAt).getTime() - Date.now()
  if (diffMs <= 0) return 'sending soon'
  const totalMins = Math.floor(diffMs / 60_000)
  const hours = Math.floor(totalMins / 60)
  const mins = totalMins % 60
  if (hours === 0 && mins === 0) return 'sending soon'
  if (hours === 0) return `in ${mins}m`
  if (mins === 0) return `in ${hours}h`
  return `in ${hours}h ${mins}m`
}

function isPreScheduled(scheduledAt: string): boolean {
  return new Date(scheduledAt).getTime() - Date.now() > 60 * 60_000
}

function formatSentTime(sentAt: string | null): string {
  if (!sentAt) return '—'
  const d = new Date(sentAt)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()

  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (isToday) return `Today, ${time}`
  if (isYesterday) return `Yesterday, ${time}`
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${time}`
}

function recipientName(email: string): string {
  const local = email.split('@')[0]
  return local
    .replace(/[._-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

type RecipientGroup = {
  email: string
  displayName: string
  emails: EmailLog[]
}

type CampaignGroup = {
  type: string
  label: string
  accent: string
  icon: typeof Send
  emails: EmailLog[]
  recipients: RecipientGroup[]
  stats: { sent: number; pending: number; failed: number; queued: number; opened: number; replied: number }
}

/* ═══════════════ Main Page ═══════════════ */

export default function EmailsPage() {
  // Data
  const [emails, setEmails] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [insights, setInsights] = useState<EmailInsightStats | null>(null)
  const [config, setConfig] = useState<any>(null)
  const [editConfig, setEditConfig] = useState(false)
  const [sendingManual, setSendingManual] = useState(false)

  // Filters
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  // Pagination
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // UI state
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [expandedCampaigns, setExpandedCampaigns] = useState<Record<string, boolean>>({})
  const [expandedRecipients, setExpandedRecipients] = useState<Record<string, boolean>>({})
  const [viewEmailId, setViewEmailId] = useState<string | null>(null)
  const [showManualOutreach, setShowManualOutreach] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Countdown tick
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  // Autocomplete
  const [companySuggestions, setCompanySuggestions] = useState<SearchSuggestion[]>([])
  const [emailSuggestions, setEmailSuggestions] = useState<EmailSuggestion[]>([])
  const [showCompanySugg, setShowCompanySugg] = useState(false)
  const [showEmailSugg, setShowEmailSugg] = useState(false)
  const companyRef = useRef<HTMLDivElement>(null)
  const emailRef = useRef<HTMLDivElement>(null)

  const [manualForm, setManualForm] = useState({
    company_name: '', email: '', contact_person: '',
    industry: '', company_size: 'medium', country: '',
  })

  /* ═══════════════ Data Loading ═══════════════ */

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [emailsRes, insightsRes, cfgRes] = await Promise.all([
        emailsApi.list({ page, limit: rowsPerPage, type: typeFilter, status: statusFilter, search: searchQuery }),
        emailsApi.insights(),
        emailsApi.config(),
      ])
      setEmails(emailsRes.emails || [])
      setTotal(emailsRes.total || 0)
      setTotalPages(emailsRes.total_pages || 1)
      setInsights(insightsRes)
      setConfig(cfgRes)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, typeFilter, statusFilter, searchQuery])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [load])

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (companyRef.current && !companyRef.current.contains(e.target as Node)) setShowCompanySugg(false)
      if (emailRef.current && !emailRef.current.contains(e.target as Node)) setShowEmailSugg(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  /* ═══════════════ Campaign Grouping ═══════════════ */

  const campaignGroups = useMemo((): CampaignGroup[] => {
    // Apply date filter client-side
    let filtered = emails
    if (dateFilter) {
      const now = new Date()
      const cutoff = new Date()
      if (dateFilter === 'today') cutoff.setHours(0, 0, 0, 0)
      else if (dateFilter === '7d') cutoff.setDate(now.getDate() - 7)
      else if (dateFilter === '30d') cutoff.setDate(now.getDate() - 30)

      filtered = emails.filter(e => {
        const d = new Date(e.sent_at || e.created_at)
        return d >= cutoff
      })
    }

    // Sort by priority (failed first)
    const sorted = [...filtered].sort((a, b) =>
      (STATUS_PRIORITY[a.status] ?? 99) - (STATUS_PRIORITY[b.status] ?? 99)
    )

    // Group by campaign type
    const typeMap = new Map<string, EmailLog[]>()
    for (const email of sorted) {
      const list = typeMap.get(email.type) || []
      list.push(email)
      typeMap.set(email.type, list)
    }

    return CAMPAIGN_TYPES
      .filter(ct => typeMap.has(ct.key))
      .map(ct => {
        const campaignEmails = typeMap.get(ct.key) || []

        // Group by recipient
        const recipMap = new Map<string, EmailLog[]>()
        for (const e of campaignEmails) {
          const list = recipMap.get(e.to_email) || []
          list.push(e)
          recipMap.set(e.to_email, list)
        }

        const recipients: RecipientGroup[] = Array.from(recipMap.entries()).map(([email, emails]) => ({
          email,
          displayName: recipientName(email),
          emails,
        }))

        const stats = {
          sent: campaignEmails.filter(e => e.status === 'sent').length,
          pending: campaignEmails.filter(e => e.status === 'pending').length,
          queued: campaignEmails.filter(e => e.status === 'queued').length,
          failed: campaignEmails.filter(e => e.status === 'failed').length,
          opened: campaignEmails.filter(e => e.status === 'opened').length,
          replied: campaignEmails.filter(e => e.status === 'replied').length,
        }

        return {
          type: ct.key,
          label: ct.label,
          accent: ct.accent,
          icon: ct.icon,
          emails: campaignEmails,
          recipients,
          stats,
        }
      })
  }, [emails, dateFilter])

  // Auto-expand all campaigns on initial load
  useEffect(() => {
    if (campaignGroups.length > 0 && Object.keys(expandedCampaigns).length === 0) {
      const expanded: Record<string, boolean> = {}
      campaignGroups.forEach(g => { expanded[g.type] = true })
      setExpandedCampaigns(expanded)
    }
  }, [campaignGroups]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ═══════════════ Actions ═══════════════ */

  const handleRetry = async (emailId: string) => {
    try {
      await emailsApi.retryEmail(emailId)
      toast.success('Email re-queued for retry')
      await load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleCompanyInput = async (val: string) => {
    setManualForm(f => ({ ...f, company_name: val }))
    if (val.length >= 1) {
      try {
        const results = await companiesApi.search(val)
        setCompanySuggestions(results || [])
        setShowCompanySugg(true)
      } catch { setCompanySuggestions([]) }
    } else {
      setShowCompanySugg(false)
    }
  }

  const handleSelectCompany = (s: SearchSuggestion) => {
    setManualForm(f => ({ ...f, company_name: s.name, industry: s.industry || s.department, country: s.country, company_size: s.size }))
    setShowCompanySugg(false)
    loadEmailSuggestions(s.name)
  }

  const loadEmailSuggestions = async (name: string) => {
    try {
      const results = await companiesApi.emailSuggestions(name)
      setEmailSuggestions(results || [])
    } catch { setEmailSuggestions([]) }
  }

  const handleEmailFocus = () => { if (emailSuggestions.length > 0) setShowEmailSugg(true) }

  const handleSelectEmail = (s: EmailSuggestion) => {
    setManualForm(f => ({ ...f, email: s.email, contact_person: s.contact_person, industry: s.industry || s.department, country: s.country, company_size: s.size }))
    setShowEmailSugg(false)
  }

  const saveConfig = async () => {
    const quotaTotal = (config.small_quota || 0) + (config.medium_quota || 0) + (config.large_quota || 0)
    if (quotaTotal > 0 && quotaTotal !== config.emails_per_day) {
      toast.error(`Quotas must sum to ${config.emails_per_day} (currently ${quotaTotal}).`)
      return
    }
    try {
      await emailsApi.updateConfig(config)
      toast.success('Configuration saved!')
      setEditConfig(false)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const sendManualOutreach = async () => {
    if (!manualForm.company_name || !manualForm.email) {
      toast.error('Company name and email are required')
      return
    }
    setSendingManual(true)
    try {
      await emailsApi.sendManualOutreach(manualForm)
      toast.success('Outreach sent successfully!')
      setManualForm({ company_name: '', email: '', contact_person: '', industry: '', company_size: 'medium', country: '' })
      setEmailSuggestions([])
      setShowManualOutreach(false)
      await load()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSendingManual(false)
    }
  }

  const handleClearLogs = async () => {
    setClearing(true)
    try {
      await emailsApi.clearLogs()
      toast.success('All email logs cleared. Companies reset to eligible.')
      setShowClearConfirm(false)
      await load()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setClearing(false)
    }
  }

  const toggleCampaign = (type: string) => {
    setExpandedCampaigns(prev => ({ ...prev, [type]: !prev[type] }))
  }

  const toggleRecipient = (key: string) => {
    setExpandedRecipients(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const viewEmail = emails.find(e => e.id === viewEmailId)

  const quotaTotal = config ? (config.small_quota || 0) + (config.medium_quota || 0) + (config.large_quota || 0) : 0
  const quotaRemaining = config ? config.emails_per_day - quotaTotal : 0
  const useQuotas = quotaTotal > 0

  return (
    <>
      {/* ═══════ Email Preview Modal ═══════ */}
      {viewEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setViewEmailId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-[#0f172a]">{viewEmail.subject}</h3>
                <p className="text-xs text-[#475569] mt-0.5">To: {viewEmail.to_email}</p>
              </div>
              <button onClick={() => setViewEmailId(null)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-[#475569]" strokeWidth={1.5} />
              </button>
            </div>
            <div className="flex items-center gap-3 px-6 py-3 bg-gray-50/80 border-b border-gray-100">
              <StatusBadge status={viewEmail.status} size="sm" />
              <span className="text-xs text-[#94a3b8]">
                {viewEmail.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </span>
              <span className="text-xs text-[#94a3b8]">·</span>
              <span className="text-xs text-[#94a3b8]">{formatSentTime(viewEmail.sent_at)}</span>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="prose prose-sm max-w-none text-[#475569] text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: viewEmail.body || '<p class="text-gray-400 italic">No content available</p>' }} />
            </div>
            {viewEmail.error_message && (
              <div className="mx-6 mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-xs font-medium text-red-700">Error: {viewEmail.error_message}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════ Clear Logs Confirm ═══════ */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-semibold text-[#0f172a] text-center mb-1">Clear All Email Logs?</h3>
            <p className="text-sm text-[#475569] text-center mb-2">
              This will <strong className="text-gray-700">permanently delete</strong> all email logs and reset
              &ldquo;outreach sent&rdquo; companies back to <em>uploaded</em>.
            </p>
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 text-center mb-6">
              Company records are kept — only the email history is cleared.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowClearConfirm(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button onClick={handleClearLogs} disabled={clearing}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-60 transition-colors">
                {clearing ? 'Clearing…' : 'Yes, Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Header title="Email Campaigns" subtitle="Campaign performance & management" />

      <div className="p-7 fade-in space-y-6">
        {/* ═══════ Campaign Insight Cards ═══════ */}
        {insights && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Total Emails', value: insights.total_emails, icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50', sub: `${insights.sent_today} today` },
              { label: 'Delivery Rate', value: `${insights.delivery_rate}%`, icon: Send, color: 'text-emerald-600', bg: 'bg-emerald-50', sub: `${insights.total_sent + insights.total_opened + insights.total_replied} delivered` },
              { label: 'Open Rate', value: `${insights.open_rate}%`, icon: Eye, color: 'text-purple-600', bg: 'bg-purple-50', sub: `${insights.total_opened + insights.total_replied} opened` },
              { label: 'Reply Rate', value: `${insights.reply_rate}%`, icon: MessageCircle, color: 'text-teal-600', bg: 'bg-teal-50', sub: `${insights.total_replied} replies` },
              { label: 'Failed', value: insights.total_failed, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', sub: `${insights.total_pending} pending` },
            ].map(({ label, value, icon: Icon, color, bg, sub }) => (
              <div key={label} className="card flex items-center gap-3.5 group">
                <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105`}>
                  <Icon className={`w-5 h-5 ${color}`} strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <div className={`text-xl font-bold ${color} leading-tight`}>{typeof value === 'number' ? value.toLocaleString() : value}</div>
                  <div className="text-[11px] text-[#475569] font-medium">{label}</div>
                  <div className="text-[10px] text-[#94a3b8]">{sub}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══════ Needs Attention ═══════ */}
        {insights && (insights.total_failed > 0 || insights.total_pending > 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" strokeWidth={1.5} />
              <span className="text-sm font-semibold text-amber-800">Needs Attention</span>
            </div>
            <div className="flex flex-wrap gap-4">
              {insights.total_failed > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-amber-900 font-medium">{insights.total_failed} failed</span>
                  <span className="text-amber-700">— retry or investigate</span>
                </div>
              )}
              {insights.total_pending > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-amber-900 font-medium">{insights.total_pending} pending</span>
                  <span className="text-amber-700">— awaiting processing</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════ Actions Bar ═══════ */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" strokeWidth={1.5} />
              <input
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPage(1) }}
                placeholder="Search recipients or subjects..."
                className="input-field pl-10 text-[13px] h-10"
              />
            </div>

            {/* Campaign Type Filter */}
            <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
              className="select-field min-w-[140px]">
              <option value="">All Campaigns</option>
              {CAMPAIGN_TYPES.map(ct => (
                <option key={ct.key} value={ct.key}>{ct.label}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
              className="select-field min-w-[120px]">
              <option value="">All Statuses</option>
              {['pending', 'queued', 'sent', 'failed', 'opened', 'replied'].map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>

            {/* Date Filter */}
            <select value={dateFilter} onChange={e => setDateFilter(e.target.value)}
              className="select-field min-w-[120px]">
              <option value="">All Time</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setShowManualOutreach(!showManualOutreach)}
              className="btn-primary flex items-center gap-2 text-sm h-10">
              <Send className="w-4 h-4" strokeWidth={1.5} />
              Send Outreach
            </button>
            <button onClick={() => setShowSettings(!showSettings)}
              className="w-10 h-10 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors"
              title="Outreach Settings">
              <Settings className="w-4 h-4 text-[#475569]" strokeWidth={1.5} />
            </button>
            <button onClick={load} title="Refresh"
              className="w-10 h-10 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors">
              <RefreshCw className="w-4 h-4 text-[#475569]" strokeWidth={1.5} />
            </button>
            <button onClick={() => setShowClearConfirm(true)} title="Clear all logs"
              className="w-10 h-10 bg-red-50 border border-red-200 rounded-xl flex items-center justify-center hover:bg-red-100 transition-colors">
              <Trash2 className="w-3.5 h-3.5 text-red-600" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* ═══════ Manual Outreach Panel ═══════ */}
        {showManualOutreach && (
          <div className="card border-cyan-200 bg-cyan-50/30">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-800 text-base">Manual Outreach</h3>
                <p className="text-sm text-[#475569] mt-0.5">
                  Send an outreach email immediately. Each company receives <strong>only one</strong> outreach email ever.
                </p>
              </div>
              <button onClick={() => setShowManualOutreach(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/60 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-[#475569]" strokeWidth={1.5} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div ref={companyRef} className="relative md:col-span-2">
                <input value={manualForm.company_name} onChange={e => handleCompanyInput(e.target.value)}
                  placeholder="Company name (type to search database)" className="input-field bg-white" />
                {showCompanySugg && companySuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-52 overflow-y-auto">
                    {companySuggestions.map(s => (
                      <button key={s.id} onClick={() => handleSelectCompany(s)}
                        className="w-full text-left px-3 py-2.5 hover:bg-blue-50 flex items-center justify-between text-sm border-b border-gray-50 last:border-0">
                        <div>
                          <div className="font-medium text-gray-800">{s.name}</div>
                          <div className="text-[#94a3b8] text-xs">{s.department || s.industry}</div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          s.size === 'large' ? 'bg-violet-100 text-violet-700' :
                          s.size === 'medium' ? 'bg-indigo-100 text-indigo-700' : 'bg-sky-100 text-sky-700'
                        }`}>{s.size}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div ref={emailRef} className="relative">
                <input value={manualForm.email} onChange={e => setManualForm(f => ({ ...f, email: e.target.value }))}
                  onFocus={handleEmailFocus} placeholder="Recipient email" type="email" className="input-field bg-white" />
                {showEmailSugg && emailSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-44 overflow-y-auto">
                    {emailSuggestions.map(s => (
                      <button key={s.id} onClick={() => handleSelectEmail(s)}
                        className="w-full text-left px-3 py-2.5 hover:bg-blue-50 border-b border-gray-50 last:border-0">
                        <div className="text-sm font-medium text-gray-800">{s.email}</div>
                        <div className="text-xs text-[#94a3b8]">{s.contact_person} · {s.country}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input value={manualForm.contact_person} onChange={e => setManualForm(f => ({ ...f, contact_person: e.target.value }))}
                placeholder="Contact person" className="input-field bg-white" />
              <input value={manualForm.industry} onChange={e => setManualForm(f => ({ ...f, industry: e.target.value }))}
                placeholder="Industry" className="input-field bg-white" />
              <select value={manualForm.company_size} onChange={e => setManualForm(f => ({ ...f, company_size: e.target.value }))}
                className="select-field bg-white">
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
              <input value={manualForm.country} onChange={e => setManualForm(f => ({ ...f, country: e.target.value }))}
                placeholder="Country" className="input-field bg-white" />
            </div>

            <div className="mt-4 flex justify-end">
              <button onClick={sendManualOutreach} disabled={sendingManual}
                className="btn-primary flex items-center gap-2 disabled:opacity-60">
                <Send className="w-4 h-4" strokeWidth={1.5} />
                {sendingManual ? 'Sending...' : 'Send Outreach Now'}
              </button>
            </div>
          </div>
        )}

        {/* ═══════ Settings Panel ═══════ */}
        {showSettings && config && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Outreach Settings</h3>
              <div className="flex items-center gap-2">
                {!editConfig && (
                  <button onClick={() => setEditConfig(true)}
                    className="text-xs px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg font-medium text-[#475569] transition-colors">
                    Edit
                  </button>
                )}
                <button onClick={() => setShowSettings(false)}
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
                  <X className="w-4 h-4 text-[#475569]" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Daily limit */}
              <div>
                <label className="text-xs text-[#475569] font-medium">Daily Email Limit</label>
                {editConfig ? (
                  <input type="number" min={1} value={config.emails_per_day}
                    onChange={e => setConfig({ ...config, emails_per_day: parseInt(e.target.value) || 0 })}
                    className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-cyan-400" />
                ) : (
                  <div className="mt-1 text-2xl font-bold text-blue-600">{config.emails_per_day} <span className="text-sm font-normal text-[#94a3b8]">/day</span></div>
                )}
              </div>

              {/* Send time */}
              <div>
                <label className="text-xs text-[#475569] font-medium">Daily Send Time</label>
                {editConfig ? (
                  <select value={config.cron_hour ?? 9}
                    onChange={e => setConfig({ ...config, cron_hour: parseInt(e.target.value) })}
                    className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-cyan-400">
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{i.toString().padStart(2, '0')}:00 {i < 12 ? 'AM' : 'PM'}</option>
                    ))}
                  </select>
                ) : (
                  <div className="mt-1 font-semibold text-gray-700">
                    {(config.cron_hour ?? 9).toString().padStart(2, '0')}:00 {(config.cron_hour ?? 9) < 12 ? 'AM' : 'PM'} daily
                  </div>
                )}
              </div>

              {/* Size quotas */}
              <div>
                <label className="text-xs text-[#475569] font-medium">Size Distribution</label>
                {editConfig ? (
                  <div className="mt-1 space-y-1.5">
                    {[
                      { key: 'small_quota', label: 'S' },
                      { key: 'medium_quota', label: 'M' },
                      { key: 'large_quota', label: 'L' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500 w-4">{label}</span>
                        <input type="number" min={0} value={config[key] || 0}
                          onChange={e => setConfig({ ...config, [key]: parseInt(e.target.value) || 0 })}
                          className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-sm outline-none focus:border-cyan-400 text-center" />
                      </div>
                    ))}
                    <div className={`text-xs font-medium text-center py-1 rounded-lg ${
                      quotaTotal === 0 ? 'bg-gray-50 text-[#94a3b8]' :
                      quotaTotal === config.emails_per_day ? 'bg-green-50 text-green-700' :
                      'bg-amber-50 text-amber-700'
                    }`}>
                      {quotaTotal === 0 ? 'Even split' : `${quotaTotal}/${config.emails_per_day}`}
                    </div>
                  </div>
                ) : useQuotas ? (
                  <div className="mt-1">
                    <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">
                      {config.small_quota}S · {config.medium_quota}M · {config.large_quota}L
                    </span>
                  </div>
                ) : (
                  <div className="mt-1 text-sm text-[#475569]">All sizes equally</div>
                )}
              </div>

              {/* Automation status */}
              <div>
                <label className="text-xs text-[#475569] font-medium">Automation</label>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`badge ${config.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 inline-block" />
                    {config.is_active ? 'Active' : 'Paused'}
                  </span>
                  {editConfig && (
                    <button onClick={() => setConfig({ ...config, is_active: !config.is_active })}
                      className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors ${
                        config.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
                      }`}>
                      {config.is_active ? 'Pause' : 'Activate'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {editConfig && (
              <div className="flex gap-2 pt-4 mt-4 border-t border-gray-100">
                <button onClick={saveConfig} className="btn-primary py-2 px-6">Save</button>
                <button onClick={() => setEditConfig(false)} className="border border-gray-200 text-gray-600 rounded-xl py-2 px-6 text-sm font-medium hover:bg-gray-50">Cancel</button>
              </div>
            )}
          </div>
        )}

        {/* ═══════ Campaign Groups ═══════ */}
        {loading ? <LoadingSpinner /> : emails.length === 0 ? (
          /* Empty State */
          <div className="card py-20 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-8 h-8 text-gray-300" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-semibold text-[#0f172a] mb-1">No campaigns yet.</h3>
            <p className="text-sm text-[#475569] mb-6 max-w-sm mx-auto">
              Start your first email campaign to begin outreach. Upload companies and configure your automation settings.
            </p>
            <button onClick={() => setShowManualOutreach(true)}
              className="btn-primary inline-flex items-center gap-2">
              <Send className="w-4 h-4" strokeWidth={1.5} />
              Send First Outreach
            </button>
          </div>
        ) : campaignGroups.length === 0 ? (
          <div className="card py-16 text-center">
            <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-[#475569]">No emails match your filters</p>
            <button onClick={() => { setTypeFilter(''); setStatusFilter(''); setSearchQuery(''); setDateFilter('') }}
              className="mt-3 text-sm text-cyan-600 hover:text-cyan-700 font-medium">
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {campaignGroups.map((group) => {
              const style = ACCENT_STYLES[group.accent] || ACCENT_STYLES.blue
              const Icon = group.icon
              const isExpanded = expandedCampaigns[group.type] ?? false

              return (
                <div key={group.type} className="card overflow-hidden p-0">
                  {/* Campaign Header */}
                  <button
                    onClick={() => toggleCampaign(group.type)}
                    className={`w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${style.iconBg} rounded-xl flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${style.text}`} strokeWidth={1.5} />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-[#0f172a] text-[15px]">{group.label}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}>
                            {group.emails.length}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          {group.stats.sent > 0 && (
                            <span className="text-xs text-green-600">{group.stats.sent} sent</span>
                          )}
                          {(group.stats.pending + group.stats.queued) > 0 && (
                            <span className="text-xs text-blue-600">{group.stats.pending + group.stats.queued} pending</span>
                          )}
                          {group.stats.failed > 0 && (
                            <span className="text-xs text-red-600">{group.stats.failed} failed</span>
                          )}
                          {group.stats.opened > 0 && (
                            <span className="text-xs text-purple-600">{group.stats.opened} opened</span>
                          )}
                          {group.stats.replied > 0 && (
                            <span className="text-xs text-teal-600">{group.stats.replied} replied</span>
                          )}
                          <span className="text-xs text-[#94a3b8]">{group.recipients.length} recipients</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Mini status bar */}
                      <div className="hidden md:flex items-center gap-0.5 h-2 w-32 rounded-full overflow-hidden bg-gray-100">
                        {group.stats.sent > 0 && <div className="h-full bg-green-500" style={{ width: `${(group.stats.sent / group.emails.length) * 100}%` }} />}
                        {group.stats.opened > 0 && <div className="h-full bg-purple-500" style={{ width: `${(group.stats.opened / group.emails.length) * 100}%` }} />}
                        {group.stats.replied > 0 && <div className="h-full bg-teal-500" style={{ width: `${(group.stats.replied / group.emails.length) * 100}%` }} />}
                        {(group.stats.pending + group.stats.queued) > 0 && <div className="h-full bg-blue-300" style={{ width: `${((group.stats.pending + group.stats.queued) / group.emails.length) * 100}%` }} />}
                        {group.stats.failed > 0 && <div className="h-full bg-red-500" style={{ width: `${(group.stats.failed / group.emails.length) * 100}%` }} />}
                      </div>
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4 text-[#94a3b8]" strokeWidth={1.5} />
                        : <ChevronDown className="w-4 h-4 text-[#94a3b8]" strokeWidth={1.5} />}
                    </div>
                  </button>

                  {/* Campaign Content */}
                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      {/* Table Header */}
                      <div className="grid grid-cols-12 gap-2 px-5 py-2.5 bg-gray-50/80 text-xs font-semibold text-[#475569] uppercase tracking-wider">
                        <div className="col-span-4">Recipient</div>
                        <div className="col-span-3">Subject</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-2">Time</div>
                        <div className="col-span-1 text-right">Actions</div>
                      </div>

                      {/* Recipient Groups */}
                      {group.recipients.map((recip) => {
                        const recipKey = `${group.type}_${recip.email}`
                        const hasMultiple = recip.emails.length > 1
                        const isRecipExpanded = expandedRecipients[recipKey] ?? false
                        const displayEmails = hasMultiple && !isRecipExpanded
                          ? [recip.emails[0]]
                          : recip.emails

                        return (
                          <div key={recipKey} className="border-b border-gray-50 last:border-0">
                            {/* Recipient header (when multiple) */}
                            {hasMultiple && (
                              <button
                                onClick={() => toggleRecipient(recipKey)}
                                className="w-full flex items-center gap-2 px-5 py-2 bg-gray-50/50 hover:bg-gray-100/50 transition-colors"
                              >
                                <Users className="w-3.5 h-3.5 text-[#94a3b8]" strokeWidth={1.5} />
                                <span className="text-xs font-medium text-[#475569]">{recip.displayName}</span>
                                <span className="text-xs text-[#94a3b8]">({recip.email})</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}>
                                  {recip.emails.length} emails
                                </span>
                                <ChevronDown className={`w-3 h-3 text-[#94a3b8] transition-transform ${isRecipExpanded ? 'rotate-180' : ''}`} strokeWidth={1.5} />
                              </button>
                            )}

                            {/* Email rows */}
                            {displayEmails.map((email) => (
                              <div key={email.id} className="grid grid-cols-12 gap-2 px-5 py-3 items-center hover:bg-[#f8f9fc] transition-colors group">
                                {/* Recipient */}
                                <div className="col-span-4 min-w-0">
                                  <div className="text-sm font-medium text-[#0f172a] truncate">
                                    {hasMultiple ? email.to_email : recip.displayName}
                                  </div>
                                  {!hasMultiple && (
                                    <div className="text-xs text-[#94a3b8] truncate">{email.to_email}</div>
                                  )}
                                </div>

                                {/* Subject */}
                                <div className="col-span-3 min-w-0">
                                  <div className="text-sm text-[#475569] truncate">{email.subject}</div>
                                </div>

                                {/* Status */}
                                <div className="col-span-2">
                                  <StatusBadge status={email.status} size="sm" />
                                </div>

                                {/* Time */}
                                <div className="col-span-2 text-xs">
                                  {email.status === 'queued' || email.status === 'pending' ? (
                                    <div className="flex flex-col gap-0.5">
                                      <div className="flex items-center gap-1 text-amber-600 font-semibold">
                                        <Clock className="w-3 h-3 flex-shrink-0" strokeWidth={1.5} />
                                        {timeUntilScheduledAt(email.scheduled_at)}
                                      </div>
                                      <div className="text-[#94a3b8] text-[10px]">
                                        {isPreScheduled(email.scheduled_at)
                                          ? `${new Date(email.scheduled_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} ${new Date(email.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
                                          : 'Processing...'}
                                      </div>
                                    </div>
                                  ) : email.sent_at ? (
                                    <span className="text-[#94a3b8]">{formatSentTime(email.sent_at)}</span>
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )}
                                </div>

                                {/* Actions */}
                                <div className="col-span-1 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {email.status === 'failed' && (
                                    <button onClick={() => handleRetry(email.id)} title="Retry"
                                      className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 flex items-center justify-center transition-colors">
                                      <RotateCcw className="w-3.5 h-3.5 text-amber-600" strokeWidth={1.5} />
                                    </button>
                                  )}
                                  <button onClick={() => setViewEmailId(email.id)} title="View Email"
                                    className="w-7 h-7 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors">
                                    <FileText className="w-3.5 h-3.5 text-[#475569]" strokeWidth={1.5} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ═══════ Pagination ═══════ */}
        {!loading && emails.length > 0 && (
          <div className="card p-0">
            <div className="flex items-center justify-between px-5 py-3 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#475569]">Rows:</span>
                <select value={rowsPerPage} onChange={e => { setRowsPerPage(parseInt(e.target.value)); setPage(1) }}
                  className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700 outline-none">
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-xs text-[#94a3b8]">
                  {total > 0 ? `${((page-1)*rowsPerPage)+1}–${Math.min(page*rowsPerPage, total)} of ${total}` : '0 results'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page <= 1}
                  className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-40 transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${p === page ? 'bg-[#00002d] text-cyan-400' : 'text-gray-600 hover:bg-gray-100'}`}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page >= totalPages}
                  className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-40 transition-colors">
                  <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
