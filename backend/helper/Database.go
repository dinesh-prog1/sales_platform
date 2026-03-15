package helper

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// DB wraps a pgx connection pool.
type DB struct {
	Pool *pgxpool.Pool
}

// NewDatabase creates a new PostgreSQL connection pool.
func NewDatabase(ctx context.Context, dsn string) (*DB, error) {
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("parse database config: %w", err)
	}

	cfg.MaxConns = 25
	cfg.MinConns = 5
	cfg.MaxConnLifetime = 5 * time.Minute
	cfg.MaxConnIdleTime = 2 * time.Minute
	cfg.HealthCheckPeriod = 1 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("create connection pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("ping database: %w", err)
	}

	return &DB{Pool: pool}, nil
}

// Close closes the connection pool.
func (db *DB) Close() {
	db.Pool.Close()
}

// ApplyMigrations reads and executes SQL migration files in order.
func ApplyMigrations(ctx context.Context, db *DB) error {
	migrations := []string{
		"migrations/001_init.sql",
		"migrations/002_demo_booking_updates.sql",
		"migrations/003_trial_nullable_company.sql",
		"migrations/004_email_logs_nullable_company.sql",
		"migrations/005_email_config_quotas.sql",
		"migrations/006_professional_email_templates.sql",
	}

	for _, path := range migrations {
		data, err := readFile(path)
		if err != nil {
			return fmt.Errorf("read migration %s: %w", path, err)
		}
		if _, err := db.Pool.Exec(ctx, string(data)); err != nil {
			return fmt.Errorf("apply migration %s: %w", path, err)
		}
	}

	return nil
}
