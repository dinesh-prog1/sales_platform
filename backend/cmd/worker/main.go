package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/aisales/backend/helper"
	"github.com/aisales/backend/repository"
	"github.com/aisales/backend/scheduler"
	"github.com/aisales/backend/utils"
)

func main() {
	// Load .env if present
	if err := utils.LoadDotEnv(".env"); err != nil {
		log.Printf("No .env file loaded: %v", err)
	}

	cfg, err := helper.LoadConfig()
	if err != nil {
		log.Fatalf("Load config: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Database
	db, err := helper.NewDatabase(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Connect database: %v", err)
	}
	defer db.Close()

	if err := helper.ApplyMigrations(ctx, db); err != nil {
		log.Fatalf("Apply migrations: %v", err)
	}

	// Queue
	q, err := helper.NewQueue(cfg.RedisURL, cfg.Environment)
	if err != nil {
		log.Fatalf("Init queue: %v", err)
	}
	defer q.Close()

	// Mailer
	m := utils.NewMailer(utils.MailerConfig{
		Host:     cfg.SMTP.Host,
		Port:     cfg.SMTP.Port,
		User:     cfg.SMTP.User,
		Password: cfg.SMTP.Password,
		From:     cfg.SMTP.From,
	})

	// Repositories
	emailRepo := repository.NewEmailRepository(db)
	companyRepo := repository.NewCompanyRepository(db)

	// Email worker
	worker := scheduler.NewEmailWorker(emailRepo, companyRepo, q, m)

	// Graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigChan
		log.Println("Worker shutting down...")
		cancel()
	}()

	log.Println("🔄 Email Worker started")
	worker.Start(ctx)
}
