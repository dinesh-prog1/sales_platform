package controller

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/aisales/backend/models"
	"github.com/aisales/backend/service"
	"github.com/go-chi/chi/v5"
)

type DemoController struct {
	svc *service.DemoService
}

func NewDemoController(svc *service.DemoService) *DemoController {
	return &DemoController{svc: svc}
}

func (h *DemoController) RegisterRoutes(r chi.Router) {
	r.Route("/demos", func(r chi.Router) {
		r.Get("/", h.List)
		r.Post("/", h.Create)
		r.Post("/book", h.PublicBook)
		r.Post("/public-schedule", h.PublicSchedule)
		r.Get("/slots", h.GetSlots)
		r.Get("/upcoming", h.Upcoming)
		r.Get("/stats", h.Stats)
		r.Get("/{id}", h.Get)
		r.Put("/{id}", h.Update)
		r.Delete("/{id}", h.DeleteDemo)
		r.Post("/{id}/confirm", h.ConfirmDemo)
	})
}

func (h *DemoController) PublicBook(w http.ResponseWriter, r *http.Request) {
	var req models.PublicBookRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	booking, err := h.svc.PublicBook(r.Context(), req)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, booking)
}

func (h *DemoController) GetSlots(w http.ResponseWriter, r *http.Request) {
	date := r.URL.Query().Get("date")
	if date == "" {
		writeError(w, http.StatusBadRequest, "date query param required (YYYY-MM-DD)")
		return
	}
	avail, err := h.svc.GetSlotAvailability(r.Context(), date)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, avail)
}

func (h *DemoController) Upcoming(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	resp, err := h.svc.ListBookings(r.Context(), models.DemoListFilter{
		UpcomingOnly: true,
		Page:         page,
		Limit:        limit,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func (h *DemoController) PublicSchedule(w http.ResponseWriter, r *http.Request) {
	var req models.PublicScheduleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	booking, err := h.svc.CreatePublicBooking(r.Context(), req)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, booking)
}

func (h *DemoController) Create(w http.ResponseWriter, r *http.Request) {
	var req models.DemoCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	booking, err := h.svc.CreateBooking(r.Context(), req)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, booking)
}

func (h *DemoController) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	booking, err := h.svc.GetBooking(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, booking)
}

func (h *DemoController) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req models.DemoUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := h.svc.UpdateBooking(r.Context(), id, req); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "booking updated"})
}

func (h *DemoController) List(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	resp, err := h.svc.ListBookings(r.Context(), models.DemoListFilter{
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

func (h *DemoController) Stats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.svc.GetStats(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, stats)
}

// DeleteDemo hard-deletes a booking and frees the time slot for new bookings.
func (h *DemoController) DeleteDemo(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.svc.DeleteBooking(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "booking deleted — slot is now available"})
}

func (h *DemoController) ConfirmDemo(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req models.ConfirmDemoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	booking, err := h.svc.ConfirmDemo(r.Context(), id, req.MeetingLink)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, booking)
}
