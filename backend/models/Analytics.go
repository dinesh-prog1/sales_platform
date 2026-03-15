package models

type AnalyticsDashboard struct {
	Pipeline      PipelineMetrics  `json:"pipeline"`
	Email         EmailAnalytics   `json:"email"`
	Companies     CompanyAnalytics `json:"companies"`
	Trials        TrialAnalytics   `json:"trials"`
	DailyTrend    []DailyPoint     `json:"daily_trend"`
	PipelineChart []PipelinePoint  `json:"pipeline_chart"`
	SizeBreakdown []SizePoint      `json:"size_breakdown"`
}

type PipelineMetrics struct {
	TotalCompanies int64   `json:"total_companies"`
	OutreachSent   int64   `json:"outreach_sent"`
	Interested     int64   `json:"interested"`
	DemoScheduled  int64   `json:"demo_scheduled"`
	DemoCompleted  int64   `json:"demo_completed"`
	TrialStarted   int64   `json:"trial_started"`
	Converted      int64   `json:"converted"`
	Dropped        int64   `json:"dropped"`
	ConversionRate float64 `json:"conversion_rate"`
}

type EmailAnalytics struct {
	TotalSent    int64   `json:"total_sent"`
	SentToday    int64   `json:"sent_today"`
	TotalFailed  int64   `json:"total_failed"`
	TotalOpened  int64   `json:"total_opened"`
	TotalReplied int64   `json:"total_replied"`
	OpenRate     float64 `json:"open_rate"`
	ReplyRate    float64 `json:"reply_rate"`
}

type CompanyAnalytics struct {
	Total         int64 `json:"total"`
	Small         int64 `json:"small"`
	Medium        int64 `json:"medium"`
	Large         int64 `json:"large"`
	NotInterested int64 `json:"not_interested"`
}

type TrialAnalytics struct {
	Active          int64 `json:"active"`
	Converted       int64 `json:"converted"`
	Expired         int64 `json:"expired"`
	Dropped         int64 `json:"dropped"`
	ExpiringIn3Days int64 `json:"expiring_in_3_days"`
	FeedbackSent    int64 `json:"feedback_sent"`
}

type DailyPoint struct {
	Date  string `json:"date"`
	Count int64  `json:"count"`
}

type PipelinePoint struct {
	Stage string `json:"stage"`
	Count int64  `json:"count"`
	Color string `json:"color"`
}

type SizePoint struct {
	Size  string `json:"size"`
	Count int64  `json:"count"`
}
