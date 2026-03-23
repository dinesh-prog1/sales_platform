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
	"github.com/aisales/backend/service"
	"github.com/aisales/backend/utils"
)

func main() {
	if err := utils.LoadDotEnv(".env"); err != nil {
		log.Printf("No .env file loaded: %v", err)
	}

	cfg, err := helper.LoadConfig()
	if err != nil {
		log.Fatalf("Load config: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	db, err := helper.NewDatabase(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Connect database: %v", err)
	}
	defer db.Close()

	if err := helper.ApplyMigrations(ctx, db); err != nil {
		log.Fatalf("Apply migrations: %v", err)
	}

	q, err := helper.NewQueue(cfg.RedisURL, cfg.Environment)
	if err != nil {
		log.Fatalf("Init queue: %v", err)
	}
	defer q.Close()

	m := utils.NewMailer(utils.MailerConfig{
		Host:     cfg.SMTP.Host,
		Port:     cfg.SMTP.Port,
		User:     cfg.SMTP.User,
		Password: cfg.SMTP.Password,
		From:     cfg.SMTP.From,
	})

	companyRepo := repository.NewCompanyRepository(db)
	emailRepo := repository.NewEmailRepository(db)
	demoRepo := repository.NewDemoRepository(db)
	trialRepo := repository.NewTrialRepository(db)

	companySvc := service.NewCompanyService(companyRepo)
	emailSvc := service.NewEmailService(emailRepo, q, companyRepo, m, cfg)
	demoSvc := service.NewDemoService(demoRepo, companyRepo)
	demoSvc.SetEmailSender(emailSvc)
	demoSvc.SetAppBaseURL(cfg.AppBaseURL)
	trialSvc := service.NewTrialService(trialRepo)

	sched := scheduler.NewEmailScheduler(db, companySvc, emailSvc, trialSvc, demoSvc)

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigChan
		log.Println("Scheduler shutting down...")
		cancel()
	}()

	log.Println("⏰ Email Scheduler started")
	sched.Start(ctx)
}
