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

type DemoRepository struct {
	db *helper.DB
}

func NewDemoRepository(db *helper.DB) *DemoRepository {
	return &DemoRepository{db: db}
}

func nullableDemoStr(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

func (r *DemoRepository) Create(ctx context.Context, b *models.DemoBooking) error {
	query := `
		INSERT INTO demo_bookings
			(company_id, booker_name, booker_email, booker_company,
			 scheduled_at, time_slot, status, meeting_link, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at, updated_at`
	return r.db.Pool.QueryRow(ctx, query,
		nullableDemoStr(b.CompanyID), b.BookerName, b.BookerEmail, b.BookerCompany,
		b.ScheduledAt, b.TimeSlot, b.Status, b.MeetingLink, b.Notes,
	).Scan(&b.ID, &b.CreatedAt, &b.UpdatedAt)
}

func (r *DemoRepository) GetByID(ctx context.Context, id string) (*models.DemoBooking, error) {
	query := `
		SELECT db.id,
		       COALESCE(db.company_id::text, ''),
		       COALESCE(c.name, db.booker_company, ''),
		       COALESCE(c.email, db.booker_email, ''),
		       COALESCE(db.booker_name, ''),
		       COALESCE(db.booker_email, ''),
		       COALESCE(db.booker_company, ''),
		       db.scheduled_at, COALESCE(db.time_slot, ''), db.status,
		       COALESCE(db.meeting_link, ''), COALESCE(db.calendar_event_id, ''),
		       COALESCE(db.notes, ''), db.completed_at,
		       db.created_at, db.updated_at
		FROM demo_bookings db
		LEFT JOIN companies c ON c.id = db.company_id
		WHERE db.id = $1`

	b := &models.DemoBooking{}
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&b.ID, &b.CompanyID, &b.CompanyName, &b.CompanyEmail,
		&b.BookerName, &b.BookerEmail, &b.BookerCompany,
		&b.ScheduledAt, &b.TimeSlot, &b.Status, &b.MeetingLink, &b.CalendarEventID,
		&b.Notes, &b.CompletedAt, &b.CreatedAt, &b.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return b, err
}

func (r *DemoRepository) GetByCompanyID(ctx context.Context, companyID string) (*models.DemoBooking, error) {
	query := `
		SELECT id, COALESCE(company_id::text,''), scheduled_at, COALESCE(time_slot,''), status,
		       COALESCE(meeting_link, ''), COALESCE(calendar_event_id, ''),
		       COALESCE(notes, ''), completed_at, created_at, updated_at
		FROM demo_bookings WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1`

	b := &models.DemoBooking{}
	err := r.db.Pool.QueryRow(ctx, query, companyID).Scan(
		&b.ID, &b.CompanyID, &b.ScheduledAt, &b.TimeSlot, &b.Status,
		&b.MeetingLink, &b.CalendarEventID, &b.Notes, &b.CompletedAt,
		&b.CreatedAt, &b.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	return b, err
}

func (r *DemoRepository) GetTakenSlots(ctx context.Context, date time.Time) ([]string, error) {
	query := `
		SELECT COALESCE(time_slot,'')
		FROM demo_bookings
		WHERE DATE(scheduled_at AT TIME ZONE 'UTC') = DATE($1 AT TIME ZONE 'UTC')
		  AND status NOT IN ('cancelled')
		  AND time_slot IS NOT NULL`

	rows, err := r.db.Pool.Query(ctx, query, date)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var slots []string
	for rows.Next() {
		var s string
		if err := rows.Scan(&s); err != nil {
			return nil, err
		}
		if s != "" {
			slots = append(slots, s)
		}
	}
	return slots, nil
}

func (r *DemoRepository) Update(ctx context.Context, id string, req models.DemoUpdateRequest) error {
	query := `
		UPDATE demo_bookings
		SET scheduled_at = COALESCE($1, scheduled_at),
		    status = $2,
		    meeting_link = COALESCE(NULLIF($3, ''), meeting_link),
		    notes = COALESCE(NULLIF($4, ''), notes),
		    completed_at = CASE WHEN $2 = 'completed' THEN NOW() ELSE completed_at END,
		    updated_at = NOW()
		WHERE id = $5`
	_, err := r.db.Pool.Exec(ctx, query, req.ScheduledAt, req.Status, req.MeetingLink, req.Notes, id)
	return err
}

func (r *DemoRepository) UpdateMeetingLink(ctx context.Context, id, meetingLink, calendarEventID string) error {
	query := `UPDATE demo_bookings SET meeting_link=$1, calendar_event_id=$2, updated_at=NOW() WHERE id=$3`
	_, err := r.db.Pool.Exec(ctx, query, meetingLink, calendarEventID, id)
	return err
}

func (r *DemoRepository) List(ctx context.Context, f models.DemoListFilter) (*models.DemoListResponse, error) {
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
		conditions = append(conditions, fmt.Sprintf("db.status = $%d", argIdx))
		args = append(args, f.Status)
		argIdx++
	}
	if f.UpcomingOnly {
		conditions = append(conditions, fmt.Sprintf("db.scheduled_at > $%d", argIdx))
		args = append(args, time.Now())
		argIdx++
	}

	where := ""
	if len(conditions) > 0 {
		where = "WHERE " + strings.Join(conditions, " AND ")
	}

	var total int64
	if err := r.db.Pool.QueryRow(ctx,
		fmt.Sprintf("SELECT COUNT(*) FROM demo_bookings db %s", where), args...,
	).Scan(&total); err != nil {
		return nil, err
	}

	args = append(args, f.Limit, offset)
	orderBy := "ORDER BY db.created_at DESC"
	if f.UpcomingOnly {
		orderBy = "ORDER BY db.scheduled_at ASC"
	}

	query := fmt.Sprintf(`
		SELECT db.id,
		       COALESCE(db.company_id::text, ''),
		       COALESCE(c.name, db.booker_company, ''),
		       COALESCE(c.email, db.booker_email, ''),
		       COALESCE(db.booker_name, ''),
		       COALESCE(db.booker_email, ''),
		       COALESCE(db.booker_company, ''),
		       db.scheduled_at, COALESCE(db.time_slot,''), db.status,
		       COALESCE(db.meeting_link, ''), COALESCE(db.calendar_event_id, ''),
		       COALESCE(db.notes, ''), db.completed_at,
		       db.created_at, db.updated_at
		FROM demo_bookings db
		LEFT JOIN companies c ON c.id = db.company_id
		%s
		%s
		LIMIT $%d OFFSET $%d`, where, orderBy, argIdx, argIdx+1)

	rows, err := r.db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var bookings []*models.DemoBooking
	for rows.Next() {
		b := &models.DemoBooking{}
		if err := rows.Scan(
			&b.ID, &b.CompanyID, &b.CompanyName, &b.CompanyEmail,
			&b.BookerName, &b.BookerEmail, &b.BookerCompany,
			&b.ScheduledAt, &b.TimeSlot, &b.Status, &b.MeetingLink, &b.CalendarEventID,
			&b.Notes, &b.CompletedAt, &b.CreatedAt, &b.UpdatedAt,
		); err != nil {
			return nil, err
		}
		bookings = append(bookings, b)
	}

	return &models.DemoListResponse{
		Bookings:   bookings,
		Total:      total,
		Page:       f.Page,
		Limit:      f.Limit,
		TotalPages: int(math.Ceil(float64(total) / float64(f.Limit))),
	}, nil
}

func (r *DemoRepository) GetStats(ctx context.Context) (*models.DemoStats, error) {
	query := `
		SELECT
			(SELECT COUNT(*) FROM companies WHERE status = 'demo_invited') as total_invited,
			COUNT(*) as total_scheduled,
			COUNT(*) FILTER (WHERE status = 'confirmed') as total_confirmed,
			COUNT(*) FILTER (WHERE status = 'completed') as total_completed,
			COUNT(*) FILTER (WHERE status = 'cancelled') as total_cancelled
		FROM demo_bookings`

	s := &models.DemoStats{}
	err := r.db.Pool.QueryRow(ctx, query).Scan(
		&s.TotalInvited, &s.TotalScheduled, &s.TotalConfirmed,
		&s.TotalCompleted, &s.TotalCancelled,
	)
	return s, err
}

// Delete hard-deletes a booking row and returns the associated company_id (empty
// string if the booking had no linked company). Deleting the row automatically
// frees the time slot for new bookings.
func (r *DemoRepository) Delete(ctx context.Context, id string) (string, error) {
	var companyID string
	err := r.db.Pool.QueryRow(ctx,
		`DELETE FROM demo_bookings WHERE id = $1 RETURNING COALESCE(company_id::text, '')`,
		id,
	).Scan(&companyID)
	if err == pgx.ErrNoRows {
		return "", fmt.Errorf("booking not found")
	}
	return companyID, err
}

// ConfirmBooking sets status="confirmed" and meeting_link on a pending booking.
func (r *DemoRepository) ConfirmBooking(ctx context.Context, id, meetingLink string) error {
	query := `
		UPDATE demo_bookings
		SET status = 'confirmed',
		    meeting_link = $1,
		    updated_at = NOW()
		WHERE id = $2 AND status = 'pending'`
	tag, err := r.db.Pool.Exec(ctx, query, meetingLink, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("booking not found or already confirmed")
	}
	return nil
}
