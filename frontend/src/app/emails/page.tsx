'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Header from '@/components/layout/Header'
import StatusBadge from '@/components/ui/StatusBadge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { emailsApi, companiesApi } from '@/lib/api'
import { EmailLog, SearchSuggestion, EmailSuggestion } from '@/types'
import {
  Mail, Send, XCircle, Eye, MessageCircle, RefreshCw,
  Settings, ChevronLeft, ChevronRight, Trash2, AlertTriangle, Clock,
} from 'lucide-react'
import toast from 'react-hot-toast'

/**
 * Returns a human-readable "in Xh Ym" countdown based on the email's own
 * scheduled_at field — accurate for both pre-queued (~24 h) and same-run entries.
 */
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

/** Returns true when a queued email is pre-scheduled for a future day (scheduled_at > 1 h from now). */
function isPreScheduled(scheduledAt: string): boolean {
  return new Date(scheduledAt).getTime() - Date.now() > 60 * 60_000
}

/** Returns a short relative time string for when an email was queued. */
function queuedAgo(createdAt: string): string {
  const diffMs = Date.now() - new Date(createdAt).getTime()
  const totalMins = Math.floor(diffMs / 60_000)
  if (totalMins < 1) return 'just now'
  if (totalMins < 60) return `${totalMins}m ago`
  const hours = Math.floor(totalMins / 60)
  const mins = totalMins % 60
  return mins === 0 ? `${hours}h ago` : `${hours}h ${mins}m ago`
}

const EMAIL_TYPES = ['', 'outreach', 'demo_invite', 'demo_confirm', 'post_demo', 'trial_reminder', 'feedback']
const EMAIL_STATUSES = ['', 'pending', 'queued', 'sent', 'failed', 'opened', 'replied']

export default function EmailsPage() {
  const [emails, setEmails] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [config, setConfig] = useState<any>(null)
  const [editConfig, setEditConfig] = useState(false)
  const [sendingManual, setSendingManual] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Clear logs confirmation
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)

  // Tick every 30 s so the "in Xh Ym" countdowns update without a full reload
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

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [emailsRes, statsRes, cfgRes] = await Promise.all([
        emailsApi.list({ page, limit: rowsPerPage, type: typeFilter, status: statusFilter }),
        emailsApi.stats(),
        emailsApi.config(),
      ])
      setEmails(emailsRes.emails || [])
      setTotal(emailsRes.total || 0)
      setTotalPages(emailsRes.total_pages || 1)
      setStats(statsRes)
      setConfig(cfgRes)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [page, rowsPerPage, typeFilter, statusFilter])

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
      toast.error(`Quotas must sum to ${config.emails_per_day} (currently ${quotaTotal}). Adjust or set all to 0.`)
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

  const quotaTotal = config ? (config.small_quota || 0) + (config.medium_quota || 0) + (config.large_quota || 0) : 0
  const quotaRemaining = config ? config.emails_per_day - quotaTotal : 0
  const useQuotas = quotaTotal > 0

  return (
    <>
      {/* Clear logs confirmation modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-1">Clear All Email Logs?</h3>
            <p className="text-sm text-gray-500 text-center mb-2">
              This will <strong className="text-gray-700">permanently delete</strong> all email logs and reset
              &ldquo;outreach sent&rdquo; companies back to <em>uploaded</em> so they can receive emails again.
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

      <Header title="Email Campaigns" subtitle="Manage automated outreach" />

      <div className="p-6 fade-in space-y-6">
        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {[
              { label: 'Total Sent', value: stats.total_sent, icon: Send, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Sent Today', value: stats.sent_today, icon: Mail, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: 'Failed', value: stats.total_failed, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
              { label: 'Opened', value: stats.total_opened, icon: Eye, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Replied', value: stats.total_replied, icon: MessageCircle, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Pending', value: stats.total_pending, icon: RefreshCw, color: 'text-amber-600', bg: 'bg-amber-50' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="card flex items-center gap-3">
                <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <div className={`text-xl font-bold ${color}`}>{value?.toLocaleString() ?? 0}</div>
                  <div className="text-xs text-gray-500">{label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Manual Outreach + Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Manual Outreach */}
          <div className="lg:col-span-2 card">
            <div className="mb-4">
              <h3 className="font-semibold text-gray-800 text-base">Manual Outreach</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Send an outreach email immediately. Each company receives <strong>only one</strong> outreach email ever.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div ref={companyRef} className="relative md:col-span-2">
                <input value={manualForm.company_name} onChange={e => handleCompanyInput(e.target.value)}
                  placeholder="Company name (type to search database)"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100" />
                {showCompanySugg && companySuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-52 overflow-y-auto">
                    {companySuggestions.map(s => (
                      <button key={s.id} onClick={() => handleSelectCompany(s)}
                        className="w-full text-left px-3 py-2.5 hover:bg-blue-50 flex items-center justify-between text-sm border-b border-gray-50 last:border-0">
                        <div>
                          <div className="font-medium text-gray-800">{s.name}</div>
                          <div className="text-gray-400 text-xs">{s.department || s.industry}</div>
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
                  onFocus={handleEmailFocus} placeholder="Recipient email" type="email"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100" />
                {showEmailSugg && emailSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-44 overflow-y-auto">
                    {emailSuggestions.map(s => (
                      <button key={s.id} onClick={() => handleSelectEmail(s)}
                        className="w-full text-left px-3 py-2.5 hover:bg-blue-50 border-b border-gray-50 last:border-0">
                        <div className="text-sm font-medium text-gray-800">{s.email}</div>
                        <div className="text-xs text-gray-400">{s.contact_person} · {s.country}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <input value={manualForm.contact_person} onChange={e => setManualForm(f => ({ ...f, contact_person: e.target.value }))}
                placeholder="Contact person"
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100" />
              <input value={manualForm.industry} onChange={e => setManualForm(f => ({ ...f, industry: e.target.value }))}
                placeholder="Industry"
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100" />
              <select value={manualForm.company_size} onChange={e => setManualForm(f => ({ ...f, company_size: e.target.value }))}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100">
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
              <input value={manualForm.country} onChange={e => setManualForm(f => ({ ...f, country: e.target.value }))}
                placeholder="Country"
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100" />
            </div>

            <div className="mt-4 flex justify-end">
              <button onClick={sendManualOutreach} disabled={sendingManual}
                className="flex items-center gap-2 bg-blue-600 text-white rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
                <Send className="w-4 h-4" />
                {sendingManual ? 'Sending...' : 'Send Outreach Now'}
              </button>
            </div>
          </div>

          {/* Outreach Settings */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Outreach Settings</h3>
              <button onClick={() => setEditConfig(!editConfig)}
                className="w-8 h-8 bg-gray-50 hover:bg-gray-100 rounded-lg flex items-center justify-center transition-colors">
                <Settings className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {config && (
              <div className="space-y-4">
                {/* Daily limit */}
                <div>
                  <label className="text-xs text-gray-500 font-medium">Daily Email Limit</label>
                  {editConfig ? (
                    <input type="number" min={1} value={config.emails_per_day}
                      onChange={e => setConfig({ ...config, emails_per_day: parseInt(e.target.value) || 0 })}
                      className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400" />
                  ) : (
                    <div className="mt-1 text-2xl font-bold text-blue-600">{config.emails_per_day} <span className="text-sm font-normal text-gray-400">emails/day</span></div>
                  )}
                </div>

                {/* Send time */}
                <div>
                  <label className="text-xs text-gray-500 font-medium">Daily Send Time</label>
                  {editConfig ? (
                    <select value={config.cron_hour ?? 9}
                      onChange={e => setConfig({ ...config, cron_hour: parseInt(e.target.value) })}
                      className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400">
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

                {/* Size distribution quotas */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-gray-500 font-medium">Size Distribution / Day</label>
                    {useQuotas && !editConfig && (
                      <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full">
                        {config.small_quota}S · {config.medium_quota}M · {config.large_quota}L
                      </span>
                    )}
                  </div>

                  {editConfig ? (
                    <div className="space-y-2 mt-1">
                      {[
                        { key: 'small_quota', label: '🏪 Small', colorClass: 'text-sky-700 bg-sky-50 border-sky-200' },
                        { key: 'medium_quota', label: '🏢 Medium', colorClass: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
                        { key: 'large_quota', label: '🏭 Large', colorClass: 'text-violet-700 bg-violet-50 border-violet-200' },
                      ].map(({ key, label, colorClass }) => (
                        <div key={key} className="flex items-center gap-2">
                          <span className={`text-xs font-medium px-2 py-1 rounded-lg border ${colorClass} w-24 flex-shrink-0 text-center`}>{label}</span>
                          <input type="number" min={0}
                            value={config[key] || 0}
                            onChange={e => setConfig({ ...config, [key]: parseInt(e.target.value) || 0 })}
                            className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-sm outline-none focus:border-blue-400 text-center" />
                          <span className="text-xs text-gray-400 w-10">/ day</span>
                        </div>
                      ))}
                      {/* Total indicator */}
                      <div className={`text-xs font-medium text-center py-1.5 rounded-lg ${
                        quotaTotal === 0 ? 'bg-gray-50 text-gray-400' :
                        quotaTotal === config.emails_per_day ? 'bg-green-50 text-green-700' :
                        'bg-amber-50 text-amber-700'
                      }`}>
                        {quotaTotal === 0
                          ? 'No split — all sizes picked equally'
                          : quotaTotal === config.emails_per_day
                            ? `✓ ${quotaTotal} / ${config.emails_per_day} allocated`
                            : `${quotaTotal} / ${config.emails_per_day} — ${Math.abs(quotaRemaining)} ${quotaRemaining > 0 ? 'unallocated' : 'over limit!'}`
                        }
                      </div>
                      <p className="text-xs text-gray-400">Set all to 0 to split evenly across all sizes.</p>
                    </div>
                  ) : useQuotas ? (
                    <div className="mt-1 space-y-1.5">
                      {[
                        { label: '🏪 Small', value: config.small_quota, colorClass: 'bg-sky-100 text-sky-700' },
                        { label: '🏢 Medium', value: config.medium_quota, colorClass: 'bg-indigo-100 text-indigo-700' },
                        { label: '🏭 Large', value: config.large_quota, colorClass: 'bg-violet-100 text-violet-700' },
                      ].map(({ label, value, colorClass }) => (
                        <div key={label} className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">{label}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colorClass}`}>{value} / day</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-1 text-sm text-gray-500">All sizes equally</div>
                  )}
                </div>

                {/* Status */}
                <div>
                  <label className="text-xs text-gray-500 font-medium">Automation Status</label>
                  <div className="mt-1 flex items-center justify-between">
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

                {editConfig && (
                  <div className="flex gap-2 pt-2">
                    <button onClick={saveConfig} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700">Save</button>
                    <button onClick={() => setEditConfig(false)} className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Campaign Log Table */}
        <div className="card overflow-hidden p-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h3 className="font-semibold text-gray-800">Email Campaign Log</h3>
              <p className="text-xs text-gray-400 mt-0.5">Each company receives exactly one outreach email — permanently deduplicated.</p>
            </div>
            <div className="flex items-center gap-2">
              <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 outline-none">
                <option value="">All Types</option>
                {EMAIL_TYPES.filter(Boolean).map(t => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 outline-none">
                <option value="">All Statuses</option>
                {EMAIL_STATUSES.filter(Boolean).map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
              <button onClick={load} title="Refresh"
                className="w-8 h-8 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
                <RefreshCw className="w-4 h-4 text-gray-500" />
              </button>
              <button onClick={() => setShowClearConfirm(true)} title="Clear all logs and reset statuses"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
                Clear All
              </button>
            </div>
          </div>

          {loading ? <LoadingSpinner /> : emails.length === 0 ? (
            <div className="py-16 text-center">
              <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No emails found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Recipient</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sent / ETA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {emails.map((email) => (
                  <tr key={email.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-5 py-3 text-sm text-gray-700">{email.to_email}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-medium">
                        {email.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{email.subject}</td>
                    <td className="px-4 py-3"><StatusBadge status={email.status} /></td>
                    <td className="px-4 py-3 text-xs">
                      {email.status === 'queued' || email.status === 'pending' ? (
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1 text-amber-600 font-semibold">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            {timeUntilScheduledAt(email.scheduled_at)}
                          </div>
                          <div className="text-gray-400 text-xs">
                            {isPreScheduled(email.scheduled_at)
                              ? `for ${new Date(email.scheduled_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} ${new Date(email.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
                              : `queued ${queuedAgo(email.created_at)}`
                            }
                          </div>
                        </div>
                      ) : email.sent_at ? (
                        <span className="text-gray-400">{new Date(email.sent_at).toLocaleString()}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Rows per page:</span>
              <select value={rowsPerPage} onChange={e => { setRowsPerPage(parseInt(e.target.value)); setPage(1) }}
                className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700 outline-none">
                <option value={10}>10</option>
                <option value={50}>50</option>
              </select>
              <span className="text-xs text-gray-400">
                {total > 0 ? `${((page-1)*rowsPerPage)+1}–${Math.min(page*rowsPerPage, total)} of ${total}` : '0 results'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page <= 1}
                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-40 transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${p === page ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page >= totalPages}
                className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 disabled:opacity-40 transition-colors">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
