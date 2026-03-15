package helper

import (
	"fmt"
	"os"
	"strconv"
)

// AppConfig holds all application configuration.
type AppConfig struct {
	Port        string
	Environment string
	AppBaseURL  string
	JWTSecret   string
	DatabaseURL string
	RedisURL    string
	SMTP        SMTPConfig
	GoogleCal   GoogleCalConfig
}

// SMTPConfig holds SMTP connection settings.
type SMTPConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	From     string
}

// GoogleCalConfig holds Google Calendar / Meet integration settings.
// Set GOOGLE_SERVICE_ACCOUNT_JSON (full JSON key content) and
// GOOGLE_CALENDAR_ID (host's email) to enable real Meet link generation.
type GoogleCalConfig struct {
	ServiceAccountJSON string // full JSON key, set via GOOGLE_SERVICE_ACCOUNT_JSON
	CalendarID         string // host calendar e.g. "you@gmail.com", set via GOOGLE_CALENDAR_ID
}

// LoadConfig reads configuration from environment variables.
func LoadConfig() (*AppConfig, error) {
	smtpPort, err := strconv.Atoi(getEnv("SMTP_PORT", "587"))
	if err != nil {
		return nil, fmt.Errorf("invalid SMTP_PORT: %w", err)
	}

	return &AppConfig{
		Port:        getEnv("PORT", "8080"),
		Environment: getEnv("ENVIRONMENT", "development"),
		AppBaseURL:  getEnv("APP_BASE_URL", "http://localhost:3000"),
		JWTSecret:   getEnv("JWT_SECRET", "dev-secret-key"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://aisales_user:aisales_secret@localhost:5432/aisales?sslmode=disable"),
		RedisURL:    getEnv("REDIS_URL", "redis://:aisales_redis_secret@localhost:6379/0"),
		SMTP: SMTPConfig{
			Host:     getEnv("SMTP_HOST", "smtp.gmail.com"),
			Port:     smtpPort,
			User:     getEnv("SMTP_USER", ""),
			Password: getEnv("SMTP_PASS", ""),
			From:     getEnv("SMTP_FROM", "AI Sales Platform <noreply@example.com>"),
		},
		GoogleCal: GoogleCalConfig{
			ServiceAccountJSON: getEnv("GOOGLE_SERVICE_ACCOUNT_JSON", ""),
			CalendarID:         getEnv("GOOGLE_CALENDAR_ID", ""),
		},
	}, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
