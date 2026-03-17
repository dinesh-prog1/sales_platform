'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Header from '@/components/layout/Header'
import StatusBadge from '@/components/ui/StatusBadge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import UploadModal from '@/components/companies/UploadModal'
import { companiesApi } from '@/lib/api'
import { Company, CompanyStatus, CompanyStatusStats } from '@/types'
import {
  Upload, Search, RefreshCw, Mail, Globe,
  ChevronDown, ChevronRight, Trash2, RotateCcw, FileSpreadsheet,
  Inbox, Send, TrendingUp, CheckCircle2, XCircle,
  ThumbsUp, CalendarPlus, Play, Trophy, AlertTriangle,
  LucideIcon
} from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

// ────────────────── Constants ──────────────────

const DEPARTMENTS = [
  'Technology & IT', 'Healthcare & Medical', 'Education',
  'Retail & E-commerce', 'Textile & Garments', 'Manufacturing & Industrial',
  'Hospitality & Tourism', 'Financial Services', 'Real Estate & Construction',
  'Transportation & Logistics', 'Professional Services', 'Agriculture & Food',
  'Wellness & Fitness', 'Others',
]

type PipelineStage = {
  key: string
  label: string
  statuses: CompanyStatus[]
  icon: LucideIcon
  color: string
  bg: string
  border: string
  dotColor: string
}

const PIPELINE_STAGES: PipelineStage[] = [
  {
    key: 'new_leads', label: 'New Leads', statuses: ['uploaded'],
    icon: Inbox, color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200', dotColor: 'bg-slate-400',
  },
  {
    key: 'outreach_sent', label: 'Outreach Sent', statuses: ['outreach_sent'],
    icon: Send, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', dotColor: 'bg-blue-400',
  },
  {
    key: 'in_pipeline', label: 'In Pipeline',
    statuses: ['interested', 'demo_invited', 'demo_scheduled', 'demo_completed', 'trial_started'],
    icon: TrendingUp, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dotColor: 'bg-emerald-400',
  },
  {
    key: 'converted', label: 'Converted', statuses: ['converted'],
    icon: CheckCircle2, color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', dotColor: 'bg-green-400',
  },
  {
    key: 'dropped', label: 'Dropped', statuses: ['not_interested', 'trial_expired', 'dropped'],
    icon: XCircle, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', dotColor: 'bg-red-400',
  },
]

const PRIORITY_ORDER: Record<CompanyStatus, number> = {
  uploaded: 0, outreach_sent: 1, interested: 2, demo_invited: 3,
  demo_scheduled: 4, demo_completed: 5, trial_started: 6,
  converted: 7, not_interested: 8, trial_expired: 9, dropped: 10,
}

type QuickAction = { label: string; targetStatus: CompanyStatus; icon: LucideIcon; color: string; bgHover: string }

const QUICK_ACTIONS: Partial<Record<CompanyStatus, QuickAction[]>> = {
  uploaded: [
    { label: 'Send Email', targetStatus: 'outreach_sent', icon: Send, color: 'text-blue-600', bgHover: 'hover:bg-blue-50' },
  ],
  outreach_sent: [
    { label: 'Interested', targetStatus: 'interested', icon: ThumbsUp, color: 'text-emerald-600', bgHover: 'hover:bg-emerald-50' },
    { label: 'Dropped', targetStatus: 'dropped', icon: XCircle, color: 'text-red-500', bgHover: 'hover:bg-red-50' },
  ],
  interested: [
    { label: 'Invite Demo', targetStatus: 'demo_invited', icon: CalendarPlus, color: 'text-purple-600', bgHover: 'hover:bg-purple-50' },
  ],
  demo_completed: [
    { label: 'Start Trial', targetStatus: 'trial_started', icon: Play, color: 'text-amber-600', bgHover: 'hover:bg-amber-50' },
  ],
  trial_started: [
    { label: 'Convert', targetStatus: 'converted', icon: Trophy, color: 'text-emerald-600', bgHover: 'hover:bg-emerald-50' },
  ],
}

// ────────────────── Component ──────────────────

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [statusStats, setStatusStats] = useState<CompanyStatusStats | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [countryFilter, setCountryFilter] = useState('')
  const [sizeFilter, setSizeFilter] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('')

  // Modals
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [resetTarget, setResetTarget] = useState<Company | null>(null)
  const [resetting, setResetting] = useState(false)

  // Expanded states
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>(
    Object.fromEntries(PIPELINE_STAGES.map(s => [s.key, true]))
  )
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [res, stats] = await Promise.all([
        companiesApi.list({ page: 1, limit: 500, search, country: countryFilter, size: sizeFilter, department: deptFilter, sort_by: sortBy === 'priority' ? '' : sortBy }),
        companiesApi.statusStats(),
      ])
      setCompanies(res.companies || [])
      setStatusStats(stats)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [search, countryFilter, sizeFilter, deptFilter, sortBy])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [load])

  // ── Client-side filtering ──
  const filtered = companies.filter(c => {
    if (stageFilter) {
      const stage = PIPELINE_STAGES.find(s => s.key === stageFilter)
      if (stage && !stage.statuses.includes(c.status)) return false
    }
    if (statusFilter && c.status !== statusFilter) return false
    return true
  })

  // ── Sorting ──
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'priority') return PRIORITY_ORDER[a.status] - PRIORITY_ORDER[b.status]
    return 0
  })

  // ── Pipeline grouping ──
  const pipelineGroups = PIPELINE_STAGES.map(stage => {
    const stageCompanies = sorted.filter(c => stage.statuses.includes(c.status))
    const deptMap: Record<string, Company[]> = {}
    stageCompanies.forEach(c => {
      const dept = c.department || c.industry || 'Others'
      if (!deptMap[dept]) deptMap[dept] = []
      deptMap[dept].push(c)
    })
    const departments = Object.entries(deptMap)
      .map(([dept, list]) => ({ dept, list }))
      .sort((a, b) => b.list.length - a.list.length)
    return { ...stage, companies: stageCompanies, departments }
  })

  // ── Needs Attention ──
  const pendingOutreach = companies.filter(c => c.status === 'uploaded').length
  const awaitingResponse = companies.filter(c => c.status === 'outreach_sent').length
  const reEngageable = companies.filter(c => c.status === 'dropped' || c.status === 'not_interested').length
  const showAttention = pendingOutreach > 0 || awaitingResponse > 0 || reEngageable > 0

  const countries = Array.from(new Set(companies.map(c => c.country).filter(Boolean))).sort()
  const toggleStage = (key: string) => setExpandedStages(p => ({ ...p, [key]: !p[key] }))
  const toggleDept = (key: string) => setExpandedDepts(p => ({ ...p, [key]: !p[key] }))

  const handleQuickAction = async (company: Company, targetStatus: CompanyStatus) => {
    try {
      await companiesApi.updateStatus(company.id, targetStatus)
      toast.success(`${company.name} → ${targetStatus.replace(/_/g, ' ')}`)
      load()
    } catch (err: any) { toast.error(err.message) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await companiesApi.delete(deleteTarget.id)
      toast.success(`${deleteTarget.name} deleted`)
      setDeleteTarget(null)
      load()
    } catch (err: any) { toast.error(err.message) } finally { setDeleting(false) }
  }

  const handleResetOutreach = async () => {
    if (!resetTarget) return
    setResetting(true)
    try {
      await companiesApi.resetOutreach(resetTarget.id)
      toast.success(`Outreach reset for ${resetTarget.name}`)
      setResetTarget(null)
      load()
    } catch (err: any) { toast.error(err.message) } finally { setResetting(false) }
  }

  const stageCount = (stage: PipelineStage): number => {
    if (!statusStats) return 0
    return stage.statuses.reduce((sum, s) => sum + ((statusStats as any)[s] || 0), 0)
  }

  return (
    <>
      {showUpload && (
        <UploadModal onClose={() => setShowUpload(false)} onSuccess={() => { setShowUpload(false); load() }} />
      )}

      {/* Delete modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <div className="w-11 h-11 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-5 h-5 text-red-500" strokeWidth={1.5} />
            </div>
            <h3 className="text-base font-semibold text-[#0f172a] text-center mb-1">Delete Company</h3>
            <p className="text-sm text-[#475569] text-center mb-6">
              Permanently delete <span className="font-medium text-[#0f172a]">{deleteTarget.name}</span>?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-[#475569] bg-[#f8f9fc] border border-[#e5e7eb] rounded-xl hover:bg-[#f1f5f9] transition-colors">Cancel</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 disabled:opacity-60 transition-colors">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center mx-auto mb-4">
              <RotateCcw className="w-5 h-5 text-amber-500" strokeWidth={1.5} />
            </div>
            <h3 className="text-base font-semibold text-[#0f172a] text-center mb-1">Reset Outreach</h3>
            <p className="text-sm text-[#475569] text-center mb-5">
              Reset <span className="font-medium text-[#0f172a]">{resetTarget.name}</span> to Uploaded status?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setResetTarget(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-[#475569] bg-[#f8f9fc] border border-[#e5e7eb] rounded-xl hover:bg-[#f1f5f9] transition-colors">Cancel</button>
              <button onClick={handleResetOutreach} disabled={resetting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-amber-500 rounded-xl hover:bg-amber-600 disabled:opacity-60 transition-colors">
                {resetting ? 'Resetting...' : 'Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Header title="Companies" subtitle="Pipeline overview and lead management" />

      <div className="p-7 fade-in">
        {/* ── Pipeline Stats ── */}
        {statusStats && (
          <div className="grid grid-cols-5 gap-3 mb-5">
            {PIPELINE_STAGES.map(stage => {
              const count = stageCount(stage)
              const Icon = stage.icon
              return (
                <button key={stage.key}
                  onClick={() => setStageFilter(stageFilter === stage.key ? '' : stage.key)}
                  className={clsx(
                    'bg-white border rounded-2xl p-4 text-left transition-all shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
                    stageFilter === stage.key
                      ? `${stage.border} ring-1 ring-current ${stage.color}`
                      : 'border-[#e5e7eb] hover:border-[#cbd5e1]'
                  )}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={clsx('w-7 h-7 rounded-lg flex items-center justify-center', stage.bg)}>
                      <Icon className={clsx('w-3.5 h-3.5', stage.color)} strokeWidth={1.5} />
                    </div>
                    <span className="text-[11px] font-medium text-[#94a3b8] uppercase tracking-wider">{stage.label}</span>
                  </div>
                  <div className={clsx('text-2xl font-bold tracking-tight', stage.color)}>{count}</div>
                </button>
              )
            })}
          </div>
        )}

        {/* ── Needs Attention ── */}
        {showAttention && !loading && (
          <div className="bg-amber-50/60 border border-amber-200/60 rounded-2xl p-4 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
              <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Needs Attention</span>
            </div>
            <div className="flex flex-wrap gap-5">
              {pendingOutreach > 0 && (
                <div className="flex items-center gap-2 text-[13px]">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span className="text-[#475569]"><span className="font-semibold text-[#0f172a]">{pendingOutreach}</span> pending outreach</span>
                </div>
              )}
              {awaitingResponse > 0 && (
                <div className="flex items-center gap-2 text-[13px]">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span className="text-[#475569]"><span className="font-semibold text-[#0f172a]">{awaitingResponse}</span> awaiting response</span>
                </div>
              )}
              {reEngageable > 0 && (
                <div className="flex items-center gap-2 text-[13px]">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  <span className="text-[#475569]"><span className="font-semibold text-[#0f172a]">{reEngageable}</span> re-engageable</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Filters ── */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4 mb-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={1.5} />
              <input type="text" placeholder="Search company name..." value={search}
                onChange={e => setSearch(e.target.value)} className="input-field pl-10 h-10" />
            </div>

            <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} className="select-field h-10 min-w-[130px]">
              <option value="">All Stages</option>
              {PIPELINE_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>

            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="select-field h-10 min-w-[140px]">
              <option value="">All Statuses</option>
              <option value="uploaded">Uploaded</option>
              <option value="outreach_sent">Outreach Sent</option>
              <option value="interested">Interested</option>
              <option value="not_interested">Not Interested</option>
              <option value="demo_invited">Demo Invited</option>
              <option value="demo_scheduled">Demo Scheduled</option>
              <option value="demo_completed">Demo Completed</option>
              <option value="trial_started">Trial Started</option>
              <option value="trial_expired">Trial Expired</option>
              <option value="converted">Converted</option>
              <option value="dropped">Dropped</option>
            </select>

            <select value={sizeFilter} onChange={e => setSizeFilter(e.target.value)} className="select-field h-10 min-w-[110px]">
              <option value="">All Sizes</option>
              <option value="large">Large</option>
              <option value="medium">Medium</option>
              <option value="small">Small</option>
            </select>

            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="select-field h-10 min-w-[150px]">
              <option value="">All Depts</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="select-field h-10 min-w-[130px]">
              <option value="">Recent First</option>
              <option value="priority">Priority</option>
              <option value="size_asc">Size: Small → Large</option>
              <option value="size_desc">Size: Large → Small</option>
            </select>

            <div className="flex items-center gap-2 ml-auto">
              <button onClick={load}
                className="w-10 h-10 bg-[#f8f9fc] border border-[#e5e7eb] rounded-xl flex items-center justify-center hover:bg-[#f1f5f9] hover:border-[#cbd5e1] transition-colors">
                <RefreshCw className="w-4 h-4 text-[#475569]" strokeWidth={1.5} />
              </button>
              <button onClick={() => setShowUpload(true)} className="btn-primary flex items-center gap-2 h-10">
                <Upload className="w-4 h-4" strokeWidth={1.5} /> Upload Excel
              </button>
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="py-20"><LoadingSpinner /></div>
        ) : companies.length === 0 ? (
          <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] py-24 text-center">
            <div className="w-16 h-16 bg-[#f8f9fc] border border-[#e5e7eb] rounded-2xl flex items-center justify-center mx-auto mb-5">
              <FileSpreadsheet className="w-7 h-7 text-[#94a3b8]" strokeWidth={1.5} />
            </div>
            <h3 className="text-[#0f172a] font-semibold text-lg mb-1">No companies uploaded yet</h3>
            <p className="text-[#94a3b8] text-sm max-w-xs mx-auto mb-6">Upload your first Excel file to start building your sales pipeline.</p>
            <button onClick={() => setShowUpload(true)} className="btn-primary inline-flex items-center gap-2">
              <Upload className="w-4 h-4" strokeWidth={1.5} /> Upload Companies
            </button>
          </div>
        ) : sorted.length === 0 ? (
          <div className="bg-white border border-[#e5e7eb] rounded-2xl py-16 text-center">
            <Search className="w-10 h-10 text-[#94a3b8] mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-[#475569] font-medium">No companies match your filters</p>
            <p className="text-[#94a3b8] text-sm mt-1">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pipelineGroups.map(stage => {
              if (stage.companies.length === 0) return null
              const isExpanded = expandedStages[stage.key]
              const Icon = stage.icon

              return (
                <div key={stage.key} className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  {/* Stage header */}
                  <button onClick={() => toggleStage(stage.key)}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#f8f9fc] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', stage.bg)}>
                        <Icon className={clsx('w-4 h-4', stage.color)} strokeWidth={1.5} />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className={clsx('font-semibold text-sm', stage.color)}>{stage.label}</span>
                          <span className={clsx('text-[11px] font-medium px-2 py-0.5 rounded-full', stage.bg, stage.color)}>
                            {stage.companies.length}
                          </span>
                        </div>
                        <div className="text-[#94a3b8] text-[11px] mt-0.5">
                          {stage.departments.length} department{stage.departments.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    {isExpanded
                      ? <ChevronDown className="w-4 h-4 text-[#94a3b8]" strokeWidth={1.5} />
                      : <ChevronRight className="w-4 h-4 text-[#94a3b8]" strokeWidth={1.5} />}
                  </button>

                  {/* Table */}
                  {isExpanded && (
                    <div className="overflow-x-auto border-t border-[#e5e7eb]">
                      <table className="w-full table-fixed">
                        <colgroup>
                          <col className="w-[26%]" />
                          <col className="w-[7%]" />
                          <col className="w-[9%]" />
                          <col className="w-[12%]" />
                          <col className="w-[12%]" />
                          <col className="w-[14%]" />
                          <col className="w-[20%]" />
                        </colgroup>
                        <thead>
                          <tr className="bg-[#f8f9fc] border-b border-[#e5e7eb]">
                            <th className="text-left px-5 py-2.5 text-[11px] font-medium text-[#94a3b8] uppercase tracking-wider">Company</th>
                            <th className="text-left px-3 py-2.5 text-[11px] font-medium text-[#94a3b8] uppercase tracking-wider">Size</th>
                            <th className="text-left px-3 py-2.5 text-[11px] font-medium text-[#94a3b8] uppercase tracking-wider">Country</th>
                            <th className="text-left px-3 py-2.5 text-[11px] font-medium text-[#94a3b8] uppercase tracking-wider">Status</th>
                            <th className="text-left px-3 py-2.5 text-[11px] font-medium text-[#94a3b8] uppercase tracking-wider">Contact</th>
                            <th className="text-left px-3 py-2.5 text-[11px] font-medium text-[#94a3b8] uppercase tracking-wider">Dept</th>
                            <th className="text-right px-4 py-2.5 text-[11px] font-medium text-[#94a3b8] uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stage.departments.map(({ dept, list }) => {
                            const key = `${stage.key}-${dept}`
                            const isDeptExpanded = expandedDepts[key] !== false
                            return (
                              <React.Fragment key={key}>
                                <tr className="border-t border-[#f1f5f9]">
                                  <td colSpan={7} className="px-5 py-0">
                                    <button onClick={() => toggleDept(key)}
                                      className="w-full flex items-center justify-between py-2.5 hover:opacity-80 transition-opacity text-left">
                                      <div className="flex items-center gap-2.5">
                                        <div className={clsx('w-1.5 h-1.5 rounded-full', stage.dotColor)} />
                                        <span className="font-medium text-[#0f172a] text-[13px]">{dept}</span>
                                        <span className={clsx('text-[11px] px-2 py-0.5 rounded-full font-medium', stage.bg, stage.color)}>
                                          {list.length}
                                        </span>
                                      </div>
                                      {isDeptExpanded
                                        ? <ChevronDown className="w-3.5 h-3.5 text-[#94a3b8]" strokeWidth={1.5} />
                                        : <ChevronRight className="w-3.5 h-3.5 text-[#94a3b8]" strokeWidth={1.5} />}
                                    </button>
                                  </td>
                                </tr>

                                {isDeptExpanded && list.map(company => {
                                  const actions = QUICK_ACTIONS[company.status] || []
                                  const isTerminal = ['converted', 'not_interested', 'trial_expired', 'dropped'].includes(company.status)
                                  return (
                                    <tr key={company.id} className="group hover:bg-[#f8f9fc] cursor-default transition-colors border-t border-[#f1f5f9]">
                                      <td className="px-5 py-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                          <div className="w-8 h-8 bg-[#00002d] rounded-lg flex items-center justify-center text-cyan-400 text-[10px] font-bold flex-shrink-0 tracking-wide">
                                            {company.name.substring(0, 2).toUpperCase()}
                                          </div>
                                          <div className="min-w-0">
                                            <div className="font-medium text-[#0f172a] text-[13px] truncate">{company.name}</div>
                                            <div className="flex items-center gap-1 text-[#94a3b8] text-[11px] truncate">
                                              <Mail className="w-3 h-3 flex-shrink-0" strokeWidth={1.5} />{company.email}
                                            </div>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-3 py-3"><StatusBadge status={company.size} size="sm" /></td>
                                      <td className="px-3 py-3">
                                        <div className="flex items-center gap-1 text-[12px] text-[#475569] truncate">
                                          <Globe className="w-3 h-3 text-[#94a3b8] flex-shrink-0" strokeWidth={1.5} />{company.country || '—'}
                                        </div>
                                      </td>
                                      <td className="px-3 py-3"><StatusBadge status={company.status} /></td>
                                      <td className="px-3 py-3 text-[12px] text-[#475569] truncate">{company.contact_person || '—'}</td>
                                      <td className="px-3 py-3 text-[12px] text-[#94a3b8] truncate">{company.department || company.industry || '—'}</td>
                                      <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                          {actions.map(action => {
                                            const ActionIcon = action.icon
                                            return (
                                              <button key={action.targetStatus}
                                                onClick={() => handleQuickAction(company, action.targetStatus)}
                                                className={clsx(
                                                  'opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-lg transition-all',
                                                  action.color, action.bgHover
                                                )}
                                                title={action.label}>
                                                <ActionIcon className="w-3 h-3" strokeWidth={1.5} />
                                                {action.label}
                                              </button>
                                            )
                                          })}
                                          {isTerminal && company.status !== 'converted' && (
                                            <button onClick={() => setResetTarget(company)}
                                              className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                              title="Reset outreach">
                                              <RotateCcw className="w-3 h-3" strokeWidth={1.5} /> Reset
                                            </button>
                                          )}
                                          <button onClick={() => setDeleteTarget(company)}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 text-[#94a3b8] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            title="Delete">
                                            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  )
                                })}
                              </React.Fragment>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
