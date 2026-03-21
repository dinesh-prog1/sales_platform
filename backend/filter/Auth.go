package filter

import (
	"net/http"
	"strings"
)

// AdminAuth protects admin API endpoints while preserving public response flows.
func AdminAuth(apiToken string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if strings.TrimSpace(apiToken) == "" {
				next.ServeHTTP(w, r)
				return
			}

			if isPublicRoute(r.Method, r.URL.Path) {
				next.ServeHTTP(w, r)
				return
			}

			token := strings.TrimSpace(r.Header.Get("X-Admin-Token"))
			if token == "" {
				token = bearerToken(r.Header.Get("Authorization"))
			}

			if token == "" || token != apiToken {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				_, _ = w.Write([]byte(`{"error":"admin authorization required"}`))
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func bearerToken(header string) string {
	if !strings.HasPrefix(strings.ToLower(header), "bearer ") {
		return ""
	}
	return strings.TrimSpace(header[7:])
}

func isPublicRoute(method, path string) bool {
	switch {
	case method == http.MethodGet && path == "/health":
		return true
	case method == http.MethodGet && path == "/api/v1":
		return true
	case method == http.MethodPost && path == "/api/v1/emails/respond-outreach":
		return true
	case method == http.MethodPost && path == "/api/v1/demos/book":
		return true
	case method == http.MethodPost && path == "/api/v1/demos/public-schedule":
		return true
	case method == http.MethodGet && path == "/api/v1/demos/slots":
		return true
	case method == http.MethodPost && path == "/api/v1/trials/respond":
		return true
	case method == http.MethodPost && path == "/api/v1/subscriptions":
		return true
	default:
		return false
	}
}
