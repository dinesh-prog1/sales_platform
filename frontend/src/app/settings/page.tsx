'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import Header from '@/components/layout/Header'
import { emailsApi } from '@/lib/api'
import {
  Save, Mail, FileText, Settings2, Eye, Code2, ChevronRight,
  Type, Sparkles, Clock, ToggleLeft, ToggleRight, Send,
  ArrowLeft, ArrowRight, Check, LayoutTemplate, AlertCircle,
  RefreshCw, ChevronDown, Globe, Users, Calendar,
  Hash, AtSign, Building2, User, LinkIcon, ExternalLink,
  Star, Pencil, Undo2, Plus, Trash2, GripVertical,
  MessageSquare, Variable, ChevronUp, X,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ═══════════════════════════════════════════════════════════════════════
// TEMPLATE STAGE CONFIG
// ═══════════════════════════════════════════════════════════════════════
const STAGES = [
  { id: 'outreach',      label: 'Outreach',           desc: 'Initial cold outreach to new leads',       icon: Send,          color: '#3B82F6', gradient: 'from-blue-500 to-blue-600',     lightBg: 'bg-blue-50',    lightText: 'text-blue-700'    },
  { id: 'demo_invite',   label: 'Demo Invitation',    desc: 'Invite interested companies to a demo',    icon: Calendar,      color: '#8B5CF6', gradient: 'from-violet-500 to-violet-600', lightBg: 'bg-violet-50',  lightText: 'text-violet-700'  },
  { id: 'demo_confirm',  label: 'Demo Confirmation',  desc: 'Confirm scheduled demo details',           icon: Check,         color: '#10B981', gradient: 'from-emerald-500 to-emerald-600', lightBg: 'bg-emerald-50', lightText: 'text-emerald-700' },
  { id: 'post_demo',     label: 'Post Demo / Trial',  desc: 'Follow up after demo completion',          icon: Sparkles,      color: '#F59E0B', gradient: 'from-amber-500 to-amber-600',   lightBg: 'bg-amber-50',   lightText: 'text-amber-700'   },
  { id: 'trial_reminder', label: 'Trial Reminder',    desc: 'Remind before trial expiration',           icon: Clock,         color: '#EF4444', gradient: 'from-red-500 to-red-600',       lightBg: 'bg-red-50',     lightText: 'text-red-700'     },
  { id: 'feedback',      label: 'Feedback Request',   desc: 'Request feedback from dropped trials',     icon: MessageSquare, color: '#6366F1', gradient: 'from-indigo-500 to-indigo-600', lightBg: 'bg-indigo-50',  lightText: 'text-indigo-700'  },
] as const

// ═══════════════════════════════════════════════════════════════════════
// VARIABLES
// ═══════════════════════════════════════════════════════════════════════
const VARIABLES: Record<string, Array<{ key: string; label: string; icon: any; sample: string }>> = {
  common: [
    { key: '{{company_name}}',   label: 'Company Name',   icon: Building2, sample: 'Acme Corp'   },
    { key: '{{contact_person}}', label: 'Contact Person',  icon: User,      sample: 'John Smith'  },
    { key: '{{email}}',          label: 'Email',           icon: AtSign,    sample: 'john@acme.com' },
    { key: '{{industry}}',       label: 'Industry',        icon: Globe,     sample: 'Technology'  },
    { key: '{{company_size}}',   label: 'Company Size',    icon: Users,     sample: 'Medium'      },
  ],
  outreach:      [{ key: '{{scheduling_link}}', label: 'Scheduling Link', icon: LinkIcon,    sample: 'https://calendly.com/demo' }],
  demo_invite:   [{ key: '{{scheduling_link}}', label: 'Scheduling Link', icon: LinkIcon,    sample: 'https://calendly.com/demo' }],
  demo_confirm:  [
    { key: '{{meeting_link}}', label: 'Meeting Link',    icon: ExternalLink, sample: 'https://meet.google.com/abc' },
    { key: '{{scheduled_at}}', label: 'Scheduled Time',  icon: Calendar,     sample: 'March 20, 2026 at 2:00 PM' },
    { key: '{{booker_name}}',  label: 'Booker Name',     icon: User,         sample: 'John Smith' },
  ],
  post_demo:      [{ key: '{{trial_link}}',    label: 'Trial Link',    icon: LinkIcon, sample: 'https://app.exhibix.com/trial' }],
  trial_reminder: [
    { key: '{{expires_at}}', label: 'Expiry Date', icon: Clock, sample: 'March 25, 2026' },
    { key: '{{days_left}}',  label: 'Days Left',   icon: Hash,  sample: '3' },
  ],
  feedback:       [{ key: '{{feedback_link}}', label: 'Feedback Link', icon: LinkIcon, sample: 'https://app.exhibix.com/feedback' }],
}

function getVarsForType(type: string) { return [...VARIABLES.common, ...(VARIABLES[type] || [])] }

// ═══════════════════════════════════════════════════════════════════════
// SAMPLE DATA + HELPERS
// ═══════════════════════════════════════════════════════════════════════
const SAMPLE: Record<string, string> = {
  '{{company_name}}': 'Acme Corp',    '{{contact_person}}': 'John Smith',
  '{{email}}': 'john@acme.com',       '{{industry}}': 'Technology',
  '{{company_size}}': 'Medium',       '{{scheduling_link}}': 'https://calendly.com/exhibix/demo',
  '{{meeting_link}}': 'https://meet.google.com/abc-defg-hij',
  '{{scheduled_at}}': 'March 20, 2026 at 2:00 PM',
  '{{booker_name}}': 'John Smith',    '{{trial_link}}': 'https://app.exhibix.com/trial/start',
  '{{expires_at}}': 'March 25, 2026', '{{days_left}}': '3',
  '{{feedback_link}}': 'https://app.exhibix.com/feedback',
}

function renderPreview(text: string): string {
  let r = text
  for (const [k, v] of Object.entries(SAMPLE)) r = r.replaceAll(k, v)
  return r
}

function truncateForCard(body: string): string {
  const plain = renderPreview(body).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  const words = plain.split(' ')
  return words.length > 30 ? words.slice(0, 30).join(' ') + '...' : plain
}

// ═══════════════════════════════════════════════════════════════════════
// TEMPLATE TYPE
// ═══════════════════════════════════════════════════════════════════════
interface Template {
  id: string; type: string; name: string; subject: string
  body: string; is_active: boolean; created_at: string; updated_at: string
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export default function SettingsPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [config, setConfig] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('templates')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // Editor state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editorMode, setEditorMode] = useState<'visual' | 'html'>('visual')
  const [draft, setDraft] = useState<{ name: string; subject: string; body: string } | null>(null)
  const [history, setHistory] = useState<Array<{ subject: string; body: string }>>([])
  const [showVars, setShowVars] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  // Resizable panel
  const [splitRatio, setSplitRatio] = useState(55) // % left panel
  const dragging = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Collapsed sections
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  // Creating new template
  const [creatingFor, setCreatingFor] = useState<string | null>(null)
  const [newName, setNewName] = useState('')

  // ─── Data Loading ──────────────────────────────────────────────────
  const load = useCallback(() => {
    setLoading(true)
    Promise.all([emailsApi.templates(), emailsApi.config()]).then(([t, c]) => {
      setTemplates(t || [])
      setConfig(c)
      setLoading(false)
    }).catch(err => { toast.error(err.message); setLoading(false) })
  }, [])

  useEffect(() => { load() }, [load])

  // ─── Editing Template ──────────────────────────────────────────────
  const editingTemplate = editingId ? templates.find(t => t.id === editingId) : null
  const editingStage = editingTemplate ? STAGES.find(s => s.id === editingTemplate.type) : null
  const editVars = useMemo(() => editingTemplate ? getVarsForType(editingTemplate.type) : [], [editingTemplate])

  const openEditor = (tmpl: Template) => {
    setEditingId(tmpl.id)
    setDraft({ name: tmpl.name, subject: tmpl.subject, body: tmpl.body })
    setHistory([])
    setShowVars(false)
  }

  const closeEditor = () => {
    if (draft && editingTemplate &&
        (draft.subject !== editingTemplate.subject || draft.body !== editingTemplate.body || draft.name !== editingTemplate.name)) {
      if (!window.confirm('Discard unsaved changes?')) return
    }
    setEditingId(null)
    setDraft(null)
    setHistory([])
  }

  const isDirty = useMemo(() => {
    if (!draft || !editingTemplate) return false
    return draft.subject !== editingTemplate.subject || draft.body !== editingTemplate.body || draft.name !== editingTemplate.name
  }, [draft, editingTemplate])

  const updateDraft = useCallback((field: 'name' | 'subject' | 'body', value: string) => {
    if (!draft) return
    if (field === 'subject' || field === 'body') {
      setHistory(h => [...h.slice(-20), { subject: draft.subject, body: draft.body }])
    }
    setDraft(d => d ? { ...d, [field]: value } : d)
  }, [draft])

  const undoDraft = useCallback(() => {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setDraft(d => d ? { ...d, ...prev } : d)
    setHistory(h => h.slice(0, -1))
  }, [history])

  const insertVariable = useCallback((variable: string) => {
    const textarea = bodyRef.current
    if (!textarea || !draft) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newBody = draft.body.substring(0, start) + variable + draft.body.substring(end)
    updateDraft('body', newBody)
    setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + variable.length, start + variable.length) }, 0)
  }, [draft, updateDraft])

  const resetDraft = useCallback(() => {
    if (!editingTemplate) return
    setDraft({ name: editingTemplate.name, subject: editingTemplate.subject, body: editingTemplate.body })
    setHistory([])
    toast.success('Reverted to saved version')
  }, [editingTemplate])

  // ─── API Actions ───────────────────────────────────────────────────
  const saveTemplate = async () => {
    if (!editingId || !draft) return
    setSaving(true)
    try {
      await emailsApi.updateTemplateByID(editingId, { name: draft.name, subject: draft.subject, body: draft.body })
      setTemplates(prev => prev.map(t => t.id === editingId ? { ...t, ...draft } : t))
      setHistory([])
      toast.success('Template saved!')
    } catch (err: any) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  const activateTemplate = async (id: string) => {
    try {
      await emailsApi.activateTemplate(id)
      // Reload to get fresh active states
      const t = await emailsApi.templates()
      setTemplates(t || [])
      toast.success('Template activated!')
    } catch (err: any) { toast.error(err.message) }
  }

  const deleteTemplate = async (id: string) => {
    if (!window.confirm('Delete this template?')) return
    try {
      await emailsApi.deleteTemplate(id)
      setTemplates(prev => prev.filter(t => t.id !== id))
      if (editingId === id) { setEditingId(null); setDraft(null) }
      // Reload to get potentially new active template
      const t = await emailsApi.templates()
      setTemplates(t || [])
      toast.success('Template deleted')
    } catch (err: any) { toast.error(err.message) }
  }

  const createTemplate = async (stageId: string) => {
    if (!newName.trim()) { toast.error('Enter a template name'); return }
    try {
      const t = await emailsApi.createTemplate({
        type: stageId,
        name: newName.trim(),
        subject: `New ${STAGES.find(s => s.id === stageId)?.label || ''} Template`,
        body: `Hi {{contact_person}},\n\nWrite your email content here...\n\nBest regards,\nEXHIBIX Team`,
      })
      setTemplates(prev => [...prev, t])
      setCreatingFor(null)
      setNewName('')
      toast.success('Template created!')
      openEditor(t)
    } catch (err: any) { toast.error(err.message) }
  }

  const saveConfig = async () => {
    if (!config) return
    setSaving(true)
    try { await emailsApi.updateConfig(config); toast.success('Configuration saved!') }
    catch (err: any) { toast.error(err.message) }
    finally { setSaving(false) }
  }

  // ─── Resizable Divider ────────────────────────────────────────────
  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = ((ev.clientX - rect.left) / rect.width) * 100
      setSplitRatio(Math.min(75, Math.max(30, pct)))
    }
    const onUp = () => { dragging.current = false; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

  // Computed preview
  const previewSubject = useMemo(() => draft ? renderPreview(draft.subject) : '', [draft])
  const previewBody = useMemo(() => draft ? renderPreview(draft.body) : '', [draft])

  // Group templates by stage
  const templatesByStage = useMemo(() => {
    const map: Record<string, Template[]> = {}
    for (const s of STAGES) map[s.id] = []
    for (const t of templates) {
      if (map[t.type]) map[t.type].push(t)
    }
    return map
  }, [templates])

  // ─── Loading State ─────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <Header title="Settings" subtitle="Configure email automation and templates" />
        <div className="p-5 flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-3 text-gray-400">
            <RefreshCw className="w-5 h-5 animate-spin" /><span className="text-sm">Loading settings...</span>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Settings" subtitle="Configure email automation and templates" />

      <div className="px-5 pt-4 pb-5 fade-in space-y-3">
        {/* Tab Bar */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1 bg-white rounded-xl p-1 w-fit shadow-sm border border-gray-100">
            {[
              { id: 'templates', label: 'Email Templates', icon: LayoutTemplate },
              { id: 'config', label: 'Configuration', icon: Settings2 },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => { setActiveTab(id); if (id === 'templates') { setEditingId(null); setDraft(null) } }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === id ? 'bg-[#00002d] text-cyan-400 shadow-sm' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={1.5} />{label}
              </button>
            ))}
          </div>
          {activeTab === 'templates' && !editingId && (
            <div className="flex items-center gap-2 text-[10px] text-gray-400">
              <span className="font-medium">{templates.length} templates</span>
              <span className="text-gray-300">&middot;</span>
              <span className="flex items-center gap-1 text-green-600 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                {templates.filter(t => t.is_active).length} active
              </span>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TEMPLATES — SECTION GRID VIEW                                 */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'templates' && !editingId && (
          <div className="space-y-4">
            {STAGES.map((stage) => {
              const stageTemplates = templatesByStage[stage.id] || []
              const isCollapsed = collapsed.has(stage.id)
              const activeCount = stageTemplates.filter(t => t.is_active).length
              const canAdd = stageTemplates.length < 5

              return (
                <div key={stage.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Section Header */}
                  <button
                    onClick={() => setCollapsed(prev => {
                      const next = new Set(prev)
                      next.has(stage.id) ? next.delete(stage.id) : next.add(stage.id)
                      return next
                    })}
                    className="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${stage.gradient} flex items-center justify-center shadow-sm`}>
                        <stage.icon className="w-4 h-4 text-white" strokeWidth={2} />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold text-gray-800">{stage.label}</div>
                        <div className="text-[10px] text-gray-400">{stage.desc}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-gray-400">{stageTemplates.length}/5 templates</span>
                        {activeCount > 0 && (
                          <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />ACTIVE
                          </span>
                        )}
                      </div>
                      {isCollapsed ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>

                  {/* Template Cards Grid */}
                  {!isCollapsed && (
                    <div className="px-5 pb-4 pt-1">
                      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
                        {stageTemplates.map((tmpl) => (
                          <div
                            key={tmpl.id}
                            className={`group relative rounded-xl border-2 transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${
                              tmpl.is_active ? 'border-green-300 bg-green-50/20' : 'border-gray-100 bg-white'
                            }`}
                            onClick={() => openEditor(tmpl)}
                          >
                            {/* Active badge */}
                            {tmpl.is_active && (
                              <div className="absolute -top-1.5 -right-1.5 z-10">
                                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
                                  <Star className="w-2.5 h-2.5 text-white fill-white" />
                                </div>
                              </div>
                            )}

                            {/* Mini Preview */}
                            <div className="p-3 pb-2">
                              <div className="text-[11px] font-bold text-gray-700 truncate mb-1.5">{tmpl.name}</div>
                              <div className="bg-gray-50 rounded-lg p-2 min-h-[64px] max-h-[64px] overflow-hidden relative border border-gray-100">
                                <div className="text-[9px] text-gray-400 font-medium truncate mb-1">
                                  {renderPreview(tmpl.subject).substring(0, 50)}
                                </div>
                                <div className="text-[8px] text-gray-400 leading-relaxed">
                                  {truncateForCard(tmpl.body) || <span className="italic text-gray-300">Empty</span>}
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-gray-50 to-transparent" />
                              </div>
                            </div>

                            {/* Card Footer */}
                            <div className="px-3 pb-2.5 flex items-center justify-between">
                              <span className="text-[9px] text-gray-400">{tmpl.body.length} chars</span>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!tmpl.is_active && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); activateTemplate(tmpl.id) }}
                                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold bg-green-50 text-green-600 hover:bg-green-100 transition-colors border border-green-200"
                                    title="Set as active template"
                                  >
                                    <Star className="w-2 h-2" />Active
                                  </button>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); openEditor(tmpl) }}
                                  className="w-5 h-5 rounded flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-[#00002d] hover:text-cyan-400 transition-colors"
                                  title="Edit template"
                                >
                                  <Pencil className="w-2.5 h-2.5" strokeWidth={2} />
                                </button>
                                {!tmpl.is_active && stageTemplates.length > 1 && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); deleteTemplate(tmpl.id) }}
                                    className="w-5 h-5 rounded flex items-center justify-center bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                                    title="Delete template"
                                  >
                                    <Trash2 className="w-2.5 h-2.5" strokeWidth={2} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Add Template Card */}
                        {canAdd && (
                          <div className="rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center min-h-[120px] hover:border-gray-300 hover:bg-gray-50/50 transition-all">
                            {creatingFor === stage.id ? (
                              <div className="px-3 py-2 w-full space-y-2">
                                <input
                                  type="text"
                                  value={newName}
                                  onChange={e => setNewName(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') createTemplate(stage.id); if (e.key === 'Escape') { setCreatingFor(null); setNewName('') } }}
                                  placeholder="Template name..."
                                  className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100"
                                  autoFocus
                                />
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => createTemplate(stage.id)}
                                    className="flex-1 text-[10px] font-semibold py-1 rounded-lg bg-[#00002d] text-cyan-400 hover:bg-[#000040] transition-colors"
                                  >Create</button>
                                  <button
                                    onClick={() => { setCreatingFor(null); setNewName('') }}
                                    className="px-2 py-1 text-[10px] rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                                  ><X className="w-3 h-3" /></button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setCreatingFor(stage.id); setNewName('') }}
                                className="flex flex-col items-center gap-1.5 text-gray-400 hover:text-gray-600 transition-colors p-3"
                              >
                                <Plus className="w-5 h-5" strokeWidth={1.5} />
                                <span className="text-[10px] font-medium">Add Template</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Pipeline Overview */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-3">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">Automation Pipeline</div>
              <div className="flex items-center justify-between">
                {STAGES.map((stage, i) => {
                  const stageT = templatesByStage[stage.id] || []
                  const hasActive = stageT.some(t => t.is_active)
                  return (
                    <div key={stage.id} className="flex items-center flex-1">
                      <div className="flex flex-col items-center gap-1 flex-1">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                          hasActive ? `bg-gradient-to-br ${stage.gradient} shadow-sm` : 'bg-gray-100'
                        }`}>
                          <stage.icon className={`w-3.5 h-3.5 ${hasActive ? 'text-white' : 'text-gray-400'}`} strokeWidth={1.5} />
                        </div>
                        <span className="text-[8px] font-semibold text-gray-500 text-center truncate max-w-[70px]">{stage.label}</span>
                        <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded-full ${
                          hasActive ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'
                        }`}>{stageT.length} tmpl{stageT.length !== 1 ? 's' : ''}</span>
                      </div>
                      {i < STAGES.length - 1 && <ArrowRight className={`w-3.5 h-3.5 flex-shrink-0 mx-0.5 ${hasActive ? 'text-gray-400' : 'text-gray-200'}`} />}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TEMPLATES — EDITOR VIEW (RESIZABLE)                           */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'templates' && editingId && editingTemplate && editingStage && draft && (
          <div className="space-y-3">
            {/* Editor Toolbar */}
            <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-2">
              <div className="flex items-center gap-3">
                <button onClick={closeEditor} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />Gallery
                </button>
                <div className="w-px h-5 bg-gray-200" />
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${editingStage.gradient} flex items-center justify-center`}>
                    <editingStage.icon className="w-3.5 h-3.5 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-800">{editingStage.label}</div>
                    <div className="text-[10px] text-gray-400">{draft.name}</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={undoDraft} disabled={history.length === 0}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-30"
                  title="Undo"><Undo2 className="w-3 h-3" strokeWidth={2} />Undo</button>
                <button onClick={resetDraft}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium text-gray-500 hover:bg-gray-100 transition-colors"
                  title="Reset to saved"><RefreshCw className="w-3 h-3" strokeWidth={2} />Reset</button>
                <div className="w-px h-5 bg-gray-200" />
                <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                  <button onClick={() => setEditorMode('visual')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${
                      editorMode === 'visual' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>
                    <Type className="w-3 h-3" />Visual</button>
                  <button onClick={() => setEditorMode('html')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${
                      editorMode === 'html' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>
                    <Code2 className="w-3 h-3" />HTML</button>
                </div>
                <div className="w-px h-5 bg-gray-200" />
                <button onClick={() => activateTemplate(editingId)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all border ${
                    editingTemplate.is_active
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-green-300 hover:text-green-600'}`}>
                  {editingTemplate.is_active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                  {editingTemplate.is_active ? 'Active' : 'Set Active'}
                </button>
                <button onClick={saveTemplate} disabled={saving || !isDirty}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[11px] font-bold bg-[#00002d] text-cyan-400 hover:bg-[#000040] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
                  <Save className="w-3.5 h-3.5" strokeWidth={2} />{saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>

            {/* Resizable Split Panel */}
            <div ref={containerRef} className="flex rounded-2xl border border-gray-100 shadow-sm overflow-hidden bg-white" style={{ minHeight: 'calc(100vh - 230px)' }}>
              {/* ─ LEFT: Editor ─ */}
              <div className="flex flex-col min-w-0 overflow-hidden" style={{ width: `${splitRatio}%` }}>
                {/* Template Name */}
                <div className="px-5 py-2.5 border-b border-gray-100 flex items-center gap-2">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider flex-shrink-0">Name</label>
                  <input
                    type="text"
                    value={draft.name}
                    onChange={e => updateDraft('name', e.target.value)}
                    className="text-xs font-semibold text-gray-700 bg-transparent border-0 outline-none flex-1"
                    placeholder="Template name..."
                  />
                </div>

                {/* Subject */}
                <div className="px-5 py-2.5 border-b border-gray-100">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Subject Line</label>
                  <input type="text" value={draft.subject} onChange={e => updateDraft('subject', e.target.value)}
                    placeholder="Enter email subject..." className="w-full text-sm text-gray-800 font-semibold bg-transparent border-0 outline-none placeholder:text-gray-300" />
                </div>

                {/* Variable Bar */}
                <div className="px-5 py-2 border-b border-gray-100 bg-gray-50/40 flex items-center gap-1.5 flex-wrap">
                  <Variable className="w-3 h-3 text-violet-400 flex-shrink-0" strokeWidth={2} />
                  <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mr-0.5">Insert:</span>
                  {editVars.slice(0, 5).map(v => (
                    <button key={v.key} onClick={() => insertVariable(v.key)}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-white border border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50/50 transition-all shadow-sm"
                      title={`Insert ${v.label}`}>
                      <v.icon className="w-2.5 h-2.5" strokeWidth={1.5} />{v.label}
                    </button>
                  ))}
                  {editVars.length > 5 && (
                    <button onClick={() => setShowVars(!showVars)}
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-violet-50 border border-violet-200 text-violet-600 hover:bg-violet-100 transition-all">
                      +{editVars.length - 5}
                      <ChevronDown className={`w-2 h-2 transition-transform ${showVars ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>
                {showVars && editVars.length > 5 && (
                  <div className="px-5 py-1.5 border-b border-gray-100 bg-violet-50/20 flex items-center gap-1.5 flex-wrap">
                    {editVars.slice(5).map(v => (
                      <button key={v.key} onClick={() => insertVariable(v.key)}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-white border border-violet-200 text-violet-600 hover:bg-violet-50 transition-all">
                        <v.icon className="w-2.5 h-2.5" strokeWidth={1.5} />{v.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Body */}
                <div className="flex-1 min-h-0">
                  <textarea ref={bodyRef} value={draft.body} onChange={e => updateDraft('body', e.target.value)}
                    placeholder={editorMode === 'html' ? '<html>...</html>' : 'Write your email content here...'}
                    className={`w-full h-full px-5 py-4 text-sm text-gray-700 bg-transparent border-0 outline-none resize-none leading-relaxed placeholder:text-gray-300 ${
                      editorMode === 'html' ? 'font-mono text-xs bg-gray-50/30' : ''}`}
                    spellCheck={editorMode === 'visual'} />
                </div>

                {/* Footer */}
                <div className="px-5 py-2 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-gray-400">{draft.body.length} chars</span>
                    {isDirty && (
                      <span className="flex items-center gap-1 text-[10px] text-amber-600 font-semibold">
                        <AlertCircle className="w-3 h-3" />Unsaved
                      </span>
                    )}
                  </div>
                  {/* Quick template nav */}
                  <div className="flex items-center gap-1">
                    {(templatesByStage[editingTemplate.type] || []).map(t => (
                      <button key={t.id} onClick={() => {
                        if (t.id === editingId) return
                        if (isDirty && !window.confirm('Discard unsaved changes?')) return
                        openEditor(t)
                      }}
                        className={`px-1.5 py-0.5 rounded text-[8px] font-semibold transition-all ${
                          t.id === editingId ? 'text-white shadow-sm' : `${editingStage.lightBg} ${editingStage.lightText} hover:opacity-80`}`}
                        style={t.id === editingId ? { backgroundColor: editingStage.color } : {}}
                        title={t.name}>
                        {t.name.substring(0, 8)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ─ DRAGGABLE DIVIDER ─ */}
              <div
                onMouseDown={onDividerMouseDown}
                className="w-2 flex-shrink-0 bg-gray-100 hover:bg-blue-200 active:bg-blue-300 cursor-col-resize flex items-center justify-center transition-colors group relative"
              >
                <div className="w-0.5 h-8 bg-gray-300 group-hover:bg-blue-400 rounded-full transition-colors" />
              </div>

              {/* ─ RIGHT: Live Preview ─ */}
              <div className="flex flex-col min-w-0 overflow-hidden" style={{ width: `${100 - splitRatio}%` }}>
                {/* Preview Header */}
                <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-gray-400" strokeWidth={2} />
                    <span className="text-[11px] font-bold text-gray-600">Live Preview</span>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-semibold">Sample Data</span>
                </div>

                {/* Gmail-like Preview */}
                <div className="flex-1 overflow-y-auto bg-gray-50/30">
                  <div className="p-4">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      {/* Header */}
                      <div className="px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center gap-2.5 mb-2">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00002d] to-[#1565c0] flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-black text-white tracking-tight">EX</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-800">EXHIBIX</span>
                              <span className="text-[10px] text-gray-400">&lt;noreply@exhibix.com&gt;</span>
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5">to {SAMPLE['{{contact_person}}']} &lt;{SAMPLE['{{email}}']}&gt;</div>
                          </div>
                        </div>
                        <div className="text-sm font-bold text-gray-800">
                          {previewSubject || <span className="text-gray-300 font-normal italic">No subject</span>}
                        </div>
                      </div>
                      {/* Body */}
                      <div className="px-4 py-4">
                        {editorMode === 'html' ? (
                          <div className="text-xs text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: previewBody }} />
                        ) : (
                          <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {previewBody || <span className="text-gray-300 italic">Start typing to see preview...</span>}
                          </div>
                        )}
                      </div>
                      <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
                        <div className="text-[9px] text-gray-400 text-center">Sent via EXHIBIX Sales Automation</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Variables Status */}
                <div className="border-t border-gray-100 px-4 py-2.5">
                  <div className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Variables Used</div>
                  <div className="flex flex-wrap gap-1">
                    {editVars.filter(v => draft.body.includes(v.key) || draft.subject.includes(v.key)).map(v => (
                      <span key={v.key} className="text-[8px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-600 font-mono font-medium">{v.key}</span>
                    ))}
                    {editVars.filter(v => draft.body.includes(v.key) || draft.subject.includes(v.key)).length === 0 && (
                      <span className="text-[9px] text-gray-300 italic">None</span>
                    )}
                  </div>
                  {(() => {
                    const unused = editVars.filter(v => !draft.body.includes(v.key) && !draft.subject.includes(v.key))
                    if (unused.length === 0) return null
                    return (
                      <div className="mt-2">
                        <div className="text-[8px] font-bold text-amber-500 uppercase tracking-wider mb-1">Available</div>
                        <div className="flex flex-wrap gap-1">
                          {unused.map(v => (
                            <button key={v.key} onClick={() => insertVariable(v.key)}
                              className="text-[8px] px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-all font-mono">
                              {v.key}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* CONFIG TAB                                                    */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'config' && config && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-w-5xl">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                <Send className="w-3.5 h-3.5 text-blue-500" strokeWidth={1.5} />
                <span className="text-xs font-semibold text-gray-700">Outreach Settings</span>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Emails Per Day</label>
                  <input type="number" value={config.emails_per_day}
                    onChange={e => setConfig({ ...config, emails_per_day: parseInt(e.target.value) })}
                    min={1} max={500}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100 transition-all" />
                  <p className="text-[10px] text-gray-400 mt-1">All emails send at the configured time each day</p>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Target Company Size</label>
                  <select value={config.target_size} onChange={e => setConfig({ ...config, target_size: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100 transition-all bg-white">
                    <option value="all">All Sizes</option>
                    <option value="small">Small Only</option>
                    <option value="medium">Medium Only</option>
                    <option value="large">Large Only</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Send Time (Hour)</label>
                  <select value={config.cron_hour || 9} onChange={e => setConfig({ ...config, cron_hour: parseInt(e.target.value) })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100 transition-all bg-white">
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">Daily batch send time</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-violet-500" strokeWidth={1.5} />
                <span className="text-xs font-semibold text-gray-700">Demo & Scheduling</span>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">Scheduling Link</label>
                  <input type="url" value={config.scheduling_link}
                    onChange={e => setConfig({ ...config, scheduling_link: e.target.value })}
                    placeholder="https://calendly.com/your-link"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100 transition-all" />
                  <p className="text-[10px] text-gray-400 mt-1">Inserted via {'{{scheduling_link}}'}</p>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <div className="text-xs font-semibold text-gray-700">Automation Active</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Enable/disable automated outreach</div>
                  </div>
                  <button onClick={() => setConfig({ ...config, is_active: !config.is_active })}
                    className={`w-11 h-6 rounded-full transition-colors relative ${config.is_active ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 transition-transform ${config.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.5} />
                <span className="text-xs font-semibold text-gray-700">Size-Based Quotas</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium ml-auto">Optional</span>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-[10px] text-gray-400">Override with per-size quotas. Leave all at 0 for global setting.</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'small_quota', label: 'Small' },
                    { key: 'medium_quota', label: 'Medium' },
                    { key: 'large_quota', label: 'Large' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="text-[10px] font-semibold text-gray-500 block mb-1">{label}</label>
                      <input type="number" value={config[key] || 0}
                        onChange={e => setConfig({ ...config, [key]: parseInt(e.target.value) || 0 })}
                        min={0} max={200}
                        className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100 transition-all text-center" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex items-end">
              <div className="p-4 w-full">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-xs font-semibold text-gray-700">Configuration Status</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {config.is_active
                        ? <span className="text-green-600">Active — {config.emails_per_day} emails/day at {config.cron_hour || 9}:00</span>
                        : <span className="text-amber-600">Paused — no automatic emails</span>}
                    </div>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full ${config.is_active ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                </div>
                <button onClick={saveConfig} disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-[#00002d] text-cyan-400 hover:bg-[#000040] transition-colors disabled:opacity-50">
                  <Save className="w-4 h-4" strokeWidth={2} />{saving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
