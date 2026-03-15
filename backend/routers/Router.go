package routers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/aisales/backend/controller"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

// Build assembles the complete HTTP router with all routes and middleware.
func Build(
	cc *controller.CompanyController,
	ec *controller.EmailController,
	dc *controller.DemoController,
	tc *controller.TrialController,
	ic *controller.InterestController,
	ac *controller.AnalyticsController,
) http.Handler {
	r := chi.NewRouter()

	// Global middleware
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	// Health check
	r.Get("/health", func(w http.ResponseWriter, req *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "ok",
			"version": "1.0.0",
			"time":    time.Now().Format(time.RFC3339),
		})
	})

	// API v1
	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/", func(w http.ResponseWriter, req *http.Request) {
			json.NewEncoder(w).Encode(map[string]string{"version": "1.0.0"})
		})
		cc.RegisterRoutes(r)
		ec.RegisterRoutes(r)
		dc.RegisterRoutes(r)
		tc.RegisterRoutes(r)
		ic.RegisterRoutes(r)
		ac.RegisterRoutes(r)
	})

	return r
}
