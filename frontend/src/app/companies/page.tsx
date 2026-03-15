'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Header from '@/components/layout/Header'
import StatusBadge from '@/components/ui/StatusBadge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import UploadModal from '@/components/companies/UploadModal'
import { companiesApi } from '@/lib/api'
import { Company } from '@/types'
import {
  Upload, Search, RefreshCw, Building2, Mail, Globe,
  ChevronDown, ChevronRight, Users, Filter, ArrowUpDown, Trash2, RotateCcw
} from 'lucide-react'
import toast from 'react-hot-toast'

const DEPARTMENTS = [
  'Technology & IT', 'Healthcare & Medical', 'Education',
  'Retail & E-commerce', 'Manufacturing & Industrial', 'Hospitality & Tourism',
  'Financial Services', 'Real Estate & Construction', 'Transportation & Logistics',
  'Professional Services', 'Agriculture & Food', 'Wellness & Fitness',
]

const SIZE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  large:  { label: 'Large Companies',  color: 'text-violet-700', bg: 'bg-violet-50',  border: 'border-violet-200', icon: '🏭' },
  medium: { label: 'Medium Companies', color: 'text-indigo-700', bg: 'bg-indigo-50',  border: 'border-indigo-200', icon: '🏢' },
  small:  { label: 'Small Companies',  color: 'text-sky-700',    bg: 'bg-sky-50',     border: 'border-sky-200',    icon: '🏪' },
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [showUpload, setShowUpload] = useState(false)
  const [sizeStats, setSizeStats] = useState<{small: number; medium: number; large: number} | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [countryFilter, setCountryFilter] = useState('')
  const [sizeFilter, setSizeFilter] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [sortBy, setSortBy] = useState('')

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Reset outreach confirmation
  const [resetTarget, setResetTarget] = useState<Company | null>(null)
  const [resetting, setResetting] = useState(false)

  // Expanded state per size group
  const [expandedSizes, setExpandedSizes] = useState<Record<string, boolean>>({ large: true, medium: true, small: true })
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [res, stats] = await Promise.all([
        companiesApi.list({ page: 1, limit: 500, search, country: countryFilter, size: sizeFilter, department: deptFilter, sort_by: sortBy }),
        companiesApi.sizeStats(),
      ])
      setCompanies(res.companies || [])
      setTotal(res.total || 0)
      setSizeStats(stats)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [search, countryFilter, sizeFilter, deptFilter, sortBy])

  useEffect(() => { load() }, [load])

  // Auto-refresh every 30 s so status changes (e.g. "Interested") appear without manual refresh
  useEffect(() => {
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [load])

  // Build categorized structure
  const categorized = (['large', 'medium', 'small'] as const).map(size => {
    const sizeCompanies = companies.filter(c => c.size === size)
    const deptMap: Record<string, Company[]> = {}
    sizeCompanies.forEach(c => {
      const dept = c.department || c.industry || 'Professional Services'
      if (!deptMap[dept]) deptMap[dept] = []
      deptMap[dept].push(c)
    })
    const departments = Object.entries(deptMap)
      .map(([dept, list]) => ({ dept, list }))
      .sort((a, b) => b.list.length - a.list.length)
    return { size, companies: sizeCompanies, departments }
  })

  // Unique countries for filter
  const countries = Array.from(new Set(companies.map(c => c.country).filter(Boolean))).sort()

  const toggleSize = (size: string) => setExpandedSizes(p => ({ ...p, [size]: !p[size] }))
  const toggleDept = (key: string) => setExpandedDepts(p => ({ ...p, [key]: !p[key] }))

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await companiesApi.delete(deleteTarget.id)
      toast.success(`${deleteTarget.name} deleted`)
      setDeleteTarget(null)
      load()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const handleResetOutreach = async () => {
    if (!resetTarget) return
    setResetting(true)
    try {
      await companiesApi.resetOutreach(resetTarget.id)
      toast.success(`Outreach limit reset for ${resetTarget.name}`)
      setResetTarget(null)
      load()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setResetting(false)
    }
  }

  return (
    <>
      {showUpload && (
        <UploadModal onClose={() => setShowUpload(false)} onSuccess={() => { setShowUpload(false); load() }} />
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-1">Delete Company</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Permanently delete <span className="font-medium text-gray-800">{deleteTarget.name}</span>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Outreach confirmation modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <RotateCcw className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-1">Reset Outreach Limit</h3>
            <p className="text-sm text-gray-500 text-center mb-2">
              This will clear all outreach email history for{' '}
              <span className="font-medium text-gray-800">{resetTarget.name}</span> and reset the
              company back to <span className="font-medium text-blue-600">Uploaded</span> status.
            </p>
            <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2 text-center mb-5">
              ⚠️ The company will be eligible to receive outreach again. Use only once per company.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setResetTarget(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResetOutreach}
                disabled={resetting}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-xl hover:bg-amber-600 disabled:opacity-60 transition-colors"
              >
                {resetting ? 'Resetting…' : 'Reset Limit'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Header title="Companies" subtitle="Companies categorized by size and industry" />

      <div className="p-6 fade-in">
        {/* Stats row */}
        {sizeStats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="card text-center">
              <div className="text-3xl font-bold text-blue-600">{total}</div>
              <div className="text-xs text-gray-500 mt-1">Total Companies</div>
            </div>
            {(['large', 'medium', 'small'] as const).map(size => (
              <div key={size} className={`card text-center border ${SIZE_CONFIG[size].border}`}>
                <div className={`text-3xl font-bold ${SIZE_CONFIG[size].color}`}>{sizeStats[size]}</div>
                <div className="text-xs text-gray-500 mt-1">{SIZE_CONFIG[size].label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters bar */}
        <div className="card mb-6">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex-1 min-w-48">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search company name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent text-sm outline-none flex-1 text-gray-700 placeholder-gray-400"
              />
            </div>

            <select value={sizeFilter} onChange={e => setSizeFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none">
              <option value="">All Sizes</option>
              <option value="large">Large</option>
              <option value="medium">Medium</option>
              <option value="small">Small</option>
            </select>

            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none">
              <option value="">All Departments</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            <select value={countryFilter} onChange={e => setCountryFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none">
              <option value="">All Countries</option>
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none">
              <option value="">Default Sort</option>
              <option value="size_asc">Size: Low → High</option>
              <option value="size_desc">Size: High → Low</option>
            </select>

            <button onClick={load} className="w-9 h-9 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors">
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>

            <button onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors ml-auto">
              <Upload className="w-4 h-4" />
              Upload Excel
            </button>
          </div>
        </div>

        {loading ? <LoadingSpinner /> : companies.length === 0 ? (
          <div className="card py-20 text-center">
            <Building2 className="w-14 h-14 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium text-lg">No companies found</p>
            <p className="text-gray-400 text-sm mt-1">Upload an Excel file to get started</p>
            <button onClick={() => setShowUpload(true)}
              className="mt-5 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700">
              Upload Companies
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {categorized.map(({ size, companies: szCos, departments }) => {
              if (szCos.length === 0 && !sizeFilter) return null
              if (sizeFilter && sizeFilter !== size) return null
              const cfg = SIZE_CONFIG[size]
              const isExpanded = expandedSizes[size]

              return (
                <div key={size} className={`border ${cfg.border} rounded-2xl overflow-hidden`}>
                  {/* Size group header */}
                  <button
                    onClick={() => toggleSize(size)}
                    className={`w-full flex items-center justify-between px-5 py-4 ${cfg.bg} hover:opacity-90 transition-opacity`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{cfg.icon}</span>
                      <div className="text-left">
                        <div className={`font-bold text-base ${cfg.color}`}>{cfg.label}</div>
                        <div className="text-gray-500 text-xs">{szCos.length} companies across {departments.length} departments</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-2xl font-bold ${cfg.color}`}>{szCos.length}</span>
                      {isExpanded ? <ChevronDown className={`w-5 h-5 ${cfg.color}`} /> : <ChevronRight className={`w-5 h-5 ${cfg.color}`} />}
                    </div>
                  </button>

                  {/* Single table per size group — columns are always aligned */}
                  {isExpanded && (
                    <div className="overflow-x-auto bg-white">
                      <table className="w-full table-fixed">
                        <colgroup>
                          <col className="w-[28%]" />
                          <col className="w-[8%]" />
                          <col className="w-[9%]" />
                          <col className="w-[10%]" />
                          <col className="w-[15%]" />
                          <col className="w-[16%]" />
                          <col className="w-[14%]" />
                        </colgroup>
                        <thead>
                          <tr className="bg-gray-50/80 border-b border-gray-100">
                            <th className="text-left px-6 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Company</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Size</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Country</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Outreach</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Pipeline</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Contact</th>
                            <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {departments.map(({ dept, list }) => {
                            const key = `${size}-${dept}`
                            const isDeptExpanded = expandedDepts[key] !== false
                            return (
                              <React.Fragment key={key}>
                                {/* Department separator row */}
                                <tr className="border-t border-gray-100">
                                  <td colSpan={7} className="px-6 py-0">
                                    <button
                                      onClick={() => toggleDept(key)}
                                      className="w-full flex items-center justify-between py-3 hover:opacity-80 transition-opacity text-left"
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-2 h-2 rounded-full bg-blue-400" />
                                        <span className="font-semibold text-gray-700 text-sm">{dept}</span>
                                        <span className={`text-xs ${cfg.bg} ${cfg.color} px-2 py-0.5 rounded-full font-medium`}>
                                          {list.length}
                                        </span>
                                      </div>
                                      {isDeptExpanded
                                        ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                                    </button>
                                  </td>
                                </tr>

                                {/* Company rows for this department */}
                                {isDeptExpanded && list.map(company => {
                                  const outreachDone = company.status !== 'uploaded'
                                  return (
                                    <tr key={company.id} className="hover:bg-blue-50/30 transition-colors border-t border-gray-50">
                                      <td className="px-6 py-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                            {company.name.substring(0, 2).toUpperCase()}
                                          </div>
                                          <div className="min-w-0">
                                            <div className="font-semibold text-gray-800 text-sm truncate">{company.name}</div>
                                            <div className="flex items-center gap-1 text-gray-400 text-xs truncate">
                                              <Mail className="w-3 h-3 flex-shrink-0" />{company.email}
                                            </div>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3">
                                        <StatusBadge status={company.size} size="sm" />
                                      </td>
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-1 text-sm text-gray-600 truncate">
                                          <Globe className="w-3 h-3 flex-shrink-0" />{company.country || '—'}
                                        </div>
                                      </td>
                                      <td className="px-4 py-3">
                                        <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                                          outreachDone ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                        }`}>
                                          {outreachDone ? 'Email Sent ✓' : 'Pending'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3">
                                        <StatusBadge status={company.status} />
                                      </td>
                                      <td className="px-4 py-3 text-sm text-gray-600 truncate">
                                        {company.contact_person || '—'}
                                      </td>
                                      <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                          {outreachDone && (
                                            <button
                                              onClick={() => setResetTarget(company)}
                                              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                                              title="Reset outreach limit — allows sending another outreach email"
                                            >
                                              <RotateCcw className="w-3 h-3" />
                                              Reset
                                            </button>
                                          )}
                                          <button
                                            onClick={() => setDeleteTarget(company)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete company permanently"
                                          >
                                            <Trash2 className="w-4 h-4" />
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
