package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/aisales/backend/controller"
	"github.com/aisales/backend/helper"
	"github.com/aisales/backend/repository"
	"github.com/aisales/backend/routers"
	"github.com/aisales/backend/scheduler"
	"github.com/aisales/backend/service"
	"github.com/aisales/backend/utils"
)

func main() {
	// Load .env if present
	if err := utils.LoadDotEnv(".env"); err != nil {
		log.Printf("No .env file loaded: %v", err)
	}

	// Load config
	cfg, err := helper.LoadConfig()
	if err != nil {
		log.Fatalf("Load config: %v", err)
	}

	// Root context
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

	// Queue (Redis with in-memory fallback for development)
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
	companyRepo := repository.NewCompanyRepository(db)
	emailRepo := repository.NewEmailRepository(db)
	demoRepo := repository.NewDemoRepository(db)
	trialRepo := repository.NewTrialRepository(db)

	// Services
	companySvc := service.NewCompanyService(companyRepo)
	emailSvc := service.NewEmailService(emailRepo, q, companyRepo, m, cfg.AppBaseURL)
	demoSvc := service.NewDemoService(demoRepo, companyRepo)
	demoSvc.SetEmailSender(emailSvc)
	demoSvc.SetAppBaseURL(cfg.AppBaseURL)
	trialSvc := service.NewTrialService(trialRepo)
	interestSvc := service.NewInterestService(db, companyRepo)
	analyticsSvc := service.NewAnalyticsService(db)
	subscriptionRepo := repository.NewSubscriptionRepository(db)
	subscriptionSvc := service.NewSubscriptionService(subscriptionRepo, trialRepo, companyRepo)

	// Controllers
	authCtrl := controller.NewAuthController(cfg)
	companyCtrl := controller.NewCompanyController(companySvc)
	emailCtrl := controller.NewEmailController(emailSvc)
	demoCtrl := controller.NewDemoController(demoSvc)
	trialCtrl := controller.NewTrialController(trialSvc)
	interestCtrl := controller.NewInterestController(interestSvc)
	analyticsCtrl := controller.NewAnalyticsController(analyticsSvc)
	subscriptionCtrl := controller.NewSubscriptionController(subscriptionSvc)

	// Router
	httpHandler := routers.Build(authCtrl, companyCtrl, emailCtrl, demoCtrl, trialCtrl, interestCtrl, analyticsCtrl, subscriptionCtrl, cfg)

	// Scheduler
	sched := scheduler.NewEmailScheduler(companySvc, emailSvc, trialSvc, demoSvc)
	go sched.Start(ctx)

	// Email worker (in same process for simplicity; production uses cmd/worker)
	worker := scheduler.NewEmailWorker(emailRepo, companyRepo, q, m)
	go worker.Start(ctx)

	// HTTP server
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Port),
		Handler:      httpHandler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigChan
		log.Println("Shutting down server...")
		cancel()

		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer shutdownCancel()
		if err := srv.Shutdown(shutdownCtx); err != nil {
			log.Printf("Server shutdown error: %v", err)
		}
	}()

	log.Printf("🚀 AI Sales API running on port %s (env: %s)", cfg.Port, cfg.Environment)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server error: %v", err)
	}
}
