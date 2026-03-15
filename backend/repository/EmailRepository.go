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

type EmailRepository struct {
	db *helper.DB
}

func NewEmailRepository(db *helper.DB) *EmailRepository {
	return &EmailRepository{db: db}
}

func (r *EmailRepository) CreateLog(ctx context.Context, log *models.EmailLog) error {
	query := `
		INSERT INTO email_logs (company_id, type, status, subject, body, to_email, scheduled_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id::text, created_at, updated_at`

	var companyID *string
	if log.CompanyID != "" {
		companyID = &log.CompanyID
	}

	return r.db.Pool.QueryRow(ctx, query,
		companyID, log.Type, log.Status, log.Subject, log.Body, log.ToEmail, log.ScheduledAt,
	).Scan(&log.ID, &log.CreatedAt, &log.UpdatedAt)
}

func (r *EmailRepository) UpdateLogStatus(ctx context.Context, id string, status models.EmailStatus, errMsg string) error {
	query := `
		UPDATE email_logs
		SET status = $1, error_message = $2,
		    sent_at = CASE WHEN $1 = 'sent' THEN NOW() ELSE sent_at END,
		    retry_count = CASE WHEN $1 = 'failed' THEN retry_count + 1 ELSE retry_count END,
		    updated_at = NOW()
		WHERE id = $3`
	_, err := r.db.Pool.Exec(ctx, query, status, errMsg, id)
	return err
}

func (r *EmailRepository) List(ctx context.Context, f models.EmailListFilter) (*models.EmailListResponse, error) {
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

	if f.CompanyID != "" {
		conditions = append(conditions, fmt.Sprintf("company_id = $%d", argIdx))
		args = append(args, f.CompanyID)
		argIdx++
	}
	if f.Type != "" {
		conditions = append(conditions, fmt.Sprintf("type = $%d", argIdx))
		args = append(args, f.Type)
		argIdx++
	}
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
	if err := r.db.Pool.QueryRow(ctx, fmt.Sprintf("SELECT COUNT(*) FROM email_logs %s", where), args...).Scan(&total); err != nil {
		return nil, err
	}

	args = append(args, f.Limit, offset)
	query := fmt.Sprintf(`
		SELECT id, COALESCE(company_id::text,''), type, status, subject, body, to_email,
		       sent_at, opened_at, replied_at, COALESCE(error_message, ''), retry_count, max_retries,
		       scheduled_at, created_at, updated_at
		FROM email_logs %s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d`, where, argIdx, argIdx+1)

	rows, err := r.db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []*models.EmailLog
	for rows.Next() {
		el := &models.EmailLog{}
		if err := rows.Scan(
			&el.ID, &el.CompanyID, &el.Type, &el.Status,
			&el.Subject, &el.Body, &el.ToEmail,
			&el.SentAt, &el.OpenedAt, &el.RepliedAt,
			&el.ErrorMessage, &el.RetryCount, &el.MaxRetries,
			&el.ScheduledAt, &el.CreatedAt, &el.UpdatedAt,
		); err != nil {
			return nil, err
		}
		logs = append(logs, el)
	}

	return &models.EmailListResponse{
		Emails:     logs,
		Total:      total,
		Page:       f.Page,
		Limit:      f.Limit,
		TotalPages: int(math.Ceil(float64(total) / float64(f.Limit))),
	}, nil
}

func (r *EmailRepository) GetStats(ctx context.Context) (*models.EmailStats, error) {
	query := `
		SELECT
			COUNT(*) FILTER (WHERE status = 'sent') as total_sent,
			COUNT(*) FILTER (WHERE status = 'sent' AND DATE(sent_at) = CURRENT_DATE) as sent_today,
			COUNT(*) FILTER (WHERE status = 'failed') as total_failed,
			COUNT(*) FILTER (WHERE status IN ('pending', 'queued')) as total_pending,
			COUNT(*) FILTER (WHERE status = 'opened') as total_opened,
			COUNT(*) FILTER (WHERE status = 'replied') as total_replied
		FROM email_logs`

	s := &models.EmailStats{}
	err := r.db.Pool.QueryRow(ctx, query).Scan(
		&s.TotalSent, &s.SentToday, &s.TotalFailed,
		&s.TotalPending, &s.TotalOpened, &s.TotalReplied,
	)
	return s, err
}

func (r *EmailRepository) GetTemplate(ctx context.Context, emailType models.EmailType) (*models.EmailTemplate, error) {
	query := `SELECT id, type, subject, body, is_active, created_at, updated_at FROM email_templates WHERE type = $1`
	t := &models.EmailTemplate{}
	err := r.db.Pool.QueryRow(ctx, query, emailType).Scan(
		&t.ID, &t.Type, &t.Subject, &t.Body, &t.IsActive, &t.CreatedAt, &t.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return t, err
}

func (r *EmailRepository) GetAllTemplates(ctx context.Context) ([]*models.EmailTemplate, error) {
	rows, err := r.db.Pool.Query(ctx, `SELECT id, type, subject, body, is_active, created_at, updated_at FROM email_templates ORDER BY type`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var templates []*models.EmailTemplate
	for rows.Next() {
		t := &models.EmailTemplate{}
		if err := rows.Scan(&t.ID, &t.Type, &t.Subject, &t.Body, &t.IsActive, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}
		templates = append(templates, t)
	}
	return templates, nil
}

func (r *EmailRepository) UpdateTemplate(ctx context.Context, emailType models.EmailType, req models.UpdateEmailTemplateRequest) error {
	query := `UPDATE email_templates SET subject = $1, body = $2, is_active = $3, updated_at = NOW() WHERE type = $4`
	_, err := r.db.Pool.Exec(ctx, query, req.Subject, req.Body, req.IsActive, emailType)
	return err
}

func (r *EmailRepository) GetConfig(ctx context.Context) (*models.EmailConfig, error) {
	query := `
		SELECT id, emails_per_day, target_size, is_active,
		       COALESCE(scheduling_link, ''), COALESCE(cron_hour, 9),
		       COALESCE(small_quota, 0), COALESCE(medium_quota, 0), COALESCE(large_quota, 0),
		       created_at, updated_at
		FROM email_configs LIMIT 1`
	c := &models.EmailConfig{}
	err := r.db.Pool.QueryRow(ctx, query).Scan(
		&c.ID, &c.EmailsPerDay, &c.TargetSize,
		&c.IsActive, &c.SchedulingLink, &c.CronHour,
		&c.SmallQuota, &c.MediumQuota, &c.LargeQuota,
		&c.CreatedAt, &c.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return &models.EmailConfig{EmailsPerDay: 10, TargetSize: "all", IsActive: true, CronHour: 9}, nil
	}
	return c, err
}

func (r *EmailRepository) UpdateConfig(ctx context.Context, req models.UpdateEmailConfigRequest) error {
	query := `
		UPDATE email_configs
		SET emails_per_day = $1, target_size = $2,
		    is_active = $3, scheduling_link = $4, cron_hour = $5,
		    small_quota = $6, medium_quota = $7, large_quota = $8,
		    updated_at = NOW()`
	_, err := r.db.Pool.Exec(ctx, query,
		req.EmailsPerDay, req.TargetSize,
		req.IsActive, req.SchedulingLink, req.CronHour,
		req.SmallQuota, req.MediumQuota, req.LargeQuota,
	)
	return err
}

func (r *EmailRepository) GetPendingForRetry(ctx context.Context) ([]*models.EmailLog, error) {
	query := `
		SELECT id, COALESCE(company_id::text,''), type, status, subject, body, to_email,
		       sent_at, opened_at, replied_at, COALESCE(error_message, ''), retry_count, max_retries,
		       scheduled_at, created_at, updated_at
		FROM email_logs
		WHERE status = 'failed' AND retry_count < max_retries
		ORDER BY updated_at ASC
		LIMIT 50`

	rows, err := r.db.Pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []*models.EmailLog
	for rows.Next() {
		el := &models.EmailLog{}
		if err := rows.Scan(
			&el.ID, &el.CompanyID, &el.Type, &el.Status,
			&el.Subject, &el.Body, &el.ToEmail,
			&el.SentAt, &el.OpenedAt, &el.RepliedAt,
			&el.ErrorMessage, &el.RetryCount, &el.MaxRetries,
			&el.ScheduledAt, &el.CreatedAt, &el.UpdatedAt,
		); err != nil {
			return nil, err
		}
		logs = append(logs, el)
	}
	return logs, nil
}

// GetPreQueuedOutreach returns outreach log entries that were pre-scheduled for the
// current batch (status='queued', type='outreach', scheduled_at <= NOW). These are
// the emails the scheduler should send in today's run.
func (r *EmailRepository) GetPreQueuedOutreach(ctx context.Context) ([]*models.EmailLog, error) {
	query := `
		SELECT id, COALESCE(company_id::text,''), type, status, subject, body, to_email,
		       sent_at, opened_at, replied_at, COALESCE(error_message, ''), retry_count, max_retries,
		       scheduled_at, created_at, updated_at
		FROM email_logs
		WHERE status = 'queued' AND type = 'outreach' AND scheduled_at <= NOW()
		ORDER BY scheduled_at ASC`

	rows, err := r.db.Pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []*models.EmailLog
	for rows.Next() {
		el := &models.EmailLog{}
		if err := rows.Scan(
			&el.ID, &el.CompanyID, &el.Type, &el.Status,
			&el.Subject, &el.Body, &el.ToEmail,
			&el.SentAt, &el.OpenedAt, &el.RepliedAt,
			&el.ErrorMessage, &el.RetryCount, &el.MaxRetries,
			&el.ScheduledAt, &el.CreatedAt, &el.UpdatedAt,
		); err != nil {
			return nil, err
		}
		logs = append(logs, el)
	}
	return logs, nil
}

// GetStuckQueuedEmails returns emails that have been in 'queued' status for longer than
// stuckAfter (e.g. 5 minutes), meaning they were enqueued in the DB but the Redis/memory
// job was lost (restart, crash, etc.). The worker uses this as a direct-send fallback.
// The scheduled_at <= NOW() guard prevents pre-queued future outreach entries from being
// rescued prematurely (those legitimately sit in 'queued' until their scheduled day).
func (r *EmailRepository) GetStuckQueuedEmails(ctx context.Context, stuckAfter time.Duration) ([]*models.EmailLog, error) {
	cutoff := time.Now().Add(-stuckAfter)
	query := `
		SELECT id, COALESCE(company_id::text,''), type, status, subject, body, to_email,
		       sent_at, opened_at, replied_at, COALESCE(error_message, ''), retry_count, max_retries,
		       scheduled_at, created_at, updated_at
		FROM email_logs
		WHERE status = 'queued' AND created_at < $1 AND sent_at IS NULL AND scheduled_at <= NOW()
		ORDER BY created_at ASC
		LIMIT 50`

	rows, err := r.db.Pool.Query(ctx, query, cutoff)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []*models.EmailLog
	for rows.Next() {
		el := &models.EmailLog{}
		if err := rows.Scan(
			&el.ID, &el.CompanyID, &el.Type, &el.Status,
			&el.Subject, &el.Body, &el.ToEmail,
			&el.SentAt, &el.OpenedAt, &el.RepliedAt,
			&el.ErrorMessage, &el.RetryCount, &el.MaxRetries,
			&el.ScheduledAt, &el.CreatedAt, &el.UpdatedAt,
		); err != nil {
			return nil, err
		}
		logs = append(logs, el)
	}
	return logs, nil
}

func (r *EmailRepository) CountSentToday(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.Pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM email_logs WHERE status = 'sent' AND DATE(sent_at) = CURRENT_DATE`,
	).Scan(&count)
	return count, err
}

// HasEmailBeenQueuedOrSent returns true if ANY email of the given type has ever been
// logged for this company — regardless of status. This enforces the "one outreach per
// company, forever" rule. The only way to reset eligibility is to clear the email logs.
func (r *EmailRepository) HasEmailBeenQueuedOrSent(ctx context.Context, companyID string, emailType models.EmailType) (bool, error) {
	var count int64
	err := r.db.Pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM email_logs WHERE company_id = $1 AND type = $2`,
		companyID, emailType,
	).Scan(&count)
	return count > 0, err
}

// ClaimStuckEmail atomically marks an email as 'failed' (claiming it for rescue)
// only if it is still in 'queued' status. Returns true if the claim succeeded.
// This prevents the queue worker and rescue scanner from both processing the same email.
func (r *EmailRepository) ClaimStuckEmail(ctx context.Context, id string) (bool, error) {
	tag, err := r.db.Pool.Exec(ctx,
		`UPDATE email_logs
		 SET status = 'failed', retry_count = max_retries,
		     error_message = 'rescued: queue job lost', updated_at = NOW()
		 WHERE id = $1 AND status = 'queued'`,
		id,
	)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() == 1, nil
}

// ResetCompanyOutreach deletes all outreach email logs for one company
// and resets its pipeline status back to 'uploaded' so it is eligible
// for outreach again. Both changes are atomic in a single transaction.
func (r *EmailRepository) ResetCompanyOutreach(ctx context.Context, companyID string) error {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx,
		`DELETE FROM email_logs WHERE company_id = $1 AND type = 'outreach'`,
		companyID,
	); err != nil {
		return fmt.Errorf("delete outreach logs: %w", err)
	}

	if _, err := tx.Exec(ctx,
		`UPDATE companies SET status = 'uploaded', notes = '', updated_at = NOW() WHERE id = $1`,
		companyID,
	); err != nil {
		return fmt.Errorf("reset company status: %w", err)
	}

	return tx.Commit(ctx)
}

// ClearAllLogs deletes every email log and resets companies that are in
// 'outreach_sent' status back to 'uploaded' so they are eligible again.
// All done in a single transaction.
func (r *EmailRepository) ClearAllLogs(ctx context.Context) error {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `DELETE FROM email_logs`); err != nil {
		return fmt.Errorf("delete email logs: %w", err)
	}
	// Reset companies back to 'uploaded' so they can receive outreach again
	if _, err := tx.Exec(ctx,
		`UPDATE companies SET status = 'uploaded', notes = '', updated_at = NOW()
		 WHERE status = 'outreach_sent'`,
	); err != nil {
		return fmt.Errorf("reset company statuses: %w", err)
	}

	return tx.Commit(ctx)
}

func (r *EmailRepository) GetDailyEmailTrend(ctx context.Context, days int) ([]map[string]interface{}, error) {
	query := `
		SELECT
			DATE(sent_at) as date,
			COUNT(*) as count
		FROM email_logs
		WHERE status = 'sent'
		  AND sent_at >= NOW() - INTERVAL '1 day' * $1
		GROUP BY DATE(sent_at)
		ORDER BY date ASC`

	rows, err := r.db.Pool.Query(ctx, query, days)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []map[string]interface{}
	for rows.Next() {
		var date time.Time
		var count int64
		if err := rows.Scan(&date, &count); err != nil {
			return nil, err
		}
		result = append(result, map[string]interface{}{
			"date":  date.Format("2006-01-02"),
			"count": count,
		})
	}
	return result, nil
}
