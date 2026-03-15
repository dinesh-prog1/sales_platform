package service

import (
	"context"
	"fmt"
	"hash/fnv"
	"log"
	"net/mail"
	"strings"
	"time"

	"github.com/aisales/backend/models"
	"github.com/aisales/backend/repository"
)

type DemoEmailSender interface {
	SendDemoConfirmation(ctx context.Context, companyID, toEmail, toName, companyName, meetingLink string, scheduledAt time.Time) error
}

// GoogleCalendarClient is an optional dependency; if nil, meet links fall back
// to the deterministic generated format.
type GoogleCalendarClient interface {
	CreateMeetEvent(ctx context.Context, title, attendeeEmail string, startTime time.Time, durationMinutes int) (string, error)
}

type DemoService struct {
	repo        *repository.DemoRepository
	companyRepo *repository.CompanyRepository
	emailSender DemoEmailSender
	googleCal   GoogleCalendarClient
	appBaseURL  string
}

func NewDemoService(repo *repository.DemoRepository, companyRepo *repository.CompanyRepository) *DemoService {
	return &DemoService{repo: repo, companyRepo: companyRepo}
}

func (s *DemoService) SetEmailSender(es DemoEmailSender)        { s.emailSender = es }
func (s *DemoService) SetGoogleCalendar(gc GoogleCalendarClient) { s.googleCal = gc }
func (s *DemoService) SetAppBaseURL(url string)                  { s.appBaseURL = url }

func (s *DemoService) CreateBooking(ctx context.Context, req models.DemoCreateRequest) (*models.DemoBooking, error) {
	b := &models.DemoBooking{
		CompanyID:   req.CompanyID,
		ScheduledAt: req.ScheduledAt,
		Status:      models.DemoStatusPending,
		MeetingLink: req.MeetingLink,
		Notes:       req.Notes,
	}
	if err := s.repo.Create(ctx, b); err != nil {
		return nil, fmt.Errorf("create booking: %w", err)
	}
	return b, nil
}

func (s *DemoService) GetBooking(ctx context.Context, id string) (*models.DemoBooking, error) {
	b, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if b == nil {
		return nil, fmt.Errorf("booking not found")
	}
	return b, nil
}

func (s *DemoService) UpdateBooking(ctx context.Context, id string, req models.DemoUpdateRequest) error {
	return s.repo.Update(ctx, id, req)
}

func (s *DemoService) ListBookings(ctx context.Context, f models.DemoListFilter) (*models.DemoListResponse, error) {
	return s.repo.List(ctx, f)
}

func (s *DemoService) GetStats(ctx context.Context) (*models.DemoStats, error) {
	return s.repo.GetStats(ctx)
}

func (s *DemoService) GetSlotAvailability(ctx context.Context, dateStr string) (*models.DemoSlotAvailability, error) {
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return nil, fmt.Errorf("invalid date format, use YYYY-MM-DD")
	}
	taken, err := s.repo.GetTakenSlots(ctx, date)
	if err != nil {
		return nil, err
	}
	takenSet := make(map[string]bool)
	for _, t := range taken {
		takenSet[t] = true
	}
	allSlots := []string{string(models.SlotMorning), string(models.SlotAfternoon), string(models.SlotEvening)}
	var available []string
	for _, sl := range allSlots {
		if !takenSet[sl] {
			available = append(available, sl)
		}
	}
	return &models.DemoSlotAvailability{Date: dateStr, TakenSlots: taken, AvailableSlots: available}, nil
}

// PublicBook handles a demo booking from the public form.
// The booking is created with status "pending" so the admin can review,
// paste the real meeting link, and confirm it via ConfirmDemo.
func (s *DemoService) PublicBook(ctx context.Context, req models.PublicBookRequest) (*models.DemoBooking, error) {
	if strings.TrimSpace(req.FullName) == "" {
		return nil, fmt.Errorf("full name is required")
	}
	if strings.TrimSpace(req.CompanyName) == "" {
		return nil, fmt.Errorf("company name is required")
	}
	if strings.TrimSpace(req.Email) == "" {
		return nil, fmt.Errorf("email is required")
	}
	if _, err := mail.ParseAddress(req.Email); err != nil {
		return nil, fmt.Errorf("invalid email format")
	}
	if strings.TrimSpace(req.DemoDate) == "" {
		return nil, fmt.Errorf("demo date is required")
	}
	slot := models.DemoTimeSlot(strings.TrimSpace(req.TimeSlot))
	if slot != models.SlotMorning && slot != models.SlotAfternoon && slot != models.SlotEvening {
		return nil, fmt.Errorf("time_slot must be morning, afternoon, or evening")
	}
	date, err := time.Parse("2006-01-02", strings.TrimSpace(req.DemoDate))
	if err != nil {
		return nil, fmt.Errorf("invalid demo_date, use YYYY-MM-DD")
	}
	if date.Before(time.Now().Truncate(24 * time.Hour)) {
		return nil, fmt.Errorf("demo date cannot be in the past")
	}
	taken, err := s.repo.GetTakenSlots(ctx, date)
	if err != nil {
		return nil, fmt.Errorf("check slot availability: %w", err)
	}
	for _, t := range taken {
		if t == string(slot) {
			return nil, fmt.Errorf("the %s slot on %s is already booked. Please choose another time", slot, req.DemoDate)
		}
	}
	hour := models.SlotHour[slot]
	scheduledAt := time.Date(date.Year(), date.Month(), date.Day(), hour, 0, 0, 0, time.UTC)
	var companyID string
	if s.companyRepo != nil {
		existing, _ := s.companyRepo.GetByEmail(ctx, req.Email)
		if existing != nil {
			companyID = existing.ID
			_ = s.companyRepo.UpdateStatus(ctx, existing.ID, models.CompanyStatusDemoScheduled, "Demo booked via public form — awaiting admin confirmation")
		}
	}
	b := &models.DemoBooking{
		CompanyID:     companyID,
		BookerName:    strings.TrimSpace(req.FullName),
		BookerEmail:   strings.TrimSpace(req.Email),
		BookerCompany: strings.TrimSpace(req.CompanyName),
		ScheduledAt:   &scheduledAt,
		TimeSlot:      string(slot),
		Status:        models.DemoStatusPending,
		MeetingLink:   "",
		Notes:         fmt.Sprintf("Booked via public form. Slot: %s", slot),
	}
	if err := s.repo.Create(ctx, b); err != nil {
		return nil, fmt.Errorf("save booking: %w", err)
	}
	return b, nil
}

// ConfirmDemo sets the meeting link on a pending booking, updates its status to
// "confirmed", and sends the demo_confirm email directly to the attendee.
func (s *DemoService) ConfirmDemo(ctx context.Context, id, meetingLink string) (*models.DemoBooking, error) {
	meetingLink = strings.TrimSpace(meetingLink)
	if meetingLink == "" {
		return nil, fmt.Errorf("meeting link is required")
	}
	b, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get booking: %w", err)
	}
	if b == nil {
		return nil, fmt.Errorf("booking not found")
	}
	if b.Status != models.DemoStatusPending {
		return nil, fmt.Errorf("booking is already %s", b.Status)
	}
	if err := s.repo.ConfirmBooking(ctx, id, meetingLink); err != nil {
		return nil, fmt.Errorf("confirm booking: %w", err)
	}
	if s.companyRepo != nil && b.CompanyID != "" {
		_ = s.companyRepo.UpdateStatus(ctx, b.CompanyID, models.CompanyStatusDemoScheduled, "Demo confirmed with meeting link")
	}
	toEmail := b.BookerEmail
	if toEmail == "" {
		toEmail = b.CompanyEmail
	}
	toName := b.BookerName
	if toName == "" {
		toName = b.CompanyName
	}
	companyName := b.BookerCompany
	if companyName == "" {
		companyName = b.CompanyName
	}
	var scheduledAt time.Time
	if b.ScheduledAt != nil {
		scheduledAt = *b.ScheduledAt
	} else {
		scheduledAt = time.Now()
	}
	if s.emailSender != nil && toEmail != "" {
		go func() {
			bgCtx := context.Background()
			if err := s.emailSender.SendDemoConfirmation(bgCtx, b.CompanyID, toEmail, toName, companyName, meetingLink, scheduledAt); err != nil {
				log.Printf("[DemoService] ConfirmDemo: send email failed for booking %s: %v", id, err)
			}
		}()
	}
	updated, err := s.repo.GetByID(ctx, id)
	if err != nil || updated == nil {
		b.Status = models.DemoStatusConfirmed
		b.MeetingLink = meetingLink
		return b, nil
	}
	return updated, nil
}

// DeleteBooking hard-deletes a demo booking, automatically freeing the time slot.
// If the booking had a linked company, its status is reset to demo_invited so
// the admin can invite them again.
func (s *DemoService) DeleteBooking(ctx context.Context, id string) error {
	companyID, err := s.repo.Delete(ctx, id)
	if err != nil {
		return fmt.Errorf("delete booking: %w", err)
	}
	if s.companyRepo != nil && companyID != "" {
		_ = s.companyRepo.UpdateStatus(ctx, companyID, models.CompanyStatusDemoInvited, "Demo booking deleted — slot unblocked")
	}
	return nil
}

func (s *DemoService) CreatePublicBooking(ctx context.Context, req models.PublicScheduleRequest) (*models.DemoBooking, error) {
	if strings.TrimSpace(req.CompanyID) == "" {
		return nil, fmt.Errorf("company_id is required")
	}
	var scheduledAt *time.Time
	if strings.TrimSpace(req.PreferredDate) != "" {
		if parsed, err := time.Parse(time.RFC3339, req.PreferredDate); err == nil {
			scheduledAt = &parsed
		}
	}
	booking := &models.DemoBooking{
		CompanyID:   req.CompanyID,
		ScheduledAt: scheduledAt,
		Status:      models.DemoStatusPending,
		Notes: fmt.Sprintf(
			"Schedule request from %s (%s)\nPreferred date: %s\nMessage: %s",
			strings.TrimSpace(req.Name),
			strings.TrimSpace(req.Email),
			strings.TrimSpace(req.PreferredDate),
			strings.TrimSpace(req.Message),
		),
	}
	if err := s.repo.Create(ctx, booking); err != nil {
		return nil, fmt.Errorf("create booking: %w", err)
	}
	if s.companyRepo != nil {
		_ = s.companyRepo.UpdateStatus(ctx, req.CompanyID, models.CompanyStatusDemoScheduled, "Demo schedule form submitted — awaiting confirmation")
	}
	return booking, nil
}

// generateDemoMeetLink is kept for reference but is no longer used automatically.
func generateDemoMeetLink(companyName, date, slot string) string {
	seed := fmt.Sprintf("%s|%s|%s", strings.ToLower(companyName), date, slot)
	h := fnv.New32a()
	h.Write([]byte(seed))
	v := h.Sum32()
	const letters = "abcdefghijklmnopqrstuvwxyz"
	next := func(n int) string {
		buf := make([]byte, n)
		for i := range buf {
			v = v*1664525 + 1013904223
			buf[i] = letters[v%26]
		}
		return string(buf)
	}
	return fmt.Sprintf("https://meet.google.com/%s-%s-%s", next(3), next(4), next(3))
}
