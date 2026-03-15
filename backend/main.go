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
	if err := utils.LoadDotEnv(".env"); err != nil {
		log.Printf("No .env file loaded: %v", err)
	}

	cfg, err := helper.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Database
	db, err := helper.NewDatabase(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()
	log.Println("✓ Database connected")

	if err := helper.ApplyMigrations(ctx, db); err != nil {
		log.Fatalf("Failed to apply migrations: %v", err)
	}
	log.Println("✓ Database migrations applied")

	// Queue
	q, err := helper.NewQueue(cfg.RedisURL, cfg.Environment)
	if err != nil {
		log.Fatalf("Failed to initialize queue: %v", err)
	}
	defer q.Close()
	log.Println("✓ Queue connected")

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

	// Google Calendar integration (optional)
	if cfg.GoogleCal.ServiceAccountJSON != "" && cfg.GoogleCal.CalendarID != "" {
		gcal, gcErr := utils.NewGoogleCalendarService(ctx, cfg.GoogleCal.ServiceAccountJSON, cfg.GoogleCal.CalendarID)
		if gcErr != nil {
			log.Printf("⚠  Google Calendar init failed (using fallback Meet links): %v", gcErr)
		} else {
			demoSvc.SetGoogleCalendar(gcal)
			log.Println("✓ Google Calendar connected — real Meet links enabled")
		}
	} else {
		log.Println("ℹ  Google Calendar not configured (set GOOGLE_SERVICE_ACCOUNT_JSON + GOOGLE_CALENDAR_ID for real Meet links)")
	}

	trialSvc := service.NewTrialService(trialRepo)
	interestSvc := service.NewInterestService(db, companyRepo)
	analyticsSvc := service.NewAnalyticsService(db)

	// Email worker (background)
	worker := scheduler.NewEmailWorker(emailRepo, companyRepo, q, m)
	go worker.Start(ctx)

	// Pipeline scheduler
	sched := scheduler.NewEmailScheduler(companySvc, emailSvc, trialSvc)
	go sched.Start(ctx)

	// Controllers
	companyCtrl := controller.NewCompanyController(companySvc)
	emailCtrl := controller.NewEmailController(emailSvc)
	demoCtrl := controller.NewDemoController(demoSvc)
	trialCtrl := controller.NewTrialController(trialSvc)
	interestCtrl := controller.NewInterestController(interestSvc)
	analyticsCtrl := controller.NewAnalyticsController(analyticsSvc)

	// Router
	handler := routers.Build(companyCtrl, emailCtrl, demoCtrl, trialCtrl, interestCtrl, analyticsCtrl)

	server := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Port),
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan
		log.Println("Shutting down server...")
		cancel()
		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer shutdownCancel()
		server.Shutdown(shutdownCtx)
	}()

	log.Printf("🚀 AI Sales Platform API running on port %s (env: %s)", cfg.Port, cfg.Environment)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server failed: %v", err)
	}
}
