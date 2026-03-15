package filter

import (
	"net/http"

	"github.com/go-chi/cors"
)

// CORSOptions holds allowed origin configuration.
type CORSOptions struct {
	AllowedOrigins []string
}

// DefaultCORSOptions returns sensible production CORS defaults.
func DefaultCORSOptions() cors.Options {
	return cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: false,
		MaxAge:           300,
	}
}

// Middleware returns a configured CORS middleware handler.
func Middleware(opts cors.Options) func(http.Handler) http.Handler {
	return cors.Handler(opts)
}
