package controller

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/aisales/backend/models"
	"github.com/aisales/backend/service"
	"github.com/go-chi/chi/v5"
)

type TrialController struct {
	svc *service.TrialService
}

func NewTrialController(svc *service.TrialService) *TrialController {
	return &TrialController{svc: svc}
}

func (h *TrialController) RegisterRoutes(r chi.Router) {
	r.Route("/trials", func(r chi.Router) {
		r.Get("/", h.List)
		r.Post("/", h.Create)
		r.Post("/respond", h.Respond)
		r.Get("/stats", h.Stats)
		r.Get("/{id}", h.Get)
		r.Put("/{id}", h.Update)
	})
}

// Respond handles trial conversion link clicks (interested / not_interested).
func (h *TrialController) Respond(w http.ResponseWriter, r *http.Request) {
	var req models.TrialRespondRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	result, err := h.svc.HandleTrialResponse(r.Context(), req)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *TrialController) Create(w http.ResponseWriter, r *http.Request) {
	var req models.TrialCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	t, err := h.svc.StartTrial(r.Context(), req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, t)
}

func (h *TrialController) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	t, err := h.svc.GetTrial(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, t)
}

func (h *TrialController) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req models.TrialUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := h.svc.UpdateTrial(r.Context(), id, req); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "trial updated"})
}

func (h *TrialController) List(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	resp, err := h.svc.ListTrials(r.Context(), models.TrialListFilter{
		Status: r.URL.Query().Get("status"),
		Page:   page,
		Limit:  limit,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *TrialController) Stats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.svc.GetStats(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, stats)
}
