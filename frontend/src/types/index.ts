export type CompanyStatus =
  | 'uploaded' | 'outreach_sent' | 'interested' | 'not_interested'
  | 'demo_invited' | 'demo_scheduled' | 'demo_completed'
  | 'trial_started' | 'trial_expired' | 'converted' | 'dropped'

export type CompanySize = 'small' | 'medium' | 'large'

export interface Company {
  id: string
  name: string
  size: CompanySize
  email: string
  contact_person: string
  industry: string
  department?: string
  country: string
  status: CompanyStatus
  notes: string
  created_at: string
  updated_at: string
}

export interface EmailLog {
  id: string
  company_id: string
  type: 'outreach' | 'demo_invite' | 'demo_confirm' | 'post_demo' | 'trial_reminder' | 'trial_conversion' | 'feedback'
  status: 'pending' | 'queued' | 'sent' | 'failed' | 'opened' | 'replied'
  subject: string
  body: string
  to_email: string
  sent_at: string | null
  opened_at: string | null
  replied_at: string | null
  error_message: string
  retry_count: number
  scheduled_at: string
  created_at: string
}

export interface DemoBooking {
  id: string
  company_id: string
  company_name?: string
  company_email?: string
  scheduled_at: string | null
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show' | 'no_trial'
  meeting_link: string
  notes: string
  completed_at: string | null
  created_at: string
  booker_name?: string
  booker_email?: string
  booker_company?: string
  time_slot?: string
}

export interface Trial {
  id: string
  company_id?: string
  company_name?: string
  company_email?: string
  demo_id?: string
  booker_name?: string
  booker_email?: string
  booker_company?: string
  started_at: string
  expires_at: string
  reminder_sent: boolean
  status: 'active' | 'expired' | 'converted' | 'dropped'
  plan_selected: string
  converted_at: string | null
  created_at: string
}

export interface DashboardData {
  pipeline: {
    total_companies: number
    outreach_sent: number
    interested: number
    demo_scheduled: number
    demo_completed: number
    trial_started: number
    converted: number
    dropped: number
    conversion_rate: number
  }
  email: {
    total_sent: number
    sent_today: number
    total_failed: number
    total_opened: number
    total_replied: number
    open_rate: number
    reply_rate: number
  }
  companies: {
    total: number
    small: number
    medium: number
    large: number
    not_interested: number
  }
  trials: {
    active: number
    converted: number
    expired: number
    dropped: number
    expiring_in_3_days: number
    feedback_sent: number
  }
  daily_trend: Array<{ date: string; count: number }>
  pipeline_chart: Array<{ stage: string; count: number; color: string }>
  size_breakdown: Array<{ size: string; count: number }>
}

export interface ListResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export interface SearchSuggestion {
  id: string
  name: string
  industry: string
  department: string
  country: string
  size: CompanySize
}

export interface EmailSuggestion {
  id: string
  email: string
  contact_person: string
  industry: string
  department: string
  country: string
  size: CompanySize
}

export type EmailType = 'outreach' | 'demo_invite' | 'demo_confirm' | 'post_demo' | 'trial_reminder' | 'trial_conversion' | 'feedback'
export type EmailStatus = 'pending' | 'queued' | 'sent' | 'failed' | 'opened' | 'replied'

export interface EmailCampaignStats {
  type: EmailType
  total: number
  sent: number
  pending: number
  queued: number
  failed: number
  opened: number
  replied: number
}

export interface EmailInsightStats {
  total_emails: number
  total_sent: number
  sent_today: number
  total_failed: number
  total_pending: number
  total_opened: number
  total_replied: number
  delivery_rate: number
  open_rate: number
  reply_rate: number
  campaign_breakdown: EmailCampaignStats[]
}

export interface CompanyStatusStats {
  uploaded: number
  outreach_sent: number
  interested: number
  not_interested: number
  demo_invited: number
  demo_scheduled: number
  demo_completed: number
  trial_started: number
  trial_expired: number
  converted: number
  dropped: number
}

export interface SlotAvailability {
  date: string
  taken_slots: string[]
  available_slots: string[]
}

export interface Subscription {
  id: string
  company_id?: string
  trial_id?: string
  company_name: string
  contact_person: string
  email: string
  phone: string
  plan: 'free' | 'premium'
  num_users: number
  price_per_user: number
  total_amount: number
  status: 'pending' | 'active' | 'cancelled'
  created_at: string
  updated_at: string
}
