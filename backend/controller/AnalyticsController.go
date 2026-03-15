package controller

import (
	"net/http"

	"github.com/aisales/backend/service"
	"github.com/go-chi/chi/v5"
)

type AnalyticsController struct {
	svc *service.AnalyticsService
}

func NewAnalyticsController(svc *service.AnalyticsService) *AnalyticsController {
	return &AnalyticsController{svc: svc}
}

func (h *AnalyticsController) RegisterRoutes(r chi.Router) {
	r.Route("/analytics", func(r chi.Router) {
		r.Get("/dashboard", h.Dashboard)
	})
}

func (h *AnalyticsController) Dashboard(w http.ResponseWriter, r *http.Request) {
	data, err := h.svc.GetDashboard(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, data)
}
