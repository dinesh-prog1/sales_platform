package controller

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/aisales/backend/models"
	"github.com/aisales/backend/service"
	"github.com/go-chi/chi/v5"
)

type SubscriptionController struct {
	svc *service.SubscriptionService
}

func NewSubscriptionController(svc *service.SubscriptionService) *SubscriptionController {
	return &SubscriptionController{svc: svc}
}

func (h *SubscriptionController) RegisterRoutes(r chi.Router) {
	r.Route("/subscriptions", func(r chi.Router) {
		r.Post("/", h.Create)
		r.Get("/", h.List)
		r.Get("/{id}", h.Get)
		r.Patch("/{id}/status", h.UpdateStatus)
	})
}

func (h *SubscriptionController) Create(w http.ResponseWriter, r *http.Request) {
	var req models.SubscriptionCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	sub, err := h.svc.CreateSubscription(r.Context(), req)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, sub)
}

func (h *SubscriptionController) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	sub, err := h.svc.GetSubscription(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, sub)
}

func (h *SubscriptionController) List(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	resp, err := h.svc.ListSubscriptions(r.Context(), models.SubscriptionListFilter{
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

func (h *SubscriptionController) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var body struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := h.svc.UpdateStatus(r.Context(), id, models.SubscriptionStatus(body.Status)); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "status updated"})
}
