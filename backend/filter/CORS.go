package filter

import (
	"net/http"

	"github.com/go-chi/cors"
)

// CORSOptions holds allowed origin configuration.
type CORSOptions struct {
	AllowedOrigins []string
}

// DefaultCORSOptions returns configurable CORS defaults.
func DefaultCORSOptions(allowedOrigins []string) cors.Options {
	if len(allowedOrigins) == 0 {
		allowedOrigins = []string{"http://localhost:3000"}
	}
	return cors.Options{
		AllowedOrigins:   allowedOrigins,
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
