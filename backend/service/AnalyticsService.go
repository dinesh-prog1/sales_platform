package service

import (
	"context"
	"time"

	"github.com/aisales/backend/helper"
	"github.com/aisales/backend/models"
)

type AnalyticsService struct {
	db *helper.DB
}

func NewAnalyticsService(db *helper.DB) *AnalyticsService {
	return &AnalyticsService{db: db}
}

func (s *AnalyticsService) GetDashboard(ctx context.Context) (*models.AnalyticsDashboard, error) {
	pipeline, err := s.getPipelineMetrics(ctx)
	if err != nil {
		return nil, err
	}

	emailMetrics, err := s.getEmailMetrics(ctx)
	if err != nil {
		return nil, err
	}

	companyMetrics, err := s.getCompanyMetrics(ctx)
	if err != nil {
		return nil, err
	}

	trialMetrics, err := s.getTrialMetrics(ctx)
	if err != nil {
		return nil, err
	}

	dailyTrend, err := s.getDailyTrend(ctx, 30)
	if err != nil {
		return nil, err
	}

	sizeBreakdown, err := s.getSizeBreakdown(ctx)
	if err != nil {
		return nil, err
	}

	pipelineChart := []models.PipelinePoint{
		{Stage: "Uploaded", Count: pipeline.TotalCompanies, Color: "#3B82F6"},
		{Stage: "Outreach Sent", Count: pipeline.OutreachSent, Color: "#6366F1"},
		{Stage: "Interested", Count: pipeline.Interested, Color: "#8B5CF6"},
		{Stage: "Demo Scheduled", Count: pipeline.DemoScheduled, Color: "#EC4899"},
		{Stage: "Demo Completed", Count: pipeline.DemoCompleted, Color: "#F59E0B"},
		{Stage: "Trial Started", Count: pipeline.TrialStarted, Color: "#10B981"},
		{Stage: "Converted", Count: pipeline.Converted, Color: "#059669"},
	}

	return &models.AnalyticsDashboard{
		Pipeline:      *pipeline,
		Email:         *emailMetrics,
		Companies:     *companyMetrics,
		Trials:        *trialMetrics,
		DailyTrend:    dailyTrend,
		PipelineChart: pipelineChart,
		SizeBreakdown: sizeBreakdown,
	}, nil
}

func (s *AnalyticsService) getPipelineMetrics(ctx context.Context) (*models.PipelineMetrics, error) {
	query := `
		SELECT
			COUNT(*) as total,
			COUNT(*) FILTER (WHERE status = 'outreach_sent') as outreach_sent,
			COUNT(*) FILTER (WHERE status = 'interested') as interested,
			COUNT(*) FILTER (WHERE status IN ('demo_scheduled', 'demo_invited')) as demo_scheduled,
			COUNT(*) FILTER (WHERE status = 'demo_completed') as demo_completed,
			COUNT(*) FILTER (WHERE status = 'trial_started') as trial_started,
			COUNT(*) FILTER (WHERE status = 'converted') as converted,
			COUNT(*) FILTER (WHERE status = 'dropped') as dropped
		FROM companies`

	m := &models.PipelineMetrics{}
	err := s.db.Pool.QueryRow(ctx, query).Scan(
		&m.TotalCompanies, &m.OutreachSent, &m.Interested,
		&m.DemoScheduled, &m.DemoCompleted, &m.TrialStarted,
		&m.Converted, &m.Dropped,
	)
	if err != nil {
		return nil, err
	}

	if m.TotalCompanies > 0 {
		m.ConversionRate = float64(m.Converted) / float64(m.TotalCompanies) * 100
	}

	return m, nil
}

func (s *AnalyticsService) getEmailMetrics(ctx context.Context) (*models.EmailAnalytics, error) {
	query := `
		SELECT
			COUNT(*) FILTER (WHERE status = 'sent') as total_sent,
			COUNT(*) FILTER (WHERE status = 'sent' AND DATE(sent_at) = CURRENT_DATE) as sent_today,
			COUNT(*) FILTER (WHERE status = 'failed') as total_failed,
			COUNT(*) FILTER (WHERE status = 'opened') as total_opened,
			COUNT(*) FILTER (WHERE status = 'replied') as total_replied
		FROM email_logs`

	m := &models.EmailAnalytics{}
	err := s.db.Pool.QueryRow(ctx, query).Scan(
		&m.TotalSent, &m.SentToday, &m.TotalFailed, &m.TotalOpened, &m.TotalReplied,
	)
	if err != nil {
		return nil, err
	}

	if m.TotalSent > 0 {
		m.OpenRate = float64(m.TotalOpened) / float64(m.TotalSent) * 100
		m.ReplyRate = float64(m.TotalReplied) / float64(m.TotalSent) * 100
	}

	return m, nil
}

func (s *AnalyticsService) getCompanyMetrics(ctx context.Context) (*models.CompanyAnalytics, error) {
	query := `
		SELECT
			COUNT(*) as total,
			COUNT(*) FILTER (WHERE size = 'small') as small,
			COUNT(*) FILTER (WHERE size = 'medium') as medium,
			COUNT(*) FILTER (WHERE size = 'large') as large,
			COUNT(*) FILTER (WHERE status = 'not_interested') as not_interested
		FROM companies`

	m := &models.CompanyAnalytics{}
	err := s.db.Pool.QueryRow(ctx, query).Scan(
		&m.Total, &m.Small, &m.Medium, &m.Large, &m.NotInterested,
	)
	return m, err
}

func (s *AnalyticsService) getTrialMetrics(ctx context.Context) (*models.TrialAnalytics, error) {
	query := `
		SELECT
			COUNT(*) FILTER (WHERE status = 'active') as active,
			COUNT(*) FILTER (WHERE status = 'converted') as converted,
			COUNT(*) FILTER (WHERE status = 'expired') as expired,
			COUNT(*) FILTER (WHERE status = 'dropped') as dropped,
			COUNT(*) FILTER (WHERE status = 'active' AND expires_at <= NOW() + INTERVAL '3 days') as expiring_soon
		FROM trials`

	m := &models.TrialAnalytics{}
	err := s.db.Pool.QueryRow(ctx, query).Scan(
		&m.Active, &m.Converted, &m.Expired, &m.Dropped, &m.ExpiringIn3Days,
	)
	if err != nil {
		return nil, err
	}

	var feedbackCount int64
	s.db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM email_logs WHERE type = 'feedback' AND status = 'sent'`).Scan(&feedbackCount)
	m.FeedbackSent = feedbackCount

	return m, nil
}

func (s *AnalyticsService) getDailyTrend(ctx context.Context, days int) ([]models.DailyPoint, error) {
	query := `
		SELECT
			DATE(sent_at) as date,
			COUNT(*) as count
		FROM email_logs
		WHERE status = 'sent'
		  AND sent_at >= NOW() - INTERVAL '1 day' * $1
		GROUP BY DATE(sent_at)
		ORDER BY date ASC`

	rows, err := s.db.Pool.Query(ctx, query, days)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	points := []models.DailyPoint{}
	for rows.Next() {
		var date time.Time
		var count int64
		if err := rows.Scan(&date, &count); err != nil {
			return nil, err
		}
		points = append(points, models.DailyPoint{
			Date:  date.Format("Jan 02"),
			Count: count,
		})
	}
	return points, nil
}

func (s *AnalyticsService) getSizeBreakdown(ctx context.Context) ([]models.SizePoint, error) {
	query := `
		SELECT size, COUNT(*) as count
		FROM companies
		GROUP BY size
		ORDER BY count DESC`

	rows, err := s.db.Pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	points := []models.SizePoint{}
	for rows.Next() {
		var p models.SizePoint
		if err := rows.Scan(&p.Size, &p.Count); err != nil {
			return nil, err
		}
		points = append(points, p)
	}
	return points, nil
}
