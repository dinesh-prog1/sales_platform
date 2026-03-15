package repository

import (
	"context"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/aisales/backend/helper"
	"github.com/aisales/backend/models"
	"github.com/jackc/pgx/v5"
)

type TrialRepository struct {
	db *helper.DB
}

func NewTrialRepository(db *helper.DB) *TrialRepository {
	return &TrialRepository{db: db}
}

func nullableTrialStr(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

// trialSelectCols is the standard SELECT column list for all trial queries.
const trialSelectCols = `
	t.id,
	COALESCE(t.company_id::text, ''),
	COALESCE(c.name, t.booker_company, ''),
	COALESCE(c.email, t.booker_email, ''),
	COALESCE(t.demo_id::text, ''),
	COALESCE(t.booker_name, ''),
	COALESCE(t.booker_email, ''),
	COALESCE(t.booker_company, ''),
	t.started_at, t.expires_at,
	t.reminder_sent, t.reminder_sent_at,
	t.status, COALESCE(t.plan_selected, ''),
	t.converted_at, t.created_at, t.updated_at`

func scanTrialRow(row interface {
	Scan(...interface{}) error
}) (*models.Trial, error) {
	t := &models.Trial{}
	err := row.Scan(
		&t.ID, &t.CompanyID, &t.CompanyName, &t.CompanyEmail,
		&t.DemoID, &t.BookerName, &t.BookerEmail, &t.BookerCompany,
		&t.StartedAt, &t.ExpiresAt, &t.ReminderSent, &t.ReminderSentAt,
		&t.Status, &t.PlanSelected, &t.ConvertedAt, &t.CreatedAt, &t.UpdatedAt,
	)
	return t, err
}

func (r *TrialRepository) Create(ctx context.Context, t *models.Trial) error {
	query := `
		INSERT INTO trials (company_id, demo_id, booker_name, booker_email, booker_company, started_at, expires_at, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at, updated_at`
	return r.db.Pool.QueryRow(ctx, query,
		nullableTrialStr(t.CompanyID),
		nullableTrialStr(t.DemoID),
		nullableTrialStr(t.BookerName),
		nullableTrialStr(t.BookerEmail),
		nullableTrialStr(t.BookerCompany),
		t.StartedAt, t.ExpiresAt, t.Status,
	).Scan(&t.ID, &t.CreatedAt, &t.UpdatedAt)
}

func (r *TrialRepository) GetByID(ctx context.Context, id string) (*models.Trial, error) {
	query := `
		SELECT ` + trialSelectCols + `
		FROM trials t
		LEFT JOIN companies c ON c.id = t.company_id
		WHERE t.id = $1`

	t, err := scanTrialRow(r.db.Pool.QueryRow(ctx, query, id))
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return t, err
}

func (r *TrialRepository) Update(ctx context.Context, id string, req models.TrialUpdateRequest) error {
	query := `
		UPDATE trials
		SET status = $1,
		    plan_selected = COALESCE(NULLIF($2, ''), plan_selected),
		    converted_at = CASE WHEN $1 = 'converted' THEN NOW() ELSE converted_at END,
		    updated_at = NOW()
		WHERE id = $3`
	_, err := r.db.Pool.Exec(ctx, query, req.Status, req.PlanSelected, id)
	return err
}

func (r *TrialRepository) MarkReminderSent(ctx context.Context, id string) error {
	query := `UPDATE trials SET reminder_sent = true, reminder_sent_at = NOW(), updated_at = NOW() WHERE id = $1`
	_, err := r.db.Pool.Exec(ctx, query, id)
	return err
}

func (r *TrialRepository) List(ctx context.Context, f models.TrialListFilter) (*models.TrialListResponse, error) {
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
		conditions = append(conditions, fmt.Sprintf("t.status = $%d", argIdx))
		args = append(args, f.Status)
		argIdx++
	}

	where := ""
	if len(conditions) > 0 {
		where = "WHERE " + strings.Join(conditions, " AND ")
	}

	var total int64
	if err := r.db.Pool.QueryRow(ctx,
		fmt.Sprintf("SELECT COUNT(*) FROM trials t %s", where), args...,
	).Scan(&total); err != nil {
		return nil, err
	}

	args = append(args, f.Limit, offset)
	query := fmt.Sprintf(`
		SELECT `+trialSelectCols+`
		FROM trials t
		LEFT JOIN companies c ON c.id = t.company_id
		%s
		ORDER BY t.created_at DESC
		LIMIT $%d OFFSET $%d`, where, argIdx, argIdx+1)

	rows, err := r.db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var trials []*models.Trial
	for rows.Next() {
		t, err := scanTrialRow(rows)
		if err != nil {
			return nil, err
		}
		trials = append(trials, t)
	}

	return &models.TrialListResponse{
		Trials:     trials,
		Total:      total,
		Page:       f.Page,
		Limit:      f.Limit,
		TotalPages: int(math.Ceil(float64(total) / float64(f.Limit))),
	}, nil
}

func (r *TrialRepository) GetStats(ctx context.Context) (*models.TrialStats, error) {
	query := `
		SELECT
			COUNT(*) FILTER (WHERE status = 'active') as active,
			COUNT(*) FILTER (WHERE status = 'converted') as converted,
			COUNT(*) FILTER (WHERE status = 'expired') as expired,
			COUNT(*) FILTER (WHERE status = 'dropped') as dropped,
			COUNT(*) FILTER (WHERE status = 'active' AND expires_at <= NOW() + INTERVAL '3 days') as expiring_soon
		FROM trials`

	s := &models.TrialStats{}
	err := r.db.Pool.QueryRow(ctx, query).Scan(
		&s.TotalActive, &s.TotalConverted, &s.TotalExpired,
		&s.TotalDropped, &s.ExpiringIn3Days,
	)
	return s, err
}

func (r *TrialRepository) GetExpiringTrials(ctx context.Context) ([]*models.Trial, error) {
	query := `
		SELECT ` + trialSelectCols + `
		FROM trials t
		LEFT JOIN companies c ON c.id = t.company_id
		WHERE t.status = 'active'
		  AND t.expires_at <= NOW() + INTERVAL '3 days'
		  AND t.reminder_sent = false
		ORDER BY t.expires_at ASC`

	return r.queryTrials(ctx, query)
}

func (r *TrialRepository) GetExpiredTrials(ctx context.Context) ([]*models.Trial, error) {
	query := `
		SELECT ` + trialSelectCols + `
		FROM trials t
		LEFT JOIN companies c ON c.id = t.company_id
		WHERE t.status = 'active' AND t.expires_at < $1
		ORDER BY t.expires_at ASC`

	return r.queryTrials(ctx, query, time.Now())
}

func (r *TrialRepository) queryTrials(ctx context.Context, query string, args ...interface{}) ([]*models.Trial, error) {
	rows, err := r.db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var trials []*models.Trial
	for rows.Next() {
		t, err := scanTrialRow(rows)
		if err != nil {
			return nil, err
		}
		trials = append(trials, t)
	}
	return trials, nil
}
