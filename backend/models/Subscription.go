package models

import "time"

type SubscriptionPlan string
type SubscriptionStatus string

const (
	PlanFree    SubscriptionPlan = "free"
	PlanPremium SubscriptionPlan = "premium"
)

const (
	SubscriptionPending   SubscriptionStatus = "pending"
	SubscriptionActive    SubscriptionStatus = "active"
	SubscriptionCancelled SubscriptionStatus = "cancelled"
)

// PricePerUserPremium is the per-user monthly price in INR for the Premium plan.
const PricePerUserPremium = 99

// MaxFreeUsers is the maximum number of users on the Free plan.
const MaxFreeUsers = 10

type Subscription struct {
	ID              string             `json:"id"`
	CompanyID       string             `json:"company_id,omitempty"`
	TrialID         string             `json:"trial_id,omitempty"`
	CompanyName     string             `json:"company_name"`
	ContactPerson   string             `json:"contact_person"`
	Email           string             `json:"email"`
	Phone           string             `json:"phone"`
	Plan            SubscriptionPlan   `json:"plan"`
	NumUsers        int                `json:"num_users"`
	PricePerUser    int                `json:"price_per_user"`
	TotalAmount     int                `json:"total_amount"`
	Status          SubscriptionStatus `json:"status"`
	CreatedAt       time.Time          `json:"created_at"`
	UpdatedAt       time.Time          `json:"updated_at"`
}

type SubscriptionCreateRequest struct {
	CompanyID     string `json:"company_id"`
	TrialID       string `json:"trial_id"`
	CompanyName   string `json:"company_name"`
	ContactPerson string `json:"contact_person"`
	Email         string `json:"email"`
	Phone         string `json:"phone"`
	Plan          string `json:"plan"`
	NumUsers      int    `json:"num_users"`
}

type SubscriptionListFilter struct {
	Status string
	Page   int
	Limit  int
}

type SubscriptionListResponse struct {
	Subscriptions []*Subscription `json:"subscriptions"`
	Total         int64           `json:"total"`
	Page          int             `json:"page"`
	Limit         int             `json:"limit"`
	TotalPages    int             `json:"total_pages"`
}
