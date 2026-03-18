package helper

import (
	"context"
	"fmt"
	"log"
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

// ApplyMigrations runs each migration file exactly once, tracking applied
// migrations in a schema_migrations table. Safe to call on every startup.
func ApplyMigrations(ctx context.Context, db *DB) error {
	// Ensure the tracking table exists.
	_, err := db.Pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			filename   TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return fmt.Errorf("create schema_migrations table: %w", err)
	}

	migrations := []string{
		"migrations/001_init.sql",
		"migrations/002_demo_booking_updates.sql",
		"migrations/003_trial_nullable_company.sql",
		"migrations/004_email_logs_nullable_company.sql",
		"migrations/005_email_config_quotas.sql",
		"migrations/006_professional_email_templates.sql",
		"migrations/007_subscriptions.sql",
		"migrations/008_multi_templates.sql",
	}

	for _, path := range migrations {
		// Skip if already applied.
		var already bool
		err := db.Pool.QueryRow(ctx,
			`SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE filename = $1)`, path,
		).Scan(&already)
		if err != nil {
			return fmt.Errorf("check migration %s: %w", path, err)
		}
		if already {
			continue
		}

		data, err := readFile(path)
		if err != nil {
			return fmt.Errorf("read migration %s: %w", path, err)
		}
		if _, err := db.Pool.Exec(ctx, string(data)); err != nil {
			return fmt.Errorf("apply migration %s: %w", path, err)
		}

		// Record it as applied.
		if _, err := db.Pool.Exec(ctx,
			`INSERT INTO schema_migrations (filename) VALUES ($1)`, path,
		); err != nil {
			return fmt.Errorf("record migration %s: %w", path, err)
		}

		log.Printf("  ✓ applied %s", path)
	}

	return nil
}
