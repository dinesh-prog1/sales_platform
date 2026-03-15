package controller

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/aisales/backend/models"
	"github.com/aisales/backend/service"
	"github.com/go-chi/chi/v5"
)

type CompanyController struct {
	svc *service.CompanyService
}

func NewCompanyController(svc *service.CompanyService) *CompanyController {
	return &CompanyController{svc: svc}
}

func (h *CompanyController) RegisterRoutes(r chi.Router) {
	r.Route("/companies", func(r chi.Router) {
		r.Get("/", h.List)
		r.Post("/upload", h.Upload)
		r.Get("/search", h.Search)
		r.Get("/emails", h.EmailSuggestions)
		r.Get("/stats/size", h.SizeStats)
		r.Get("/stats/status", h.StatusStats)
		r.Get("/{id}", h.Get)
		r.Patch("/{id}/status", h.UpdateStatus)
		r.Delete("/{id}", h.Delete)
	})
}

func (h *CompanyController) Upload(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "failed to parse form")
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "file is required")
		return
	}
	defer file.Close()

	result, err := h.svc.UploadCompanies(r.Context(), file)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (h *CompanyController) List(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))

	f := models.CompanyListFilter{
		Status:     r.URL.Query().Get("status"),
		Size:       r.URL.Query().Get("size"),
		Department: r.URL.Query().Get("department"),
		Country:    r.URL.Query().Get("country"),
		Search:     r.URL.Query().Get("search"),
		SortBy:     r.URL.Query().Get("sort_by"),
		Page:       page,
		Limit:      limit,
	}

	resp, err := h.svc.ListCompanies(r.Context(), f)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

func (h *CompanyController) Search(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	results, err := h.svc.SearchCompanies(r.Context(), q)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if results == nil {
		results = []*models.CompanySearchSuggestion{}
	}
	writeJSON(w, http.StatusOK, results)
}

func (h *CompanyController) EmailSuggestions(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	results, err := h.svc.GetEmailSuggestions(r.Context(), name)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if results == nil {
		results = []*models.CompanyEmailSuggestion{}
	}
	writeJSON(w, http.StatusOK, results)
}

func (h *CompanyController) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	c, err := h.svc.GetCompany(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, c)
}

func (h *CompanyController) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req models.CompanyUpdateStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.svc.UpdateStatus(r.Context(), id, req); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "status updated"})
}

func (h *CompanyController) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.svc.DeleteCompany(r.Context(), id); err != nil {
		if err.Error() == "company not found" {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "company deleted"})
}

func (h *CompanyController) SizeStats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.svc.GetSizeStats(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, stats)
}

func (h *CompanyController) StatusStats(w http.ResponseWriter, r *http.Request) {
	stats, err := h.svc.GetStatusStats(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, stats)
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
