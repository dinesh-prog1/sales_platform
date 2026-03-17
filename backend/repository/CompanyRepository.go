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

type CompanyRepository struct {
	db *helper.DB
}

func NewCompanyRepository(db *helper.DB) *CompanyRepository {
	return &CompanyRepository{db: db}
}

func (r *CompanyRepository) Create(ctx context.Context, c *models.Company) error {
	query := `
		INSERT INTO companies (name, size, email, contact_person, industry, department, country, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at, updated_at`

	return r.db.Pool.QueryRow(ctx, query,
		c.Name, c.Size, c.Email, c.ContactPerson, c.Industry, c.Department, c.Country, c.Status,
	).Scan(&c.ID, &c.CreatedAt, &c.UpdatedAt)
}

func (r *CompanyRepository) BulkCreate(ctx context.Context, companies []*models.Company) (int, int, error) {
	imported := 0
	skipped := 0

	for _, c := range companies {
		err := r.Create(ctx, c)
		if err != nil {
			if strings.Contains(err.Error(), "unique") {
				skipped++
				continue
			}
			return imported, skipped, fmt.Errorf("insert company %s: %w", c.Email, err)
		}
		imported++
	}
	return imported, skipped, nil
}

func (r *CompanyRepository) GetByID(ctx context.Context, id string) (*models.Company, error) {
	query := `
		SELECT id, name, size, email,
			COALESCE(contact_person, ''),
			COALESCE(industry, ''),
			COALESCE(department, ''),
			COALESCE(country, ''),
			status,
			COALESCE(notes, ''),
			created_at, updated_at
		FROM companies WHERE id = $1`

	c := &models.Company{}
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&c.ID, &c.Name, &c.Size, &c.Email, &c.ContactPerson,
		&c.Industry, &c.Department, &c.Country, &c.Status, &c.Notes, &c.CreatedAt, &c.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return c, err
}

func (r *CompanyRepository) GetByEmail(ctx context.Context, email string) (*models.Company, error) {
	query := `
		SELECT id, name, size, email,
			COALESCE(contact_person, ''),
			COALESCE(industry, ''),
			COALESCE(department, ''),
			COALESCE(country, ''),
			status,
			COALESCE(notes, ''),
			created_at, updated_at
		FROM companies WHERE email = $1`

	c := &models.Company{}
	err := r.db.Pool.QueryRow(ctx, query, strings.ToLower(strings.TrimSpace(email))).Scan(
		&c.ID, &c.Name, &c.Size, &c.Email, &c.ContactPerson,
		&c.Industry, &c.Department, &c.Country, &c.Status, &c.Notes, &c.CreatedAt, &c.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return c, err
}

func (r *CompanyRepository) List(ctx context.Context, f models.CompanyListFilter) (*models.CompanyListResponse, error) {
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
	if f.Size != "" {
		conditions = append(conditions, fmt.Sprintf("size = $%d", argIdx))
		args = append(args, f.Size)
		argIdx++
	}
	if f.Search != "" {
		conditions = append(conditions, fmt.Sprintf(
			"(name ILIKE $%d OR email ILIKE $%d OR contact_person ILIKE $%d)",
			argIdx, argIdx, argIdx,
		))
		args = append(args, "%"+f.Search+"%")
		argIdx++
	}
	if f.Department != "" {
		conditions = append(conditions, fmt.Sprintf("department = $%d", argIdx))
		args = append(args, f.Department)
		argIdx++
	}
	if f.Country != "" {
		conditions = append(conditions, fmt.Sprintf("country ILIKE $%d", argIdx))
		args = append(args, f.Country)
		argIdx++
	}

	where := ""
	if len(conditions) > 0 {
		where = "WHERE " + strings.Join(conditions, " AND ")
	}

	orderBy := "ORDER BY created_at DESC"
	switch f.SortBy {
	case "size_asc":
		orderBy = "ORDER BY CASE size WHEN 'small' THEN 1 WHEN 'medium' THEN 2 WHEN 'large' THEN 3 END ASC"
	case "size_desc":
		orderBy = "ORDER BY CASE size WHEN 'small' THEN 1 WHEN 'medium' THEN 2 WHEN 'large' THEN 3 END DESC"
	}

	var total int64
	if err := r.db.Pool.QueryRow(ctx, fmt.Sprintf("SELECT COUNT(*) FROM companies %s", where), args...).Scan(&total); err != nil {
		return nil, fmt.Errorf("count companies: %w", err)
	}

	args = append(args, f.Limit, offset)
	dataQuery := fmt.Sprintf(`
		SELECT id, name, size, email,
			COALESCE(contact_person, ''),
			COALESCE(industry, ''),
			COALESCE(department, ''),
			COALESCE(country, ''),
			status,
			COALESCE(notes, ''),
			created_at, updated_at
		FROM companies %s
		%s
		LIMIT $%d OFFSET $%d`, where, orderBy, argIdx, argIdx+1)

	rows, err := r.db.Pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("query companies: %w", err)
	}
	defer rows.Close()

	var companies []*models.Company
	for rows.Next() {
		c := &models.Company{}
		if err := rows.Scan(
			&c.ID, &c.Name, &c.Size, &c.Email, &c.ContactPerson,
			&c.Industry, &c.Department, &c.Country, &c.Status, &c.Notes, &c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			return nil, err
		}
		companies = append(companies, c)
	}

	return &models.CompanyListResponse{
		Companies:  companies,
		Total:      total,
		Page:       f.Page,
		Limit:      f.Limit,
		TotalPages: int(math.Ceil(float64(total) / float64(f.Limit))),
	}, nil
}

func (r *CompanyRepository) UpdateStatus(ctx context.Context, id string, status models.CompanyStatus, notes string) error {
	query := `UPDATE companies SET status = $1, notes = $2, updated_at = NOW() WHERE id = $3`
	_, err := r.db.Pool.Exec(ctx, query, status, notes, id)
	return err
}

func (r *CompanyRepository) GetSizeStats(ctx context.Context) (*models.CompanySizeStats, error) {
	query := `
		SELECT
			COUNT(*) FILTER (WHERE size = 'small') as small,
			COUNT(*) FILTER (WHERE size = 'medium') as medium,
			COUNT(*) FILTER (WHERE size = 'large') as large
		FROM companies`

	s := &models.CompanySizeStats{}
	err := r.db.Pool.QueryRow(ctx, query).Scan(&s.Small, &s.Medium, &s.Large)
	return s, err
}

func (r *CompanyRepository) GetStatusStats(ctx context.Context) (*models.CompanyStatusStats, error) {
	query := `
		SELECT
			COUNT(*) FILTER (WHERE status = 'uploaded') as uploaded,
			COUNT(*) FILTER (WHERE status = 'outreach_sent') as outreach_sent,
			COUNT(*) FILTER (WHERE status = 'interested') as interested,
			COUNT(*) FILTER (WHERE status = 'not_interested') as not_interested,
			COUNT(*) FILTER (WHERE status = 'demo_invited') as demo_invited,
			COUNT(*) FILTER (WHERE status = 'demo_scheduled') as demo_scheduled,
			COUNT(*) FILTER (WHERE status = 'demo_completed') as demo_completed,
			COUNT(*) FILTER (WHERE status = 'trial_started') as trial_started,
			COUNT(*) FILTER (WHERE status = 'trial_expired') as trial_expired,
			COUNT(*) FILTER (WHERE status = 'converted') as converted,
			COUNT(*) FILTER (WHERE status = 'dropped') as dropped
		FROM companies`

	s := &models.CompanyStatusStats{}
	err := r.db.Pool.QueryRow(ctx, query).Scan(
		&s.Uploaded, &s.OutreachSent, &s.Interested, &s.NotInterested,
		&s.DemoInvited, &s.DemoScheduled, &s.DemoCompleted,
		&s.TrialStarted, &s.TrialExpired, &s.Converted, &s.Dropped,
	)
	return s, err
}

func (r *CompanyRepository) GetByStatus(ctx context.Context, status models.CompanyStatus) ([]*models.Company, error) {
	query := `
		SELECT id, name, size, email,
			COALESCE(contact_person, ''),
			COALESCE(industry, ''),
			COALESCE(department, ''),
			COALESCE(country, ''),
			status,
			COALESCE(notes, ''),
			created_at, updated_at
		FROM companies WHERE status = $1 ORDER BY created_at ASC`

	rows, err := r.db.Pool.Query(ctx, query, status)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var companies []*models.Company
	for rows.Next() {
		c := &models.Company{}
		if err := rows.Scan(
			&c.ID, &c.Name, &c.Size, &c.Email, &c.ContactPerson,
			&c.Industry, &c.Department, &c.Country, &c.Status, &c.Notes, &c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			return nil, err
		}
		companies = append(companies, c)
	}
	return companies, nil
}

func (r *CompanyRepository) SearchByName(ctx context.Context, q string, limit int) ([]*models.CompanySearchSuggestion, error) {
	if limit <= 0 || limit > 20 {
		limit = 10
	}
	query := `
		SELECT DISTINCT ON (LOWER(name)) id, name,
			COALESCE(industry, ''),
			COALESCE(department, ''),
			COALESCE(country, ''),
			size
		FROM companies
		WHERE name ILIKE $1
		ORDER BY LOWER(name), created_at DESC
		LIMIT $2`

	rows, err := r.db.Pool.Query(ctx, query, "%"+q+"%", limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []*models.CompanySearchSuggestion
	for rows.Next() {
		s := &models.CompanySearchSuggestion{}
		if err := rows.Scan(&s.ID, &s.Name, &s.Industry, &s.Department, &s.Country, &s.Size); err != nil {
			return nil, err
		}
		results = append(results, s)
	}
	return results, nil
}

func (r *CompanyRepository) GetEmailsByName(ctx context.Context, name string) ([]*models.CompanyEmailSuggestion, error) {
	query := `
		SELECT id, email,
			COALESCE(contact_person, ''),
			COALESCE(industry, ''),
			COALESCE(department, ''),
			COALESCE(country, ''),
			size
		FROM companies
		WHERE LOWER(name) = LOWER($1)
		ORDER BY created_at ASC
		LIMIT 20`

	rows, err := r.db.Pool.Query(ctx, query, name)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []*models.CompanyEmailSuggestion
	for rows.Next() {
		e := &models.CompanyEmailSuggestion{}
		if err := rows.Scan(&e.ID, &e.Email, &e.ContactPerson, &e.Industry, &e.Department, &e.Country, &e.Size); err != nil {
			return nil, err
		}
		results = append(results, e)
	}
	return results, nil
}

// GetByStatusSizeLimit fetches up to `limit` companies with the given status and size,
// ordered by created_at ASC (oldest first, so they're picked up in upload order).
func (r *CompanyRepository) GetByStatusSizeLimit(ctx context.Context, status models.CompanyStatus, size models.CompanySize, limit int) ([]*models.Company, error) {
	query := `
		SELECT id, name, size, email,
			COALESCE(contact_person, ''),
			COALESCE(industry, ''),
			COALESCE(department, ''),
			COALESCE(country, ''),
			status,
			COALESCE(notes, ''),
			created_at, updated_at
		FROM companies
		WHERE status = $1 AND size = $2
		ORDER BY created_at ASC
		LIMIT $3`

	rows, err := r.db.Pool.Query(ctx, query, status, size, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var companies []*models.Company
	for rows.Next() {
		c := &models.Company{}
		if err := rows.Scan(
			&c.ID, &c.Name, &c.Size, &c.Email, &c.ContactPerson,
			&c.Industry, &c.Department, &c.Country, &c.Status, &c.Notes, &c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			return nil, err
		}
		companies = append(companies, c)
	}
	return companies, nil
}

func (r *CompanyRepository) TotalCount(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM companies").Scan(&count)
	return count, err
}

func (r *CompanyRepository) Delete(ctx context.Context, id string) error {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Nullify email log references (company_id is nullable after migration 004)
	if _, err := tx.Exec(ctx,
		`UPDATE email_logs SET company_id = NULL WHERE company_id = $1`, id,
	); err != nil {
		return fmt.Errorf("unlink email logs: %w", err)
	}

	tag, err := tx.Exec(ctx, `DELETE FROM companies WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete company: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("company not found")
	}

	return tx.Commit(ctx)
}
