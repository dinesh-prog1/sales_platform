package controller

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/aisales/backend/helper"
	"github.com/aisales/backend/utils"
	"github.com/go-chi/chi/v5"
)

type AuthController struct {
	cfg *helper.AppConfig
}

func NewAuthController(cfg *helper.AppConfig) *AuthController {
	return &AuthController{cfg: cfg}
}

func (h *AuthController) RegisterRoutes(r chi.Router) {
	r.Route("/auth", func(r chi.Router) {
		r.Post("/login", h.Login)
	})
}

func (h *AuthController) Login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	email := strings.TrimSpace(strings.ToLower(req.Email))
	expectedEmail := strings.TrimSpace(strings.ToLower(h.cfg.AdminEmail))
	if email == "" || strings.TrimSpace(req.Password) == "" {
		writeError(w, http.StatusBadRequest, "email and password are required")
		return
	}
	if email != expectedEmail || req.Password != h.cfg.AdminPassword {
		writeError(w, http.StatusUnauthorized, "invalid admin credentials")
		return
	}

	token, err := utils.GenerateAdminJWT(h.cfg.JWTSecret, h.cfg.AdminEmail, 24*time.Hour)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create session token")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"token":      token,
		"token_type": "Bearer",
		"expires_in": int((24 * time.Hour).Seconds()),
		"admin": map[string]string{
			"email": h.cfg.AdminEmail,
			"role":  "admin",
		},
	})
}
