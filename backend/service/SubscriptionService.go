package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/aisales/backend/models"
	"github.com/aisales/backend/repository"
)

type SubscriptionService struct {
	repo        *repository.SubscriptionRepository
	trialRepo   *repository.TrialRepository
	companyRepo *repository.CompanyRepository
}

func NewSubscriptionService(
	repo *repository.SubscriptionRepository,
	trialRepo *repository.TrialRepository,
	companyRepo *repository.CompanyRepository,
) *SubscriptionService {
	return &SubscriptionService{repo: repo, trialRepo: trialRepo, companyRepo: companyRepo}
}

func (s *SubscriptionService) CreateSubscription(ctx context.Context, req models.SubscriptionCreateRequest) (*models.Subscription, error) {
	if strings.TrimSpace(req.CompanyName) == "" {
		return nil, fmt.Errorf("company_name is required")
	}
	if strings.TrimSpace(req.ContactPerson) == "" {
		return nil, fmt.Errorf("contact_person is required")
	}
	if strings.TrimSpace(req.Email) == "" {
		return nil, fmt.Errorf("email is required")
	}
	if req.NumUsers < 1 {
		return nil, fmt.Errorf("num_users must be at least 1")
	}

	plan := models.SubscriptionPlan(strings.ToLower(strings.TrimSpace(req.Plan)))
	if plan != models.PlanFree && plan != models.PlanPremium {
		return nil, fmt.Errorf("plan must be 'free' or 'premium'")
	}

	pricePerUser := 0
	if plan == models.PlanPremium {
		pricePerUser = models.PricePerUserPremium
	}
	if plan == models.PlanFree && req.NumUsers > models.MaxFreeUsers {
		return nil, fmt.Errorf("free plan supports up to %d users", models.MaxFreeUsers)
	}

	totalAmount := req.NumUsers * pricePerUser

	sub := &models.Subscription{
		CompanyID:     req.CompanyID,
		TrialID:       req.TrialID,
		CompanyName:   strings.TrimSpace(req.CompanyName),
		ContactPerson: strings.TrimSpace(req.ContactPerson),
		Email:         strings.TrimSpace(req.Email),
		Phone:         strings.TrimSpace(req.Phone),
		Plan:          plan,
		NumUsers:      req.NumUsers,
		PricePerUser:  pricePerUser,
		TotalAmount:   totalAmount,
		Status:        models.SubscriptionPending,
	}

	if err := s.repo.Create(ctx, sub); err != nil {
		return nil, fmt.Errorf("create subscription: %w", err)
	}

	// Mark trial as converted if linked
	if req.TrialID != "" && s.trialRepo != nil {
		_ = s.trialRepo.Update(ctx, req.TrialID, models.TrialUpdateRequest{
			Status:       models.TrialStatusConverted,
			PlanSelected: string(plan),
		})
	}
	// Update company status
	if req.CompanyID != "" && s.companyRepo != nil {
		_ = s.companyRepo.UpdateStatus(ctx, req.CompanyID, models.CompanyStatusConverted, "Subscription created: "+string(plan))
	}

	return sub, nil
}

func (s *SubscriptionService) GetSubscription(ctx context.Context, id string) (*models.Subscription, error) {
	sub, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if sub == nil {
		return nil, fmt.Errorf("subscription not found")
	}
	return sub, nil
}

func (s *SubscriptionService) ListSubscriptions(ctx context.Context, f models.SubscriptionListFilter) (*models.SubscriptionListResponse, error) {
	return s.repo.List(ctx, f)
}

func (s *SubscriptionService) UpdateStatus(ctx context.Context, id string, status models.SubscriptionStatus) error {
	if status != models.SubscriptionPending && status != models.SubscriptionActive && status != models.SubscriptionCancelled {
		return fmt.Errorf("invalid status: %s", status)
	}
	return s.repo.UpdateStatus(ctx, id, status)
}
