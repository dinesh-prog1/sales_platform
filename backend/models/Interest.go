package models

import "time"

type InterestDetection struct {
	CompanyID    string    `json:"company_id"`
	CompanyName  string    `json:"company_name"`
	CompanyEmail string    `json:"company_email"`
	Interested   bool      `json:"interested"`
	Confidence   float64   `json:"confidence"`
	Keywords     []string  `json:"keywords_found"`
	DetectedAt   time.Time `json:"detected_at"`
}

type MarkInterestRequest struct {
	CompanyID  string `json:"company_id"`
	Interested bool   `json:"interested"`
	Notes      string `json:"notes"`
}

type InterestStats struct {
	Interested    int64 `json:"interested"`
	NotInterested int64 `json:"not_interested"`
	Pending       int64 `json:"pending"`
}
