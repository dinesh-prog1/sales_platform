package controller

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/aisales/backend/models"
	"github.com/aisales/backend/service"
	"github.com/go-chi/chi/v5"
)

type EmailController struct {
	svc *service.EmailService
}

func NewEmailController(svc *service.EmailService) *EmailController {
	return &EmailController{svc: svc}
}

func (h *EmailController) RegisterRoutes(r chi.Router) {
	r.Route("/emails", func(r chi.Router) {
		r.Get("/", h.ListEmails)
		r.Post("/manual-outreach", h.SendManualOutreach)
		r.Post("/respond-outreach", h.RespondOutreach)
		r.Get("/stats", h.GetStats)
		r.Get("/insights", h.GetInsights)
		r.Post("/{id}/retry", h.RetryEmail)
		r.Get("/trend", h.GetTrend)
		r.Get("/templates", h.GetTemplates)
		r.Post("/templates", h.CreateTemplate)
		r.Put("/templates/{type}", h.UpdateTemplate)
		r.Put("/templates/by-id/{id}", h.UpdateTemplateByID)
		r.Post("/templates/{id}/activate", h.SetActiveTemplate)
		r.Delete("/templates/{id}", h.DeleteTemplate)
		r.Get("/config", h.GetConfig)
		r.Put("/config", h.UpdateConfig)
		r.Delete("/logs", h.ClearLogs)
		r.Post("/reset-outreach/{company_id}", h.ResetCompanyOutreach)
	})
}

func (h *EmailController) SendManualOutreach(w http.ResponseWriter, r *http.Request) {
	var req models.ManualOutreachRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := h.svc.SendManualOutreach(r.Context(), req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "manual outreach queued"})
}

func (h *EmailController) RespondOutreach(w http.ResponseWriter, r *http.Request) {
	var req models.OutreachResponseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := h.svc.HandleOutreachResponse(r.Context(), req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "response recorded"})
}

func (h *EmailController) ListEmails(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))

	resp, err := h.svc.ListEmails(r.Context(), models.EmailListFilter{
		CompanyID: r.URL.Query().Get("company_id"),
		Type:      r.URL.Query().Get("type"),
		Status:    r.URL.Query().Get("status"),
		Search:    r.URL.Query().Get("search"),
		Page:      page,
		Limit:     limit,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *EmailController) GetStats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.svc.GetStats(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, stats)
}

func (h *EmailController) GetTrend(w http.ResponseWriter, r *http.Request) {
	days, _ := strconv.Atoi(r.URL.Query().Get("days"))
	if days == 0 {
		days = 30
	}
	data, err := h.svc.GetDailyTrend(r.Context(), days)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, data)
}

func (h *EmailController) GetTemplates(w http.ResponseWriter, r *http.Request) {
	templates, err := h.svc.GetAllTemplates(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, templates)
}

func (h *EmailController) UpdateTemplate(w http.ResponseWriter, r *http.Request) {
	emailType := models.EmailType(chi.URLParam(r, "type"))
	var req models.UpdateEmailTemplateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := h.svc.UpdateTemplate(r.Context(), emailType, req); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "template updated"})
}

func (h *EmailController) UpdateTemplateByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req models.UpdateEmailTemplateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := h.svc.UpdateTemplateByID(r.Context(), id, req); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "template updated"})
}

func (h *EmailController) CreateTemplate(w http.ResponseWriter, r *http.Request) {
	var req models.CreateEmailTemplateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Type == "" || req.Name == "" {
		writeError(w, http.StatusBadRequest, "type and name are required")
		return
	}
	t, err := h.svc.CreateTemplate(r.Context(), req)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, t)
}

func (h *EmailController) SetActiveTemplate(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.svc.SetActiveTemplate(r.Context(), id); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "template activated"})
}

func (h *EmailController) DeleteTemplate(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.svc.DeleteTemplate(r.Context(), id); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "template deleted"})
}

func (h *EmailController) GetConfig(w http.ResponseWriter, r *http.Request) {
	cfg, err := h.svc.GetConfig(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, cfg)
}

func (h *EmailController) UpdateConfig(w http.ResponseWriter, r *http.Request) {
	var req models.UpdateEmailConfigRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := h.svc.UpdateConfig(r.Context(), req); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "config updated"})
}

// ResetCompanyOutreach removes all outreach logs for one company and resets
// its status to 'uploaded' so the admin can send a fresh outreach email to it.
func (h *EmailController) ResetCompanyOutreach(w http.ResponseWriter, r *http.Request) {
	companyID := chi.URLParam(r, "company_id")
	if err := h.svc.ResetCompanyOutreach(r.Context(), companyID); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "outreach limit reset — company is eligible for a fresh outreach"})
}

func (h *EmailController) GetInsights(w http.ResponseWriter, r *http.Request) {
	stats, err := h.svc.GetInsightStats(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, stats)
}

func (h *EmailController) RetryEmail(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.svc.RetryEmail(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "email re-queued for retry"})
}

// ClearLogs deletes all email logs and resets outreach_sent companies back to uploaded.
func (h *EmailController) ClearLogs(w http.ResponseWriter, r *http.Request) {
	if err := h.svc.ClearAllLogs(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "all email logs cleared and company statuses reset"})
}
