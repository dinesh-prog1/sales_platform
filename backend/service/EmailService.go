package service

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/aisales/backend/helper"
	"github.com/aisales/backend/models"
	"github.com/aisales/backend/repository"
	"github.com/aisales/backend/utils"
)

type EmailService struct {
	repo        *repository.EmailRepository
	queue       helper.Queue
	companyRepo *repository.CompanyRepository
	mailer      *utils.Mailer
	appBaseURL  string
}

func NewEmailService(repo *repository.EmailRepository, q helper.Queue, companyRepo *repository.CompanyRepository, mailer *utils.Mailer, appBaseURL string) *EmailService {
	return &EmailService{
		repo:        repo,
		queue:       q,
		companyRepo: companyRepo,
		mailer:      mailer,
		appBaseURL:  strings.TrimRight(appBaseURL, "/"),
	}
}

// ─── New direct-send batch flow ───────────────────────────────────────────────
//
// The scheduler now works in two phases each day:
//   1. GetAndSendPreQueued   – sends outreach entries that were pre-scheduled for today
//   2. PreQueueNextBatch     – picks the NEXT quota of eligible companies and creates
//                              'queued' log entries with scheduled_at = tomorrow at cronHour
//
// On the very first ever run there are no pre-queued entries, so the scheduler falls back
// to SendBatchDirect which renders + sends the first batch immediately.
//
// Result in the campaign log:
//   • Sent emails  → status = 'sent'   (timestamp visible)
//   • Tomorrow's   → status = 'queued' (ETA ≈ 24 h from scheduled_at)

// GetAndSendPreQueued processes outreach log entries that were pre-scheduled for the
// current run (scheduled_at <= NOW, status='queued'). Sends each directly via SMTP and
// updates the log to 'sent' or 'failed'. Returns the number of emails sent.
func (s *EmailService) GetAndSendPreQueued(ctx context.Context) (int, error) {
	logs, err := s.repo.GetPreQueuedOutreach(ctx)
	if err != nil {
		return 0, err
	}

	sent := 0
	bgCtx := context.Background()
	for _, el := range logs {
		sendErr := s.mailer.Send(utils.EmailMessage{
			To:      el.ToEmail,
			Subject: el.Subject,
			Body:    el.Body,
			HTML:    true,
		})
		if sendErr != nil {
			log.Printf("[EmailService] Pre-queued send failed for %s: %v", el.ToEmail, sendErr)
			_ = s.repo.UpdateLogStatus(bgCtx, el.ID, models.EmailStatusFailed, sendErr.Error())
			continue
		}
		_ = s.repo.UpdateLogStatus(bgCtx, el.ID, models.EmailStatusSent, "")
		if el.CompanyID != "" {
			_ = s.companyRepo.UpdateStatus(bgCtx, el.CompanyID, models.CompanyStatusOutreachSent, "Outreach sent via scheduled batch")
		}
		sent++
	}
	return sent, nil
}

// SendBatchDirect sends emails to the given companies immediately via SMTP (no queue).
// Used as a fallback on the very first scheduler run when no pre-queued entries exist.
// Log entries are created with the final 'sent'/'failed' status — never 'queued'.
func (s *EmailService) SendBatchDirect(ctx context.Context, companies []models.CompanyInfo, cfg *models.EmailConfig) int {
	cfg.AppBaseURL = s.appBaseURL

	template, err := s.repo.GetTemplate(ctx, models.EmailTypeOutreach)
	if err != nil || template == nil {
		log.Printf("[EmailService] Outreach template not found for direct batch")
		return 0
	}

	sent := 0
	bgCtx := context.Background()
	for _, company := range companies {
		// Skip companies that already have any outreach log entry
		already, _ := s.repo.HasEmailBeenQueuedOrSent(ctx, company.ID, models.EmailTypeOutreach)
		if already {
			continue
		}

		subject := renderEmailTemplate(template.Subject, company, cfg)
		body := renderEmailTemplate(template.Body, company, cfg)

		sendErr := s.mailer.Send(utils.EmailMessage{
			To:      company.Email,
			Subject: subject,
			Body:    body,
			HTML:    true,
		})

		finalStatus := models.EmailStatusSent
		errMsg := ""
		if sendErr != nil {
			finalStatus = models.EmailStatusFailed
			errMsg = sendErr.Error()
			log.Printf("[EmailService] Direct batch send failed for %s: %v", company.Email, sendErr)
		}

		logEntry := &models.EmailLog{
			CompanyID:   company.ID,
			Type:        models.EmailTypeOutreach,
			Status:      finalStatus,
			Subject:     subject,
			Body:        body,
			ToEmail:     company.Email,
			ScheduledAt: time.Now(),
		}
		if createErr := s.repo.CreateLog(bgCtx, logEntry); createErr != nil {
			log.Printf("[EmailService] Failed to write batch log for %s: %v", company.Email, createErr)
		}
		if logEntry.ID != "" {
			_ = s.repo.UpdateLogStatus(bgCtx, logEntry.ID, finalStatus, errMsg)
		}
		if sendErr == nil {
			if company.ID != "" {
				_ = s.companyRepo.UpdateStatus(bgCtx, company.ID, models.CompanyStatusOutreachSent, "Outreach sent via scheduled batch")
			}
			sent++
		}
	}
	return sent
}

// PreQueueNextBatch picks the next quota of eligible companies and creates 'queued'
// outreach log entries with scheduled_at = tomorrow at cronHour. These entries appear
// in the campaign log with a ~24 h ETA countdown and are sent on the next daily run.
func (s *EmailService) PreQueueNextBatch(ctx context.Context, companies []models.CompanyInfo, cronHour int) (int, error) {
	template, err := s.repo.GetTemplate(ctx, models.EmailTypeOutreach)
	if err != nil || template == nil {
		return 0, fmt.Errorf("outreach template not found")
	}

	cfg, err := s.repo.GetConfig(ctx)
	if err != nil {
		return 0, err
	}
	cfg.AppBaseURL = s.appBaseURL

	// Schedule for tomorrow at cronHour (local server time)
	now := time.Now()
	tomorrow := time.Date(now.Year(), now.Month(), now.Day()+1, cronHour, 0, 0, 0, now.Location())

	preQueued := 0
	for _, company := range companies {
		// Skip if any outreach log already exists (sent today, or pre-queued earlier)
		already, _ := s.repo.HasEmailBeenQueuedOrSent(ctx, company.ID, models.EmailTypeOutreach)
		if already {
			continue
		}

		subject := renderEmailTemplate(template.Subject, company, cfg)
		body := renderEmailTemplate(template.Body, company, cfg)

		logEntry := &models.EmailLog{
			CompanyID:   company.ID,
			Type:        models.EmailTypeOutreach,
			Status:      models.EmailStatusQueued,
			Subject:     subject,
			Body:        body,
			ToEmail:     company.Email,
			ScheduledAt: tomorrow,
		}
		if err := s.repo.CreateLog(ctx, logEntry); err != nil {
			log.Printf("[EmailService] Failed to pre-queue outreach for %s: %v", company.Email, err)
			continue
		}
		preQueued++
	}
	return preQueued, nil
}

// ─── Legacy queue-based outreach (used by Redis worker path) ──────────────────

func (s *EmailService) QueueOutreachEmails(ctx context.Context, companies []models.CompanyInfo) (int, error) {
	cfg, err := s.repo.GetConfig(ctx)
	if err != nil {
		return 0, fmt.Errorf("get config: %w", err)
	}

	sentToday, err := s.repo.CountSentToday(ctx)
	if err != nil {
		return 0, fmt.Errorf("count sent today: %w", err)
	}

	remaining := int64(cfg.EmailsPerDay) - sentToday
	if remaining <= 0 {
		return 0, nil
	}

	template, err := s.repo.GetTemplate(ctx, models.EmailTypeOutreach)
	if err != nil || template == nil {
		return 0, fmt.Errorf("get outreach template: %w", err)
	}

	queued := 0
	for _, c := range companies {
		if int64(queued) >= remaining {
			break
		}

		already, err := s.repo.HasEmailBeenQueuedOrSent(ctx, c.ID, models.EmailTypeOutreach)
		if err != nil || already {
			continue
		}

		subject := renderEmailTemplate(template.Subject, c, cfg)
		body := renderEmailTemplate(template.Body, c, cfg)

		entry := &models.EmailLog{
			CompanyID:   c.ID,
			Type:        models.EmailTypeOutreach,
			Status:      models.EmailStatusQueued,
			Subject:     subject,
			Body:        body,
			ToEmail:     c.Email,
			ScheduledAt: time.Now(),
		}

		if err := s.repo.CreateLog(ctx, entry); err != nil {
			continue
		}

		job := models.EmailJob{
			CompanyID:   c.ID,
			EmailLogID:  entry.ID,
			Type:        string(models.EmailTypeOutreach),
			ToEmail:     c.Email,
			Subject:     subject,
			Body:        body,
			ScheduledAt: time.Now(),
		}

		if err := s.queue.Enqueue(ctx, models.QueueEmailOutreach, job); err != nil {
			continue
		}
		queued++
	}
	return queued, nil
}

// QueueEmailForCompany sends an individual triggered email directly via SMTP
// (no queue, no scheduler). The log entry is created AFTER the send attempt
// so the status is always the final outcome ('sent' or 'failed') — never 'queued'.
func (s *EmailService) QueueEmailForCompany(ctx context.Context, company models.CompanyInfo, emailType models.EmailType) error {
	already, err := s.repo.HasEmailBeenQueuedOrSent(ctx, company.ID, emailType)
	if err != nil {
		return err
	}
	if already {
		return nil
	}

	cfg, err := s.repo.GetConfig(ctx)
	if err != nil {
		return err
	}
	cfg.AppBaseURL = s.appBaseURL

	template, err := s.repo.GetTemplate(ctx, emailType)
	if err != nil || template == nil {
		return fmt.Errorf("template not found for type: %s", emailType)
	}

	subject := renderEmailTemplate(template.Subject, company, cfg)
	body := renderEmailTemplate(template.Body, company, cfg)

	// Send first — determine outcome before writing any log entry.
	sendErr := s.mailer.Send(utils.EmailMessage{
		To:      company.Email,
		Subject: subject,
		Body:    body,
		HTML:    true,
	})

	bgCtx := context.Background()
	finalStatus := models.EmailStatusSent
	errMsg := ""
	if sendErr != nil {
		finalStatus = models.EmailStatusFailed
		errMsg = sendErr.Error()
	}

	// Write the log entry directly with the final status — never 'queued'.
	logEntry := &models.EmailLog{
		CompanyID:   company.ID,
		Type:        emailType,
		Status:      finalStatus,
		Subject:     subject,
		Body:        body,
		ToEmail:     company.Email,
		ScheduledAt: time.Now(),
	}
	if createErr := s.repo.CreateLog(bgCtx, logEntry); createErr != nil {
		log.Printf("[EmailService] Failed to write %s log for %s: %v", emailType, company.Email, createErr)
	}
	if logEntry.ID != "" {
		_ = s.repo.UpdateLogStatus(bgCtx, logEntry.ID, finalStatus, errMsg)
	}

	if sendErr != nil {
		return fmt.Errorf("send email: %w", sendErr)
	}
	return nil
}

func (s *EmailService) GetStats(ctx context.Context) (*models.EmailStats, error) {
	return s.repo.GetStats(ctx)
}

func (s *EmailService) ListEmails(ctx context.Context, f models.EmailListFilter) (*models.EmailListResponse, error) {
	return s.repo.List(ctx, f)
}

func (s *EmailService) GetAllTemplates(ctx context.Context) ([]*models.EmailTemplate, error) {
	return s.repo.GetAllTemplates(ctx)
}

func (s *EmailService) UpdateTemplate(ctx context.Context, emailType models.EmailType, req models.UpdateEmailTemplateRequest) error {
	return s.repo.UpdateTemplate(ctx, emailType, req)
}

func (s *EmailService) GetConfig(ctx context.Context) (*models.EmailConfig, error) {
	return s.repo.GetConfig(ctx)
}

func (s *EmailService) UpdateConfig(ctx context.Context, req models.UpdateEmailConfigRequest) error {
	return s.repo.UpdateConfig(ctx, req)
}

func (s *EmailService) ClearAllLogs(ctx context.Context) error {
	return s.repo.ClearAllLogs(ctx)
}

func (s *EmailService) GetDailyTrend(ctx context.Context, days int) ([]map[string]interface{}, error) {
	return s.repo.GetDailyEmailTrend(ctx, days)
}

func (s *EmailService) SendManualOutreach(ctx context.Context, req models.ManualOutreachRequest) error {
	emailAddr := strings.ToLower(strings.TrimSpace(req.Email))
	companyName := strings.TrimSpace(req.CompanyName)
	if companyName == "" {
		return fmt.Errorf("company name is required")
	}
	if emailAddr == "" {
		return fmt.Errorf("email is required")
	}
	if !strings.Contains(emailAddr, "@") || !strings.Contains(emailAddr, ".") {
		return fmt.Errorf("valid email is required")
	}

	size := normalizeEmailCompanySize(req.CompanySize)

	existing, err := s.companyRepo.GetByEmail(ctx, emailAddr)
	if err != nil {
		return fmt.Errorf("get company by email: %w", err)
	}

	companyInfo := models.CompanyInfo{
		Name:          companyName,
		Email:         emailAddr,
		ContactPerson: strings.TrimSpace(req.ContactPerson),
		Industry:      strings.TrimSpace(req.Industry),
		Size:          size,
	}

	if existing == nil {
		rawIndustry := strings.TrimSpace(req.Industry)
		dept := utils.NormalizeDepartment(rawIndustry)
		record := &models.Company{
			Name:          companyName,
			Size:          models.CompanySize(size),
			Email:         emailAddr,
			ContactPerson: strings.TrimSpace(req.ContactPerson),
			Industry:      rawIndustry,
			Department:    dept,
			Country:       strings.TrimSpace(req.Country),
			Status:        models.CompanyStatusUploaded,
		}
		if err := s.companyRepo.Create(ctx, record); err != nil {
			return fmt.Errorf("create company: %w", err)
		}
		companyInfo.ID = record.ID
	} else {
		companyInfo.ID = existing.ID
		if companyInfo.Name == "" {
			companyInfo.Name = existing.Name
		}
		if companyInfo.ContactPerson == "" {
			companyInfo.ContactPerson = existing.ContactPerson
		}
		if companyInfo.Industry == "" {
			companyInfo.Industry = existing.Industry
		}
		if companyInfo.Size == "" {
			companyInfo.Size = string(existing.Size)
		}
	}

	return s.sendDirectOutreach(ctx, companyInfo)
}

// sendDirectOutreach sends a manual outreach email immediately via SMTP (bypasses queue).
// The log entry is created AFTER the send attempt, directly with the final status
// ('sent' or 'failed') — it is never recorded as 'queued'.
func (s *EmailService) sendDirectOutreach(ctx context.Context, company models.CompanyInfo) error {
	// Dedup: skip if outreach was already sent for this company
	if company.ID != "" {
		already, err := s.repo.HasEmailBeenQueuedOrSent(ctx, company.ID, models.EmailTypeOutreach)
		if err != nil {
			return fmt.Errorf("check dedup: %w", err)
		}
		if already {
			return nil // silently skip, not an error
		}
	}

	cfg, err := s.repo.GetConfig(ctx)
	if err != nil {
		return fmt.Errorf("get config: %w", err)
	}
	cfg.AppBaseURL = s.appBaseURL

	template, err := s.repo.GetTemplate(ctx, models.EmailTypeOutreach)
	if err != nil || template == nil {
		return fmt.Errorf("outreach template not found")
	}

	subject := renderEmailTemplate(template.Subject, company, cfg)
	body := renderEmailTemplate(template.Body, company, cfg)

	// Send first — no log entry is written until we know the outcome.
	sendErr := s.mailer.Send(utils.EmailMessage{
		To:      company.Email,
		Subject: subject,
		Body:    body,
		HTML:    true,
	})

	// Use a background context for all DB writes so they survive HTTP request cancellation.
	bgCtx := context.Background()

	// Determine final status and create the log entry directly with it — never 'queued'.
	finalStatus := models.EmailStatusSent
	errMsg := ""
	if sendErr != nil {
		finalStatus = models.EmailStatusFailed
		errMsg = sendErr.Error()
	}

	logEntry := &models.EmailLog{
		CompanyID:   company.ID,
		Type:        models.EmailTypeOutreach,
		Status:      finalStatus,
		Subject:     subject,
		Body:        body,
		ToEmail:     company.Email,
		ScheduledAt: time.Now(),
	}
	if createErr := s.repo.CreateLog(bgCtx, logEntry); createErr != nil {
		log.Printf("[EmailService] Failed to write outreach log for %s: %v", company.Email, createErr)
	}

	// Set sent_at / error_message via a single UPDATE using the returned ID.
	if logEntry.ID != "" {
		_ = s.repo.UpdateLogStatus(bgCtx, logEntry.ID, finalStatus, errMsg)
	}

	if sendErr != nil {
		return fmt.Errorf("send email: %w", sendErr)
	}

	// Update company pipeline status
	if company.ID != "" {
		_ = s.companyRepo.UpdateStatus(bgCtx, company.ID, models.CompanyStatusOutreachSent, "Manual outreach sent directly")
	}

	return nil
}

// SendDemoConfirmation sends the demo_confirm email directly via SMTP.
// The log entry is created AFTER the send attempt with the final status
// ('sent' or 'failed') — it is never recorded as 'queued'.
func (s *EmailService) SendDemoConfirmation(ctx context.Context, companyID, toEmail, toName, companyName, meetingLink string, scheduledAt time.Time) error {
	template, err := s.repo.GetTemplate(ctx, models.EmailTypeDemoConfirm)
	if err != nil || template == nil {
		return fmt.Errorf("demo_confirm template not found")
	}
	cfg, err := s.repo.GetConfig(ctx)
	if err != nil {
		return fmt.Errorf("get config: %w", err)
	}
	cInfo := models.CompanyInfo{Name: companyName, Email: toEmail, ContactPerson: toName}
	cfg.AppBaseURL = s.appBaseURL

	subject := renderEmailTemplate(template.Subject, cInfo, cfg)
	body := renderEmailTemplate(template.Body, cInfo, cfg)
	body = strings.ReplaceAll(body, "{{scheduled_at}}", scheduledAt.Format("Monday, January 2, 2006 at 3:04 PM UTC"))
	body = strings.ReplaceAll(body, "{{meeting_link}}", meetingLink)

	// Send first — determine outcome before writing any log entry.
	sendErr := s.mailer.Send(utils.EmailMessage{
		To:      toEmail,
		Subject: subject,
		Body:    body,
		HTML:    true,
	})

	bgCtx := context.Background()
	finalStatus := models.EmailStatusSent
	errMsg := ""
	if sendErr != nil {
		finalStatus = models.EmailStatusFailed
		errMsg = sendErr.Error()
	}

	// Write the log entry directly with the final status — never 'queued'.
	logEntry := &models.EmailLog{
		CompanyID:   companyID,
		Type:        models.EmailTypeDemoConfirm,
		Status:      finalStatus,
		Subject:     subject,
		Body:        body,
		ToEmail:     toEmail,
		ScheduledAt: time.Now(),
	}
	if createErr := s.repo.CreateLog(bgCtx, logEntry); createErr != nil {
		log.Printf("[EmailService] Failed to write demo_confirm log for %s: %v", toEmail, createErr)
	}
	if logEntry.ID != "" {
		_ = s.repo.UpdateLogStatus(bgCtx, logEntry.ID, finalStatus, errMsg)
	}

	if sendErr != nil {
		return fmt.Errorf("send demo confirm: %w", sendErr)
	}
	return nil
}

func (s *EmailService) HandleOutreachResponse(ctx context.Context, req models.OutreachResponseRequest) error {
	c, err := s.companyRepo.GetByID(ctx, req.CompanyID)
	if err != nil {
		return fmt.Errorf("get company: %w", err)
	}
	if c == nil {
		return fmt.Errorf("company not found")
	}

	switch req.Action {
	case "interested":
		if err := s.companyRepo.UpdateStatus(ctx, c.ID, models.CompanyStatusInterested, "Interested via outreach email"); err != nil {
			return err
		}
		return s.QueueEmailForCompany(ctx, models.CompanyInfo{
			ID:            c.ID,
			Name:          c.Name,
			Email:         c.Email,
			ContactPerson: c.ContactPerson,
			Industry:      c.Industry,
			Size:          string(c.Size),
		}, models.EmailTypeDemoInvite)
	case "not_interested":
		return s.companyRepo.UpdateStatus(ctx, c.ID, models.CompanyStatusNotInterested, "Not interested via outreach email")
	default:
		return fmt.Errorf("invalid action")
	}
}

// ResetCompanyOutreach removes all outreach email logs for the given company
// and resets its pipeline status to 'uploaded' so it is eligible for a fresh
// outreach cycle. This is a one-time admin action per company.
func (s *EmailService) ResetCompanyOutreach(ctx context.Context, companyID string) error {
	if companyID == "" {
		return fmt.Errorf("company_id is required")
	}
	return s.repo.ResetCompanyOutreach(ctx, companyID)
}

func renderEmailTemplate(tmpl string, c models.CompanyInfo, cfg *models.EmailConfig) string {
	baseURL := strings.TrimRight(cfg.AppBaseURL, "/")
	r := strings.NewReplacer(
		"{{company_name}}", c.Name,
		"{{contact_person}}", c.ContactPerson,
		"{{industry}}", c.Industry,
		"{{company_size}}", c.Size,
		"{{scheduling_link}}", cfg.SchedulingLink,
		"{{product_link}}", "https://employeegalaxy.com/employee/home/",
		"{{interested_link}}", fmt.Sprintf("%s/interest/respond?company_id=%s&action=interested", baseURL, c.ID),
		"{{not_interested_link}}", fmt.Sprintf("%s/interest/respond?company_id=%s&action=not_interested", baseURL, c.ID),
		"{{schedule_form_link}}", fmt.Sprintf("%s/demo/book", baseURL),
		"{{trial_link}}", "https://app.aisales.io/trial/start",
		"{{upgrade_link}}", "https://app.aisales.io/pricing",
		"{{feedback_link}}", "https://app.aisales.io/feedback",
	)
	return r.Replace(tmpl)
}

func normalizeEmailCompanySize(size string) string {
	switch strings.ToLower(strings.TrimSpace(size)) {
	case "small", "startup", "s":
		return "small"
	case "large", "enterprise", "l":
		return "large"
	default:
		return "medium"
	}
}
