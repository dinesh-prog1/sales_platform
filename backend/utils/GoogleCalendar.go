package utils

import (
	"context"
	"fmt"
	"time"

	"golang.org/x/oauth2/google"
	"google.golang.org/api/calendar/v3"
	"google.golang.org/api/option"
)

// GoogleCalendarService creates Google Calendar events with Meet links using a
// service account. The service account must have been granted access to the
// host calendar (via Google Calendar sharing settings).
type GoogleCalendarService struct {
	svc        *calendar.Service
	calendarID string // usually the host's email address
}

// NewGoogleCalendarService parses a service-account JSON key and returns a ready
// GoogleCalendarService. calendarID is typically the host's Google email.
func NewGoogleCalendarService(ctx context.Context, serviceAccountJSON, calendarID string) (*GoogleCalendarService, error) {
	creds, err := google.CredentialsFromJSON(
		ctx,
		[]byte(serviceAccountJSON),
		calendar.CalendarEventsScope,
	)
	if err != nil {
		return nil, fmt.Errorf("parse service-account credentials: %w", err)
	}

	svc, err := calendar.NewService(ctx, option.WithCredentials(creds))
	if err != nil {
		return nil, fmt.Errorf("create calendar service: %w", err)
	}

	return &GoogleCalendarService{svc: svc, calendarID: calendarID}, nil
}

// CreateMeetEvent inserts a Google Calendar event with a Google Meet conference
// and returns the video join URL (e.g. https://meet.google.com/xxx-xxxx-xxx).
func (g *GoogleCalendarService) CreateMeetEvent(
	ctx context.Context,
	title string,
	attendeeEmail string,
	startTime time.Time,
	durationMinutes int,
) (string, error) {
	endTime := startTime.Add(time.Duration(durationMinutes) * time.Minute)

	event := &calendar.Event{
		Summary: title,
		Attendees: []*calendar.EventAttendee{
			{Email: attendeeEmail},
		},
		Start: &calendar.EventDateTime{
			DateTime: startTime.UTC().Format(time.RFC3339),
			TimeZone: "UTC",
		},
		End: &calendar.EventDateTime{
			DateTime: endTime.UTC().Format(time.RFC3339),
			TimeZone: "UTC",
		},
		ConferenceData: &calendar.ConferenceData{
			CreateRequest: &calendar.CreateConferenceRequest{
				RequestId: fmt.Sprintf("aisales-%d", startTime.Unix()),
				ConferenceSolutionKey: &calendar.ConferenceSolutionKey{
					Type: "hangoutsMeet",
				},
			},
		},
	}

	created, err := g.svc.Events.Insert(g.calendarID, event).
		ConferenceDataVersion(1).
		Context(ctx).
		Do()
	if err != nil {
		return "", fmt.Errorf("insert calendar event: %w", err)
	}

	if created.ConferenceData != nil {
		for _, ep := range created.ConferenceData.EntryPoints {
			if ep.EntryPointType == "video" {
				return ep.Uri, nil
			}
		}
	}

	return "", fmt.Errorf("calendar event created but no Meet link returned")
}
