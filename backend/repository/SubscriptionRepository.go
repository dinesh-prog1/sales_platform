package repository

import (
	"context"
	"fmt"
	"math"
	"strings"

	"github.com/aisales/backend/helper"
	"github.com/aisales/backend/models"
	"github.com/jackc/pgx/v5"
)

type SubscriptionRepository struct {
	db *helper.DB
}

func NewSubscriptionRepository(db *helper.DB) *SubscriptionRepository {
	return &SubscriptionRepository{db: db}
}

func nullableSubStr(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

func (r *SubscriptionRepository) Create(ctx context.Context, s *models.Subscription) error {
	query := `
		INSERT INTO subscriptions
			(company_id, trial_id, company_name, contact_person, email, phone,
			 plan, num_users, price_per_user, total_amount, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, created_at, updated_at`
	return r.db.Pool.QueryRow(ctx, query,
		nullableSubStr(s.CompanyID), nullableSubStr(s.TrialID),
		s.CompanyName, s.ContactPerson, s.Email, s.Phone,
		s.Plan, s.NumUsers, s.PricePerUser, s.TotalAmount, s.Status,
	).Scan(&s.ID, &s.CreatedAt, &s.UpdatedAt)
}

func (r *SubscriptionRepository) GetByID(ctx context.Context, id string) (*models.Subscription, error) {
	query := `
		SELECT id, COALESCE(company_id::text,''), COALESCE(trial_id::text,''),
		       company_name, contact_person, email, COALESCE(phone,''),
		       plan, num_users, price_per_user, total_amount, status,
		       created_at, updated_at
		FROM subscriptions WHERE id = $1`
	s := &models.Subscription{}
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&s.ID, &s.CompanyID, &s.TrialID,
		&s.CompanyName, &s.ContactPerson, &s.Email, &s.Phone,
		&s.Plan, &s.NumUsers, &s.PricePerUser, &s.TotalAmount, &s.Status,
		&s.CreatedAt, &s.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return s, err
}

func (r *SubscriptionRepository) List(ctx context.Context, f models.SubscriptionListFilter) (*models.SubscriptionListResponse, error) {
	if f.Page < 1 {
		f.Page = 1
	}
	if f.Limit < 1 || f.Limit > 100 {
		f.Limit = 20
	}
	offset := (f.Page - 1) * f.Limit

	conditions := []string{}
	args := []interface{}{}
	argIdx := 1

	if f.Status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIdx))
		args = append(args, f.Status)
		argIdx++
	}

	where := ""
	if len(conditions) > 0 {
		where = "WHERE " + strings.Join(conditions, " AND ")
	}

	var total int64
	if err := r.db.Pool.QueryRow(ctx,
		fmt.Sprintf("SELECT COUNT(*) FROM subscriptions %s", where), args...,
	).Scan(&total); err != nil {
		return nil, err
	}

	args = append(args, f.Limit, offset)
	query := fmt.Sprintf(`
		SELECT id, COALESCE(company_id::text,''), COALESCE(trial_id::text,''),
		       company_name, contact_person, email, COALESCE(phone,''),
		       plan, num_users, price_per_user, total_amount, status,
		       created_at, updated_at
		FROM subscriptions %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d`, where, argIdx, argIdx+1)

	rows, err := r.db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var subs []*models.Subscription
	for rows.Next() {
		s := &models.Subscription{}
		if err := rows.Scan(
			&s.ID, &s.CompanyID, &s.TrialID,
			&s.CompanyName, &s.ContactPerson, &s.Email, &s.Phone,
			&s.Plan, &s.NumUsers, &s.PricePerUser, &s.TotalAmount, &s.Status,
			&s.CreatedAt, &s.UpdatedAt,
		); err != nil {
			return nil, err
		}
		subs = append(subs, s)
	}

	return &models.SubscriptionListResponse{
		Subscriptions: subs,
		Total:         total,
		Page:          f.Page,
		Limit:         f.Limit,
		TotalPages:    int(math.Ceil(float64(total) / float64(f.Limit))),
	}, nil
}

func (r *SubscriptionRepository) UpdateStatus(ctx context.Context, id string, status models.SubscriptionStatus) error {
	_, err := r.db.Pool.Exec(ctx,
		`UPDATE subscriptions SET status = $1, updated_at = NOW() WHERE id = $2`, status, id)
	return err
}
