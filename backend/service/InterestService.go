package service

import (
	"context"
	"strings"

	"github.com/aisales/backend/helper"
	"github.com/aisales/backend/models"
	"github.com/aisales/backend/repository"
)

var interestKeywords = []string{
	"interested", "yes", "demo", "pricing", "how much", "cost", "tell me more",
	"would love", "sounds great", "let's talk", "schedule", "call", "meeting",
	"trial", "sign up", "want to know", "curious", "please", "forward",
}

var notInterestedKeywords = []string{
	"not interested", "unsubscribe", "remove", "stop", "no thanks", "no thank you",
	"don't contact", "do not contact", "opt out", "not relevant", "already have",
}

type InterestService struct {
	db          *helper.DB
	companyRepo *repository.CompanyRepository
}

func NewInterestService(db *helper.DB, companyRepo *repository.CompanyRepository) *InterestService {
	return &InterestService{db: db, companyRepo: companyRepo}
}

func (s *InterestService) DetectInterest(emailBody string) *models.InterestDetection {
	lower := strings.ToLower(emailBody)
	d := &models.InterestDetection{}

	for _, kw := range notInterestedKeywords {
		if strings.Contains(lower, kw) {
			d.Interested = false
			d.Keywords = append(d.Keywords, kw)
			d.Confidence = 0.9
			return d
		}
	}

	matches := 0
	for _, kw := range interestKeywords {
		if strings.Contains(lower, kw) {
			d.Keywords = append(d.Keywords, kw)
			matches++
		}
	}

	if matches > 0 {
		d.Interested = true
		d.Confidence = float64(matches) / float64(len(interestKeywords))
		if d.Confidence > 1 {
			d.Confidence = 1
		}
	}

	return d
}

func (s *InterestService) MarkInterest(ctx context.Context, req models.MarkInterestRequest) error {
	status := models.CompanyStatusInterested
	if !req.Interested {
		status = models.CompanyStatusNotInterested
	}
	return s.companyRepo.UpdateStatus(ctx, req.CompanyID, status, req.Notes)
}

func (s *InterestService) GetStats(ctx context.Context) (*models.InterestStats, error) {
	query := `
		SELECT
			COUNT(*) FILTER (WHERE status = 'interested') as interested,
			COUNT(*) FILTER (WHERE status = 'not_interested') as not_interested,
			COUNT(*) FILTER (WHERE status = 'outreach_sent') as pending
		FROM companies`

	st := &models.InterestStats{}
	err := s.db.Pool.QueryRow(ctx, query).Scan(
		&st.Interested, &st.NotInterested, &st.Pending,
	)
	return st, err
}
