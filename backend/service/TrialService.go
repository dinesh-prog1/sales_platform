package service

import (
	"context"
	"fmt"
	"time"

	"github.com/aisales/backend/models"
	"github.com/aisales/backend/repository"
)

type TrialService struct {
	repo *repository.TrialRepository
}

func NewTrialService(repo *repository.TrialRepository) *TrialService {
	return &TrialService{repo: repo}
}

func (s *TrialService) StartTrial(ctx context.Context, req models.TrialCreateRequest) (*models.Trial, error) {
	t := &models.Trial{
		CompanyID:     req.CompanyID,
		DemoID:        req.DemoID,
		BookerName:    req.BookerName,
		BookerEmail:   req.BookerEmail,
		BookerCompany: req.BookerCompany,
		StartedAt:     time.Now(),
		ExpiresAt:     time.Now().AddDate(0, 0, 14),
		Status:        models.TrialStatusActive,
	}
	// Prefer explicit company name/email; fallback to booker fields
	if req.CompanyName != "" {
		t.CompanyName = req.CompanyName
	} else if req.BookerCompany != "" {
		t.CompanyName = req.BookerCompany
	}
	if req.CompanyEmail != "" {
		t.CompanyEmail = req.CompanyEmail
	} else if req.BookerEmail != "" {
		t.CompanyEmail = req.BookerEmail
	}
	if err := s.repo.Create(ctx, t); err != nil {
		return nil, fmt.Errorf("create trial: %w", err)
	}
	return t, nil
}

func (s *TrialService) GetTrial(ctx context.Context, id string) (*models.Trial, error) {
	t, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if t == nil {
		return nil, fmt.Errorf("trial not found")
	}
	return t, nil
}

func (s *TrialService) UpdateTrial(ctx context.Context, id string, req models.TrialUpdateRequest) error {
	return s.repo.Update(ctx, id, req)
}

func (s *TrialService) ListTrials(ctx context.Context, f models.TrialListFilter) (*models.TrialListResponse, error) {
	return s.repo.List(ctx, f)
}

func (s *TrialService) GetStats(ctx context.Context) (*models.TrialStats, error) {
	return s.repo.GetStats(ctx)
}

func (s *TrialService) GetExpiringTrials(ctx context.Context) ([]*models.Trial, error) {
	return s.repo.GetExpiringTrials(ctx)
}

func (s *TrialService) GetExpiredTrials(ctx context.Context) ([]*models.Trial, error) {
	return s.repo.GetExpiredTrials(ctx)
}

func (s *TrialService) MarkReminderSent(ctx context.Context, id string) error {
	return s.repo.MarkReminderSent(ctx, id)
}
