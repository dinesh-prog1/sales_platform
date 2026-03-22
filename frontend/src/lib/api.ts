import axios from 'axios'

const API_PREFIX = '/api/v1'
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
const AUTH_TOKEN_KEY = 'aisales_admin_jwt'

function normalizeApiBaseUrl(rawUrl: string) {
  const trimmed = rawUrl.trim().replace(/\/+$/, '')
  if (!trimmed) return 'http://localhost:8080'
  if (trimmed.endsWith(API_PREFIX)) {
    return trimmed.slice(0, -API_PREFIX.length)
  }
  return trimmed
}

export const api = axios.create({
  baseURL: `${normalizeApiBaseUrl(BASE_URL)}${API_PREFIX}`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

function getAuthToken() {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(AUTH_TOKEN_KEY)
    if (stored) return stored
  }
  return ''
}

function isPublicEndpoint(url?: string) {
  if (!url) return false

  return (
    url === '/auth/login' ||
    url === '/emails/respond-outreach' ||
    url === '/demos/book' ||
    url === '/demos/public-schedule' ||
    url.startsWith('/demos/slots') ||
    url === '/trials/respond' ||
    url === '/subscriptions'
  )
}

api.interceptors.request.use((config) => {
  if (!isPublicEndpoint(config.url)) {
    const token = getAuthToken()
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`)
    }
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    const method = err.config?.method?.toUpperCase()
    const url = err.config?.url
    const serverMessage =
      typeof err.response?.data?.error === 'string'
        ? err.response.data.error
        : typeof err.response?.data?.message === 'string'
          ? err.response.data.message
          : ''

    if (status === 401 && typeof window !== 'undefined') {
      window.localStorage.removeItem(AUTH_TOKEN_KEY)
      const pathname = window.location.pathname
      const isPublicPage =
        pathname.startsWith('/demo/') ||
        pathname.startsWith('/interest/') ||
        pathname.startsWith('/trial/') ||
        pathname.startsWith('/payment/')

      if (!isPublicPage) {
        window.location.reload()
      }
    }

    const fallback = status
      ? `Request failed with status ${status}${method && url ? ` for ${method} ${url}` : ''}`
      : err.message || 'Unknown network error'

    const error = new Error(serverMessage || fallback) as Error & {
      status?: number
      method?: string
      url?: string
    }

    error.status = status
    error.method = method
    error.url = url

    return Promise.reject(error)
  }
)

// Companies
export const companiesApi = {
  list: (params?: Record<string, string | number>) =>
    api.get('/companies', { params }).then(r => r.data),

  upload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/companies/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },

  get: (id: string) => api.get(`/companies/${id}`).then(r => r.data),

  updateStatus: (id: string, status: string, notes?: string) =>
    api.patch(`/companies/${id}/status`, { status, notes }).then(r => r.data),

  delete: (id: string) => api.delete(`/companies/${id}`).then(r => r.data),

  resetOutreach: (id: string) =>
    api.post(`/emails/reset-outreach/${id}`).then(r => r.data),

  sizeStats: () => api.get('/companies/stats/size').then(r => r.data),
  statusStats: () => api.get('/companies/stats/status').then(r => r.data),
  search: (q: string) => api.get('/companies/search', { params: { q } }).then(r => r.data),
  emailSuggestions: (name: string) => api.get('/companies/emails', { params: { name } }).then(r => r.data),
}

// Emails
export const emailsApi = {
  list: (params?: Record<string, string | number>) =>
    api.get('/emails', { params }).then(r => r.data),

  sendManualOutreach: (data: object) =>
    api.post('/emails/manual-outreach', data).then(r => r.data),
  respondOutreach: (data: object) =>
    api.post('/emails/respond-outreach', data).then(r => r.data),

  stats: () => api.get('/emails/stats').then(r => r.data),
  insights: () => api.get('/emails/insights').then(r => r.data),
  retryEmail: (id: string) => api.post(`/emails/${id}/retry`).then(r => r.data),
  trend: (days = 30) => api.get('/emails/trend', { params: { days } }).then(r => r.data),

  templates: () => api.get('/emails/templates').then(r => r.data),
  updateTemplate: (type: string, data: object) =>
    api.put(`/emails/templates/${type}`, data).then(r => r.data),
  updateTemplateByID: (id: string, data: object) =>
    api.put(`/emails/templates/by-id/${id}`, data).then(r => r.data),
  createTemplate: (data: { type: string; name: string; subject: string; body: string }) =>
    api.post('/emails/templates', data).then(r => r.data),
  activateTemplate: (id: string) =>
    api.post(`/emails/templates/${id}/activate`).then(r => r.data),
  deleteTemplate: (id: string) =>
    api.delete(`/emails/templates/${id}`).then(r => r.data),

  config: () => api.get('/emails/config').then(r => r.data),
  updateConfig: (data: object) => api.put('/emails/config', data).then(r => r.data),
  clearLogs: () => api.delete('/emails/logs').then(r => r.data),
  departments: () => api.get('/companies/stats/size').then(r => r.data),
}

// Demos
export const demosApi = {
  list: (params?: Record<string, string | number>) =>
    api.get('/demos', { params }).then(r => r.data),

  create: (data: object) => api.post('/demos', data).then(r => r.data),
  get: (id: string) => api.get(`/demos/${id}`).then(r => r.data),
  update: (id: string, data: object) => api.put(`/demos/${id}`, data).then(r => r.data),
  stats: () => api.get('/demos/stats').then(r => r.data),
  publicSchedule: (data: object) => api.post('/demos/public-schedule', data).then(r => r.data),
  book: (data: object) => api.post('/demos/book', data).then(r => r.data),
  slots: (date: string) => api.get('/demos/slots', { params: { date } }).then(r => r.data),
  upcoming: (params?: Record<string, string | number>) => api.get('/demos/upcoming', { params }).then(r => r.data),
  pending: (params?: Record<string, string | number>) => api.get('/demos', { params: { ...params, status: 'pending' } }).then(r => r.data),
  confirm: (id: string, meetingLink: string) => api.post(`/demos/${id}/confirm`, { meeting_link: meetingLink }).then(r => r.data),
  delete: (id: string) => api.delete(`/demos/${id}`).then(r => r.data),
  pastReview: (params?: Record<string, string | number>) =>
    api.get('/demos/past-review', { params }).then(r => r.data),
}

// Trials
export const trialsApi = {
  list: (params?: Record<string, string | number>) =>
    api.get('/trials', { params }).then(r => r.data),

  create: (data: object) => api.post('/trials', data).then(r => r.data),
  get: (id: string) => api.get(`/trials/${id}`).then(r => r.data),
  update: (id: string, data: object) => api.put(`/trials/${id}`, data).then(r => r.data),
  stats: () => api.get('/trials/stats').then(r => r.data),
  respond: (data: object) => api.post('/trials/respond', data).then(r => r.data),
}

// Interest
export const interestApi = {
  stats: () => api.get('/interest/stats').then(r => r.data),
  detect: (emailBody: string) =>
    api.post('/interest/detect', { email_body: emailBody }).then(r => r.data),
  mark: (companyId: string, interested: boolean, notes?: string) =>
    api.post('/interest/mark', { company_id: companyId, interested, notes }).then(r => r.data),
}

// Subscriptions
export const subscriptionsApi = {
  create: (data: object) => api.post('/subscriptions', data).then(r => r.data),
  list: (params?: Record<string, string | number>) =>
    api.get('/subscriptions', { params }).then(r => r.data),
  get: (id: string) => api.get(`/subscriptions/${id}`).then(r => r.data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/subscriptions/${id}/status`, { status }).then(r => r.data),
}

// Analytics
export const analyticsApi = {
  dashboard: () => api.get('/analytics/dashboard').then(r => r.data),
}

export const adminAuthStorage = {
  key: AUTH_TOKEN_KEY,
  get: getAuthToken,
  set: (token: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(AUTH_TOKEN_KEY, token)
    }
  },
  clear: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(AUTH_TOKEN_KEY)
    }
  },
}

export const API_BASE_URL = api.defaults.baseURL || `${normalizeApiBaseUrl(BASE_URL)}${API_PREFIX}`
