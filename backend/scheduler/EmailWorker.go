package scheduler

import (
	"context"
	"log"
	"time"

	"github.com/aisales/backend/helper"
	"github.com/aisales/backend/models"
	"github.com/aisales/backend/repository"
	"github.com/aisales/backend/utils"
)

// EmailWorker processes queued email jobs, retries failures, and promotes delayed emails.
type EmailWorker struct {
	emailRepo   *repository.EmailRepository
	companyRepo *repository.CompanyRepository
	queue       helper.Queue
	mailer      *utils.Mailer
}

func NewEmailWorker(
	emailRepo *repository.EmailRepository,
	companyRepo *repository.CompanyRepository,
	q helper.Queue,
	m *utils.Mailer,
) *EmailWorker {
	return &EmailWorker{
		emailRepo:   emailRepo,
		companyRepo: companyRepo,
		queue:       q,
		mailer:      m,
	}
}

// Start begins processing all email queues concurrently. Blocks until ctx is cancelled.
func (w *EmailWorker) Start(ctx context.Context) {
	queues := []string{
		models.QueueEmailOutreach,
		models.QueueEmailDemoInvite,
		models.QueueEmailDemoConfirm,
		models.QueueEmailPostDemo,
		models.QueueEmailTrialRemind,
		models.QueueEmailTrialConversion,
		models.QueueEmailFeedback,
	}

	for _, q := range queues {
		go w.processQueue(ctx, q)
	}

	go w.retryFailed(ctx)
	go w.processDelayed(ctx)
	go w.rescueStuckEmails(ctx)

	log.Println("[EmailWorker] Started processing all email queues")
	<-ctx.Done()
	log.Println("[EmailWorker] Shutting down")
}

func (w *EmailWorker) processQueue(ctx context.Context, queueName string) {
	log.Printf("[EmailWorker] Listening on queue: %s", queueName)

	for {
		select {
		case <-ctx.Done():
			return
		default:
			job, err := w.queue.Dequeue(ctx, queueName, 5*time.Second)
			if err != nil {
				if ctx.Err() != nil {
					return
				}
				log.Printf("[EmailWorker] Dequeue error on %s: %v", queueName, err)
				time.Sleep(time.Second)
				continue
			}
			if job == nil {
				continue
			}
			w.processJob(ctx, *job)
		}
	}
}

func (w *EmailWorker) processJob(ctx context.Context, job models.EmailJob) {
	log.Printf("[EmailWorker] Processing job %s type=%s to=%s", job.EmailLogID, job.Type, job.ToEmail)

	// Guard: skip if this log entry was already sent (e.g. direct-send path ran first,
	// or a stale queue job from a previous run is being replayed).
	// On a transient DB error we proceed with the send — dropping the job silently is
	// worse than an occasional duplicate delivery.
	if job.EmailLogID != "" {
		status, err := w.emailRepo.GetLogStatus(ctx, job.EmailLogID)
		if err != nil {
			log.Printf("[EmailWorker] Could not check log status for %s: %v — proceeding with send", job.EmailLogID, err)
		} else if status == models.EmailStatusSent {
			log.Printf("[EmailWorker] Job %s already sent — skipping duplicate", job.EmailLogID)
			return
		}
	}

	err := w.mailer.Send(utils.EmailMessage{
		To:      job.ToEmail,
		Subject: job.Subject,
		Body:    job.Body,
		HTML:    true,
	})

	// Use a background context so DB writes survive even if the app context
	// is cancelled during a graceful shutdown race.
	bgCtx := context.Background()

	if err != nil {
		log.Printf("[EmailWorker] Failed to send email %s: %v", job.EmailLogID, err)
		if dbErr := w.emailRepo.UpdateLogStatus(bgCtx, job.EmailLogID, models.EmailStatusFailed, err.Error()); dbErr != nil {
			log.Printf("[EmailWorker] Failed to update log status for %s: %v", job.EmailLogID, dbErr)
		}
		return
	}

	log.Printf("[EmailWorker] Email sent successfully: %s", job.EmailLogID)
	if dbErr := w.emailRepo.UpdateLogStatus(bgCtx, job.EmailLogID, models.EmailStatusSent, ""); dbErr != nil {
		log.Printf("[EmailWorker] Failed to update log status for %s: %v", job.EmailLogID, dbErr)
	}
	w.updateCompanyStatus(bgCtx, job)
}

func (w *EmailWorker) updateCompanyStatus(ctx context.Context, job models.EmailJob) {
	if w.companyRepo == nil || job.CompanyID == "" {
		return
	}

	switch models.EmailType(job.Type) {
	case models.EmailTypeOutreach:
		_ = w.companyRepo.UpdateStatus(ctx, job.CompanyID, models.CompanyStatusOutreachSent, "Outreach email sent")
	case models.EmailTypeDemoInvite:
		_ = w.companyRepo.UpdateStatus(ctx, job.CompanyID, models.CompanyStatusDemoInvited, "Demo invite sent")
	}
}

func (w *EmailWorker) retryFailed(ctx context.Context) {
	ticker := time.NewTicker(10 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			w.doRetry(ctx)
		}
	}
}

func (w *EmailWorker) doRetry(ctx context.Context) {
	logs, err := w.emailRepo.GetPendingForRetry(ctx)
	if err != nil {
		log.Printf("[EmailWorker] Failed to get retry queue: %v", err)
		return
	}

	log.Printf("[EmailWorker] Retrying %d failed emails", len(logs))

	for _, el := range logs {
		job := models.EmailJob{
			CompanyID:   el.CompanyID,
			EmailLogID:  el.ID,
			Type:        string(el.Type),
			ToEmail:     el.ToEmail,
			Subject:     el.Subject,
			Body:        el.Body,
			RetryCount:  el.RetryCount,
			ScheduledAt: time.Now(),
		}

		queueName := models.TypeToQueue(el.Type)
		if err := w.queue.Enqueue(ctx, queueName, job); err != nil {
			log.Printf("[EmailWorker] Failed to re-enqueue %s: %v", el.ID, err)
		}
	}
}

// rescueStuckEmails scans the DB every 5 minutes for emails that are still 'queued'
// after 5 minutes (queue job was lost due to restart/crash) and sends them directly.
func (w *EmailWorker) rescueStuckEmails(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	// Run once at startup after a brief delay to let the normal queue drain first
	select {
	case <-ctx.Done():
		return
	case <-time.After(5 * time.Minute):
	}

	for {
		w.doRescue(ctx)
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

func (w *EmailWorker) doRescue(ctx context.Context) {
	logs, err := w.emailRepo.GetStuckQueuedEmails(ctx, 5*time.Minute)
	if err != nil {
		log.Printf("[EmailWorker] Rescue scan error: %v", err)
		return
	}
	if len(logs) == 0 {
		return
	}
	log.Printf("[EmailWorker] Rescuing %d stuck queued emails", len(logs))

	// Always use a background context for DB writes so they are not cancelled
	// by app shutdown racing with the rescue goroutine.
	bgCtx := context.Background()

	for _, el := range logs {
		// Atomically claim the email before processing to prevent the queue
		// worker from also sending it (race condition guard).
		// ClaimStuckEmail also sets retry_count = max_retries so the retryFailed
		// goroutine will NEVER re-queue this email after rescue.
		claimed, claimErr := w.emailRepo.ClaimStuckEmail(bgCtx, el.ID)
		if claimErr != nil {
			log.Printf("[EmailWorker] Claim error for %s: %v", el.ID, claimErr)
			continue
		}
		if !claimed {
			// Another goroutine already processed/claimed it
			continue
		}

		sendErr := w.mailer.Send(utils.EmailMessage{
			To:      el.ToEmail,
			Subject: el.Subject,
			Body:    el.Body,
			HTML:    true,
		})
		if sendErr != nil {
			log.Printf("[EmailWorker] Rescue send failed for %s: %v", el.ID, sendErr)
			if dbErr := w.emailRepo.UpdateLogStatus(bgCtx, el.ID, models.EmailStatusFailed, sendErr.Error()); dbErr != nil {
				log.Printf("[EmailWorker] Failed to update rescued email status for %s: %v", el.ID, dbErr)
			}
		} else {
			log.Printf("[EmailWorker] Rescued email sent: %s", el.ID)
			if dbErr := w.emailRepo.UpdateLogStatus(bgCtx, el.ID, models.EmailStatusSent, ""); dbErr != nil {
				log.Printf("[EmailWorker] Failed to update rescued email status for %s: %v", el.ID, dbErr)
			}
			w.updateCompanyStatus(bgCtx, models.EmailJob{
				CompanyID: el.CompanyID,
				Type:      string(el.Type),
			})
		}
	}
}

func (w *EmailWorker) processDelayed(ctx context.Context) {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	queues := []string{
		models.QueueEmailOutreach,
		models.QueueEmailDemoInvite,
		models.QueueEmailDemoConfirm,
		models.QueueEmailPostDemo,
		models.QueueEmailTrialRemind,
		models.QueueEmailFeedback,
	}

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			for _, q := range queues {
				count, err := w.queue.ProcessDelayed(ctx, q)
				if err != nil {
					log.Printf("[EmailWorker] Process delayed error: %v", err)
					continue
				}
				if count > 0 {
					log.Printf("[EmailWorker] Moved %d delayed emails to %s", count, q)
				}
			}
		}
	}
}
