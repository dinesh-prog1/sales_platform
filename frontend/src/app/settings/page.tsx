'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import { emailsApi } from '@/lib/api'
import { Save, Mail, FileText, Settings2 } from 'lucide-react'
import toast from 'react-hot-toast'

const TEMPLATE_TYPES = [
  { type: 'outreach', label: 'Outreach Email', desc: 'Initial cold outreach to companies' },
  { type: 'demo_invite', label: 'Demo Invitation', desc: 'Sent when company shows interest' },
  { type: 'demo_confirm', label: 'Demo Confirmation', desc: 'Sent after demo is scheduled' },
  { type: 'post_demo', label: 'Post Demo / Trial', desc: 'Sent after demo is completed' },
  { type: 'trial_reminder', label: 'Trial Reminder', desc: 'Sent 3 days before trial expires' },
  { type: 'feedback', label: 'Feedback Request', desc: 'Sent when trial drops without converting' },
]

export default function SettingsPage() {
  const [templates, setTemplates] = useState<any[]>([])
  const [config, setConfig] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('config')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('outreach')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([emailsApi.templates(), emailsApi.config()]).then(([t, c]) => {
      setTemplates(t || [])
      setConfig(c)
      setLoading(false)
    }).catch(err => {
      toast.error(err.message)
      setLoading(false)
    })
  }, [])

  const currentTemplate = templates.find(t => t.type === selectedTemplate)

  const saveTemplate = async () => {
    if (!currentTemplate) return
    setSaving(true)
    try {
      await emailsApi.updateTemplate(selectedTemplate, {
        subject: currentTemplate.subject,
        body: currentTemplate.body,
        is_active: currentTemplate.is_active,
      })
      toast.success('Template saved!')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const saveConfig = async () => {
    if (!config) return
    setSaving(true)
    try {
      await emailsApi.updateConfig(config)
      toast.success('Configuration saved!')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const updateTemplate = (field: string, value: string) => {
    setTemplates(prev => prev.map(t =>
      t.type === selectedTemplate ? { ...t, [field]: value } : t
    ))
  }

  return (
    <>
      <Header title="Settings" subtitle="Configure email automation and templates" />

      <div className="p-6 fade-in">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 w-fit shadow-sm border border-gray-100">
          {[
            { id: 'config', label: 'Configuration', icon: Settings2 },
            { id: 'templates', label: 'Email Templates', icon: FileText },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'config' && config && (
          <div className="max-w-2xl">
            <div className="card">
              <h2 className="text-base font-bold text-gray-800 mb-6">Outreach Configuration</h2>

              <div className="space-y-5">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Emails Per Day</label>
                  <input
                    type="number"
                    value={config.emails_per_day}
                    onChange={e => setConfig({ ...config, emails_per_day: parseInt(e.target.value) })}
                    min={1} max={500}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                  <p className="text-xs text-gray-400 mt-1">All emails send in one go at the configured time each day</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Target Company Size</label>
                  <select
                    value={config.target_size}
                    onChange={e => setConfig({ ...config, target_size: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="all">All Sizes</option>
                    <option value="small">Small Only</option>
                    <option value="medium">Medium Only</option>
                    <option value="large">Large Only</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1.5">Demo Scheduling Link</label>
                  <input
                    type="url"
                    value={config.scheduling_link}
                    onChange={e => setConfig({ ...config, scheduling_link: e.target.value })}
                    placeholder="https://calendly.com/your-link"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                  <p className="text-xs text-gray-400 mt-1">Inserted into demo invite emails</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <div className="text-sm font-medium text-gray-700">Automation Active</div>
                    <div className="text-xs text-gray-400 mt-0.5">Enable/disable automated outreach</div>
                  </div>
                  <button
                    onClick={() => setConfig({ ...config, is_active: !config.is_active })}
                    className={`w-12 h-6 rounded-full transition-colors relative ${config.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 transition-transform ${config.is_active ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                <button
                  onClick={saveConfig}
                  disabled={saving}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Template list */}
            <div className="card p-0 overflow-hidden">
              {TEMPLATE_TYPES.map(({ type, label, desc }) => (
                <button
                  key={type}
                  onClick={() => setSelectedTemplate(type)}
                  className={`w-full text-left px-4 py-3.5 border-b border-gray-100 last:border-0 transition-colors ${
                    selectedTemplate === type ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      selectedTemplate === type ? 'bg-blue-600' : 'bg-gray-100'
                    }`}>
                      <Mail className={`w-4 h-4 ${selectedTemplate === type ? 'text-white' : 'text-gray-500'}`} />
                    </div>
                    <div>
                      <div className={`text-sm font-medium ${selectedTemplate === type ? 'text-blue-700' : 'text-gray-700'}`}>
                        {label}
                      </div>
                      <div className="text-xs text-gray-400">{desc}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Template editor */}
            {currentTemplate ? (
              <div className="card lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">
                    {TEMPLATE_TYPES.find(t => t.type === selectedTemplate)?.label}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Variables: </span>
                    {['{{company_name}}', '{{contact_person}}', '{{scheduling_link}}'].map(v => (
                      <span key={v} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-mono">{v}</span>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1.5">Subject Line</label>
                    <input
                      type="text"
                      value={currentTemplate.subject}
                      onChange={e => updateTemplate('subject', e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1.5">Email Body</label>
                    <textarea
                      value={currentTemplate.body}
                      onChange={e => updateTemplate('body', e.target.value)}
                      rows={14}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none"
                    />
                  </div>
                  <button
                    onClick={saveTemplate}
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save Template'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="card lg:col-span-2 flex items-center justify-center py-16">
                <div className="text-center">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Select a template to edit</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
