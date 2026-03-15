package models

import "time"

type EmailType string
type EmailStatus string

const (
	EmailTypeOutreach    EmailType = "outreach"
	EmailTypeDemoInvite  EmailType = "demo_invite"
	EmailTypeDemoConfirm EmailType = "demo_confirm"
	EmailTypePostDemo    EmailType = "post_demo"
	EmailTypeTrialRemind EmailType = "trial_reminder"
	EmailTypeFeedback    EmailType = "feedback"
)

const (
	EmailStatusPending EmailStatus = "pending"
	EmailStatusQueued  EmailStatus = "queued"
	EmailStatusSent    EmailStatus = "sent"
	EmailStatusFailed  EmailStatus = "failed"
	EmailStatusOpened  EmailStatus = "opened"
	EmailStatusReplied EmailStatus = "replied"
)

// EmailQueueNames maps email types to queue names.
const (
	QueueEmailOutreach    = "email:outreach"
	QueueEmailDemoInvite  = "email:demo_invite"
	QueueEmailDemoConfirm = "email:demo_confirm"
	QueueEmailPostDemo    = "email:post_demo"
	QueueEmailTrialRemind = "email:trial_reminder"
	QueueEmailFeedback    = "email:feedback"
	QueueEmailDLQ         = "email:dlq"
)

// TypeToQueue maps an email type to its queue name.
func TypeToQueue(t EmailType) string {
	switch t {
	case EmailTypeOutreach:
		return QueueEmailOutreach
	case EmailTypeDemoInvite:
		return QueueEmailDemoInvite
	case EmailTypeDemoConfirm:
		return QueueEmailDemoConfirm
	case EmailTypePostDemo:
		return QueueEmailPostDemo
	case EmailTypeTrialRemind:
		return QueueEmailTrialRemind
	case EmailTypeFeedback:
		return QueueEmailFeedback
	default:
		return QueueEmailOutreach
	}
}

type EmailLog struct {
	ID           string      `json:"id"`
	CompanyID    string      `json:"company_id"`
	Type         EmailType   `json:"type"`
	Status       EmailStatus `json:"status"`
	Subject      string      `json:"subject"`
	Body         string      `json:"body"`
	ToEmail      string      `json:"to_email"`
	SentAt       *time.Time  `json:"sent_at"`
	OpenedAt     *time.Time  `json:"opened_at"`
	RepliedAt    *time.Time  `json:"replied_at"`
	ErrorMessage string      `json:"error_message"`
	RetryCount   int         `json:"retry_count"`
	MaxRetries   int         `json:"max_retries"`
	ScheduledAt  time.Time   `json:"scheduled_at"`
	CreatedAt    time.Time   `json:"created_at"`
	UpdatedAt    time.Time   `json:"updated_at"`
}

type EmailTemplate struct {
	ID        string     `json:"id"`
	Type      EmailType  `json:"type"`
	Subject   string     `json:"subject"`
	Body      string     `json:"body"`
	IsActive  bool       `json:"is_active"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

type EmailConfig struct {
	ID             string    `json:"id"`
	EmailsPerDay   int       `json:"emails_per_day"`
	TargetSize     string    `json:"target_size"`
	IsActive       bool      `json:"is_active"`
	SchedulingLink string    `json:"scheduling_link"`
	CronHour       int       `json:"cron_hour"`
	// Per-size quotas: how many emails go to each size bucket per day.
	// When the sum > 0 the scheduler uses these instead of EmailsPerDay + TargetSize.
	SmallQuota  int `json:"small_quota"`
	MediumQuota int `json:"medium_quota"`
	LargeQuota  int `json:"large_quota"`
	AppBaseURL  string    `json:"-"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type EmailStats struct {
	TotalSent    int64 `json:"total_sent"`
	SentToday    int64 `json:"sent_today"`
	TotalFailed  int64 `json:"total_failed"`
	TotalPending int64 `json:"total_pending"`
	TotalOpened  int64 `json:"total_opened"`
	TotalReplied int64 `json:"total_replied"`
}

type EmailListFilter struct {
	CompanyID string
	Type      string
	Status    string
	Page      int
	Limit     int
}

type EmailListResponse struct {
	Emails     []*EmailLog `json:"emails"`
	Total      int64       `json:"total"`
	Page       int         `json:"page"`
	Limit      int         `json:"limit"`
	TotalPages int         `json:"total_pages"`
}

type UpdateEmailTemplateRequest struct {
	Subject  string `json:"subject"`
	Body     string `json:"body"`
	IsActive bool   `json:"is_active"`
}

type UpdateEmailConfigRequest struct {
	EmailsPerDay   int    `json:"emails_per_day"`
	TargetSize     string `json:"target_size"`
	IsActive       bool   `json:"is_active"`
	SchedulingLink string `json:"scheduling_link"`
	CronHour       int    `json:"cron_hour"`
	SmallQuota     int    `json:"small_quota"`
	MediumQuota    int    `json:"medium_quota"`
	LargeQuota     int    `json:"large_quota"`
}

type ManualOutreachRequest struct {
	CompanyName   string `json:"company_name"`
	Email         string `json:"email"`
	ContactPerson string `json:"contact_person"`
	Industry      string `json:"industry"`
	CompanySize   string `json:"company_size"`
	Country       string `json:"country"`
}

type OutreachResponseRequest struct {
	CompanyID string `json:"company_id"`
	Action    string `json:"action"`
}

// CompanyInfo is a lightweight company value object used when queuing emails.
type CompanyInfo struct {
	ID            string
	Name          string
	Email         string
	ContactPerson string
	Industry      string
	Size          string
}

// EmailJob is the job payload stored in the queue.
type EmailJob struct {
	ID          string    `json:"id"`
	CompanyID   string    `json:"company_id"`
	EmailLogID  string    `json:"email_log_id"`
	Type        string    `json:"type"`
	ToEmail     string    `json:"to_email"`
	Subject     string    `json:"subject"`
	Body        string    `json:"body"`
	RetryCount  int       `json:"retry_count"`
	ScheduledAt time.Time `json:"scheduled_at"`
}
