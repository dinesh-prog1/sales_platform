package models

import "time"

type TrialStatus string

const (
	TrialStatusActive    TrialStatus = "active"
	TrialStatusExpired   TrialStatus = "expired"
	TrialStatusConverted TrialStatus = "converted"
	TrialStatusDropped   TrialStatus = "dropped"
)

type Trial struct {
	ID             string      `json:"id"`
	CompanyID      string      `json:"company_id,omitempty"`
	CompanyName    string      `json:"company_name,omitempty"`
	CompanyEmail   string      `json:"company_email,omitempty"`
	DemoID         string      `json:"demo_id,omitempty"`
	BookerName     string      `json:"booker_name,omitempty"`
	BookerEmail    string      `json:"booker_email,omitempty"`
	BookerCompany  string      `json:"booker_company,omitempty"`
	StartedAt      time.Time   `json:"started_at"`
	ExpiresAt      time.Time   `json:"expires_at"`
	ReminderSent   bool        `json:"reminder_sent"`
	ReminderSentAt *time.Time  `json:"reminder_sent_at"`
	Status         TrialStatus `json:"status"`
	PlanSelected   string      `json:"plan_selected"`
	ConvertedAt    *time.Time  `json:"converted_at"`
	CreatedAt      time.Time   `json:"created_at"`
	UpdatedAt      time.Time   `json:"updated_at"`
}

type TrialCreateRequest struct {
	CompanyID     string `json:"company_id"`
	DemoID        string `json:"demo_id"`
	CompanyName   string `json:"company_name"`
	CompanyEmail  string `json:"company_email"`
	BookerName    string `json:"booker_name"`
	BookerEmail   string `json:"booker_email"`
	BookerCompany string `json:"booker_company"`
}

type TrialUpdateRequest struct {
	Status       TrialStatus `json:"status"`
	PlanSelected string      `json:"plan_selected"`
}

type TrialStats struct {
	TotalActive     int64 `json:"total_active"`
	TotalConverted  int64 `json:"total_converted"`
	TotalExpired    int64 `json:"total_expired"`
	TotalDropped    int64 `json:"total_dropped"`
	ExpiringIn3Days int64 `json:"expiring_in_3_days"`
}

type TrialListFilter struct {
	Status string
	Page   int
	Limit  int
}

type TrialListResponse struct {
	Trials     []*Trial `json:"trials"`
	Total      int64    `json:"total"`
	Page       int      `json:"page"`
	Limit      int      `json:"limit"`
	TotalPages int      `json:"total_pages"`
}
