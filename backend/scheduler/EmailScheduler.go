package scheduler

import (
	"context"
	"log"
	"time"

	"github.com/aisales/backend/models"
	"github.com/aisales/backend/service"
)

// EmailScheduler runs periodic outreach batches, trial reminders, and demo auto-completion.
type EmailScheduler struct {
	companySvc *service.CompanyService
	emailSvc   *service.EmailService
	trialSvc   *service.TrialService
	demoSvc    *service.DemoService
}

func NewEmailScheduler(
	companySvc *service.CompanyService,
	emailSvc *service.EmailService,
	trialSvc *service.TrialService,
	demoSvc *service.DemoService,
) *EmailScheduler {
	return &EmailScheduler{
		companySvc: companySvc,
		emailSvc:   emailSvc,
		trialSvc:   trialSvc,
		demoSvc:    demoSvc,
	}
}

// Start launches all background scheduler goroutines. Blocks until ctx is cancelled.
func (s *EmailScheduler) Start(ctx context.Context) {
	go s.runOutreachBatchLoop(ctx)
	go s.runTrialReminderLoop(ctx)
	go s.runTrialExpiryLoop(ctx)
	go s.runDemoCompletionLoop(ctx)

	log.Println("[EmailScheduler] Started")
	<-ctx.Done()
	log.Println("[EmailScheduler] Shutting down")
}

// runOutreachBatchLoop fires once per day at the configured CronHour (local time).
// Polls every minute so it never drifts past the window.
func (s *EmailScheduler) runOutreachBatchLoop(ctx context.Context) {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	var lastRunDate string // "2006-01-02" — prevents double-firing within the same day

	for {
		select {
		case <-ctx.Done():
			return
		case t := <-ticker.C:
			cfg, err := s.emailSvc.GetConfig(ctx)
			if err != nil {
				log.Printf("[EmailScheduler] Failed to get config: %v", err)
				continue
			}
			if !cfg.IsActive {
				continue
			}

			today := t.Format("2006-01-02")
			if lastRunDate == today {
				continue // already ran today
			}
			if t.Hour() != cfg.CronHour {
				continue // not the configured send hour yet
			}

			log.Printf("[EmailScheduler] Daily outreach batch starting (CronHour=%02d:00)", cfg.CronHour)
			s.runOutreachBatch(ctx)
			lastRunDate = today
		}
	}
}

func (s *EmailScheduler) runOutreachBatch(ctx context.Context) {
	cfg, err := s.emailSvc.GetConfig(ctx)
	if err != nil {
		log.Printf("[EmailScheduler] Failed to get config: %v", err)
		return
	}
	if !cfg.IsActive {
		return
	}

	// ── Phase 1: Send today's pre-queued entries ─────────────────────────────
	// These were pre-created by yesterday's run and show as "~24h ETA" in the log.
	sent, err := s.emailSvc.GetAndSendPreQueued(ctx)
	if err != nil {
		log.Printf("[EmailScheduler] Pre-queued send error: %v", err)
	}

	// ── Phase 2: First-run fallback ──────────────────────────────────────────
	// No pre-queued entries means this is the first ever run (or system was reset).
	// Pick the current quota and send immediately so day-1 isn't skipped.
	if sent == 0 {
		companies, err := s.companySvc.GetCompaniesForOutreachByQuota(ctx, cfg)
		if err != nil {
			log.Printf("[EmailScheduler] Failed to get companies for outreach: %v", err)
			return
		}
		if len(companies) == 0 {
			log.Printf("[EmailScheduler] No eligible companies for outreach today")
		} else {
			infos := toCompanyInfos(companies)
			sent = s.emailSvc.SendBatchDirect(ctx, infos, cfg)
			log.Printf("[EmailScheduler] First-run direct batch: %d/%d sent", sent, len(companies))
		}
	} else {
		log.Printf("[EmailScheduler] Sent %d pre-queued outreach emails", sent)
	}

	// ── Phase 3: Pre-queue tomorrow's batch ──────────────────────────────────
	// Pick the next quota of still-eligible companies and create 'queued' log
	// entries with scheduled_at = tomorrow at CronHour. These appear in the
	// campaign log immediately with a ~24 h ETA countdown.
	nextCompanies, err := s.companySvc.GetCompaniesForOutreachByQuota(ctx, cfg)
	if err != nil {
		log.Printf("[EmailScheduler] Failed to get next batch for pre-queue: %v", err)
		return
	}
	if len(nextCompanies) == 0 {
		log.Printf("[EmailScheduler] No more eligible companies to pre-queue — outreach complete")
		return
	}
	preQueued, err := s.emailSvc.PreQueueNextBatch(ctx, toCompanyInfos(nextCompanies), cfg.CronHour)
	if err != nil {
		log.Printf("[EmailScheduler] Pre-queue error: %v", err)
		return
	}
	log.Printf("[EmailScheduler] Pre-queued %d emails for tomorrow %02d:00 (small=%d medium=%d large=%d)",
		preQueued, cfg.CronHour, cfg.SmallQuota, cfg.MediumQuota, cfg.LargeQuota)
}

func toCompanyInfos(companies []*models.Company) []models.CompanyInfo {
	infos := make([]models.CompanyInfo, 0, len(companies))
	for _, c := range companies {
		infos = append(infos, models.CompanyInfo{
			ID:            c.ID,
			Name:          c.Name,
			Email:         c.Email,
			ContactPerson: c.ContactPerson,
			Industry:      c.Industry,
			Size:          string(c.Size),
		})
	}
	return infos
}

// runTrialReminderLoop checks for expiring trials every 6 hours.
// Runs once at startup (after 60s delay) so newly-expiring trials are caught immediately.
func (s *EmailScheduler) runTrialReminderLoop(ctx context.Context) {
	// Run once at startup after brief delay
	select {
	case <-ctx.Done():
		return
	case <-time.After(60 * time.Second):
	}
	s.sendTrialReminders(ctx)

	ticker := time.NewTicker(6 * time.Hour)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.sendTrialReminders(ctx)
		}
	}
}

func (s *EmailScheduler) sendTrialReminders(ctx context.Context) {
	trials, err := s.trialSvc.GetExpiringTrials(ctx)
	if err != nil {
		log.Printf("[EmailScheduler] Failed to get expiring trials: %v", err)
		return
	}

	for _, t := range trials {
		if t.CompanyEmail == "" {
			continue
		}
		// Send trial_conversion email (with plan selection / interested link)
		err := s.emailSvc.QueueEmailForCompany(ctx, models.CompanyInfo{
			ID:            t.CompanyID,
			Name:          t.CompanyName,
			Email:         t.CompanyEmail,
			ContactPerson: t.BookerName,
			TrialID:       t.ID,
		}, models.EmailTypeTrialConversion)
		if err != nil {
			log.Printf("[EmailScheduler] Failed to send trial conversion email for %s: %v", t.ID, err)
			continue
		}
		_ = s.trialSvc.MarkReminderSent(ctx, t.ID)
	}

	if len(trials) > 0 {
		log.Printf("[EmailScheduler] Sent trial conversion emails for %d trials", len(trials))
	}
}

// runTrialExpiryLoop marks expired trials every hour.
// Runs once at startup (after 90s delay) so overdue trials are caught immediately.
func (s *EmailScheduler) runTrialExpiryLoop(ctx context.Context) {
	// Run once at startup after brief delay
	select {
	case <-ctx.Done():
		return
	case <-time.After(90 * time.Second):
	}
	s.expireTrials(ctx)

	ticker := time.NewTicker(time.Hour)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.expireTrials(ctx)
		}
	}
}

func (s *EmailScheduler) expireTrials(ctx context.Context) {
	trials, err := s.trialSvc.GetExpiredTrials(ctx)
	if err != nil {
		log.Printf("[EmailScheduler] Failed to get expired trials: %v", err)
		return
	}

	for _, t := range trials {
		if err := s.trialSvc.UpdateTrial(ctx, t.ID, models.TrialUpdateRequest{
			Status: models.TrialStatusExpired,
		}); err != nil {
			log.Printf("[EmailScheduler] Failed to expire trial %s: %v", t.ID, err)
		}
	}

	if len(trials) > 0 {
		log.Printf("[EmailScheduler] Expired %d trials", len(trials))
	}
}

// runDemoCompletionLoop auto-marks confirmed demos as completed once their
// scheduled_at time has passed. Runs every 30 minutes.
func (s *EmailScheduler) runDemoCompletionLoop(ctx context.Context) {
	// Run once at startup after a brief delay
	select {
	case <-ctx.Done():
		return
	case <-time.After(30 * time.Second):
	}
	s.completePastDemos(ctx)

	ticker := time.NewTicker(30 * time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.completePastDemos(ctx)
		}
	}
}

func (s *EmailScheduler) completePastDemos(ctx context.Context) {
	if s.demoSvc == nil {
		return
	}
	count, err := s.demoSvc.AutoCompletePassedDemos(ctx)
	if err != nil {
		log.Printf("[EmailScheduler] Auto-complete past demos error: %v", err)
		return
	}
	if count > 0 {
		log.Printf("[EmailScheduler] Auto-completed %d past demos", count)
	}
}
