package controller

import (
	"encoding/json"
	"net/http"

	"github.com/aisales/backend/models"
	"github.com/aisales/backend/service"
	"github.com/go-chi/chi/v5"
)

type InterestController struct {
	svc *service.InterestService
}

func NewInterestController(svc *service.InterestService) *InterestController {
	return &InterestController{svc: svc}
}

func (h *InterestController) RegisterRoutes(r chi.Router) {
	r.Route("/interest", func(r chi.Router) {
		r.Get("/stats", h.Stats)
		r.Post("/detect", h.Detect)
		r.Post("/mark", h.Mark)
	})
}

func (h *InterestController) Detect(w http.ResponseWriter, r *http.Request) {
	var body struct {
		EmailBody string `json:"email_body"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	result := h.svc.DetectInterest(body.EmailBody)
	writeJSON(w, http.StatusOK, result)
}

func (h *InterestController) Mark(w http.ResponseWriter, r *http.Request) {
	var req models.MarkInterestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := h.svc.MarkInterest(r.Context(), req); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "interest marked"})
}

func (h *InterestController) Stats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.svc.GetStats(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, stats)
}
