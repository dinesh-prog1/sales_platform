package models

import "time"

type CompanyStatus string
type CompanySize string

const (
	CompanyStatusUploaded      CompanyStatus = "uploaded"
	CompanyStatusOutreachSent  CompanyStatus = "outreach_sent"
	CompanyStatusInterested    CompanyStatus = "interested"
	CompanyStatusNotInterested CompanyStatus = "not_interested"
	CompanyStatusDemoInvited   CompanyStatus = "demo_invited"
	CompanyStatusDemoScheduled CompanyStatus = "demo_scheduled"
	CompanyStatusDemoCompleted CompanyStatus = "demo_completed"
	CompanyStatusTrialStarted  CompanyStatus = "trial_started"
	CompanyStatusTrialExpired  CompanyStatus = "trial_expired"
	CompanyStatusConverted     CompanyStatus = "converted"
	CompanyStatusDropped       CompanyStatus = "dropped"
)

const (
	CompanySizeSmall  CompanySize = "small"
	CompanySizeMedium CompanySize = "medium"
	CompanySizeLarge  CompanySize = "large"
)

// Departments is the canonical list of industry categories.
var Departments = []string{
	"Technology & IT",
	"Healthcare & Medical",
	"Education",
	"Retail & E-commerce",
	"Textile & Garments",
	"Manufacturing & Industrial",
	"Hospitality & Tourism",
	"Financial Services",
	"Real Estate & Construction",
	"Transportation & Logistics",
	"Professional Services",
	"Agriculture & Food",
	"Wellness & Fitness",
	"Others",
}

type Company struct {
	ID            string        `json:"id"`
	Name          string        `json:"name"`
	Size          CompanySize   `json:"size"`
	Email         string        `json:"email"`
	ContactPerson string        `json:"contact_person"`
	Industry      string        `json:"industry"`
	Department    string        `json:"department"`
	Country       string        `json:"country"`
	Status        CompanyStatus `json:"status"`
	Notes         string        `json:"notes"`
	CreatedAt     time.Time     `json:"created_at"`
	UpdatedAt     time.Time     `json:"updated_at"`
}

type CompanyUploadResult struct {
	Total    int      `json:"total"`
	Imported int      `json:"imported"`
	Skipped  int      `json:"skipped"`
	Errors   []string `json:"errors"`
}

type CompanyListFilter struct {
	Status     string
	Size       string
	Department string
	Country    string
	Search     string
	SortBy     string // "size_asc" | "size_desc" | ""
	Page       int
	Limit      int
}

type CompanyListResponse struct {
	Companies  []*Company `json:"companies"`
	Total      int64      `json:"total"`
	Page       int        `json:"page"`
	Limit      int        `json:"limit"`
	TotalPages int        `json:"total_pages"`
}

type CompanySizeStats struct {
	Small  int64 `json:"small"`
	Medium int64 `json:"medium"`
	Large  int64 `json:"large"`
}

type CompanyStatusStats struct {
	Uploaded      int64 `json:"uploaded"`
	OutreachSent  int64 `json:"outreach_sent"`
	Interested    int64 `json:"interested"`
	NotInterested int64 `json:"not_interested"`
	DemoInvited   int64 `json:"demo_invited"`
	DemoScheduled int64 `json:"demo_scheduled"`
	DemoCompleted int64 `json:"demo_completed"`
	TrialStarted  int64 `json:"trial_started"`
	TrialExpired  int64 `json:"trial_expired"`
	Converted     int64 `json:"converted"`
	Dropped       int64 `json:"dropped"`
}

type CompanyUpdateStatusRequest struct {
	Status CompanyStatus `json:"status"`
	Notes  string        `json:"notes"`
}

// CompanySearchSuggestion is returned from GET /companies/search?q=
type CompanySearchSuggestion struct {
	ID         string      `json:"id"`
	Name       string      `json:"name"`
	Industry   string      `json:"industry"`
	Department string      `json:"department"`
	Country    string      `json:"country"`
	Size       CompanySize `json:"size"`
}

// CompanyEmailSuggestion is returned from GET /companies/emails?name=
type CompanyEmailSuggestion struct {
	ID            string      `json:"id"`
	Email         string      `json:"email"`
	ContactPerson string      `json:"contact_person"`
	Industry      string      `json:"industry"`
	Department    string      `json:"department"`
	Country       string      `json:"country"`
	Size          CompanySize `json:"size"`
}

// DepartmentGroup is one department bucket inside a size group.
type DepartmentGroup struct {
	Department string     `json:"department"`
	Count      int        `json:"count"`
	Companies  []*Company `json:"companies"`
}

// SizeGroup holds all companies of a given size, bucketed by department.
type SizeGroup struct {
	Size        CompanySize       `json:"size"`
	Total       int               `json:"total"`
	Departments []DepartmentGroup `json:"departments"`
}
