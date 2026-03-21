package helper

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

// AppConfig holds all application configuration.
type AppConfig struct {
	Port               string
	Environment        string
	AppBaseURL         string
	JWTSecret          string
	AdminAPIToken      string
	CORSAllowedOrigins []string
	DatabaseURL        string
	RedisURL           string
	SMTP               SMTPConfig
	GoogleCal          GoogleCalConfig
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

	cfg := &AppConfig{
		Port:               getEnv("PORT", "8080"),
		Environment:        getEnv("ENVIRONMENT", "development"),
		AppBaseURL:         getEnv("APP_BASE_URL", "http://localhost:3000"),
		JWTSecret:          getEnv("JWT_SECRET", "dev-secret-key"),
		AdminAPIToken:      getEnv("ADMIN_API_TOKEN", ""),
		CORSAllowedOrigins: getEnvList("CORS_ALLOWED_ORIGINS", []string{getEnv("APP_BASE_URL", "http://localhost:3000")}),
		DatabaseURL:        getEnv("DATABASE_URL", "postgres://aisales_user:aisales_secret@localhost:5432/aisales?sslmode=disable"),
		RedisURL:           getEnv("REDIS_URL", "redis://:aisales_redis_secret@localhost:6379/0"),
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
	}

	if err := validateConfig(cfg); err != nil {
		return nil, err
	}
	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvList(key string, fallback []string) []string {
	raw := os.Getenv(key)
	if strings.TrimSpace(raw) == "" {
		return fallback
	}

	parts := strings.Split(raw, ",")
	values := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			values = append(values, trimmed)
		}
	}

	if len(values) == 0 {
		return fallback
	}
	return values
}

func validateConfig(cfg *AppConfig) error {
	if strings.EqualFold(cfg.Environment, "production") && strings.TrimSpace(cfg.AdminAPIToken) == "" {
		return fmt.Errorf("ADMIN_API_TOKEN is required when ENVIRONMENT=production")
	}
	return nil
}
