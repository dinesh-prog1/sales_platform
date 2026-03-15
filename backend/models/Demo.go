package models

import "time"

type DemoStatus string
type DemoTimeSlot string

const (
	DemoStatusPending   DemoStatus = "pending"
	DemoStatusConfirmed DemoStatus = "confirmed"
	DemoStatusCompleted DemoStatus = "completed"
	DemoStatusCancelled DemoStatus = "cancelled"
	DemoStatusNoShow    DemoStatus = "no_show"
	DemoStatusNoTrial   DemoStatus = "no_trial"
)

const (
	SlotMorning   DemoTimeSlot = "morning"   // 10:00 AM
	SlotAfternoon DemoTimeSlot = "afternoon" // 2:00 PM
	SlotEvening   DemoTimeSlot = "evening"   // 6:00 PM
)

// SlotHour maps a slot name to its hour (24h).
var SlotHour = map[DemoTimeSlot]int{
	SlotMorning:   10,
	SlotAfternoon: 14,
	SlotEvening:   18,
}

type DemoBooking struct {
	ID              string     `json:"id"`
	CompanyID       string     `json:"company_id,omitempty"`
	CompanyName     string     `json:"company_name,omitempty"`
	CompanyEmail    string     `json:"company_email,omitempty"`
	BookerName      string     `json:"booker_name,omitempty"`
	BookerEmail     string     `json:"booker_email,omitempty"`
	BookerCompany   string     `json:"booker_company,omitempty"`
	ScheduledAt     *time.Time `json:"scheduled_at"`
	TimeSlot        string     `json:"time_slot,omitempty"`
	Status          DemoStatus `json:"status"`
	MeetingLink     string     `json:"meeting_link"`
	CalendarEventID string     `json:"calendar_event_id"`
	Notes           string     `json:"notes"`
	CompletedAt     *time.Time `json:"completed_at"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type DemoCreateRequest struct {
	CompanyID   string     `json:"company_id"`
	ScheduledAt *time.Time `json:"scheduled_at"`
	MeetingLink string     `json:"meeting_link"`
	Notes       string     `json:"notes"`
}

type DemoUpdateRequest struct {
	ScheduledAt *time.Time `json:"scheduled_at"`
	Status      DemoStatus `json:"status"`
	MeetingLink string     `json:"meeting_link"`
	Notes       string     `json:"notes"`
}

// PublicBookRequest is submitted from the public demo booking form.
type PublicBookRequest struct {
	FullName    string `json:"full_name"`
	CompanyName string `json:"company_name"`
	Email       string `json:"email"`
	DemoDate    string `json:"demo_date"` // YYYY-MM-DD
	TimeSlot    string `json:"time_slot"` // morning | afternoon | evening
}

// PublicScheduleRequest is kept for backward compatibility.
type PublicScheduleRequest struct {
	CompanyID     string `json:"company_id"`
	Name          string `json:"name"`
	Email         string `json:"email"`
	PreferredDate string `json:"preferred_date"`
	Message       string `json:"message"`
}

type DemoSlotAvailability struct {
	Date           string   `json:"date"`
	TakenSlots     []string `json:"taken_slots"`
	AvailableSlots []string `json:"available_slots"`
}

type DemoStats struct {
	TotalInvited   int64 `json:"total_invited"`
	TotalScheduled int64 `json:"total_scheduled"`
	TotalConfirmed int64 `json:"total_confirmed"`
	TotalCompleted int64 `json:"total_completed"`
	TotalCancelled int64 `json:"total_cancelled"`
}

type DemoListFilter struct {
	Status       string
	UpcomingOnly bool
	Page         int
	Limit        int
}

type DemoListResponse struct {
	Bookings   []*DemoBooking `json:"bookings"`
	Total      int64          `json:"total"`
	Page       int            `json:"page"`
	Limit      int            `json:"limit"`
	TotalPages int            `json:"total_pages"`
}

type ConfirmDemoRequest struct {
	MeetingLink string `json:"meeting_link"`
}
