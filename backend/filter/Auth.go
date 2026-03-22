package filter

import (
	"net/http"
	"strings"

	"github.com/aisales/backend/utils"
)

// AdminAuth protects admin API endpoints while preserving public response flows.
func AdminAuth(jwtSecret, apiToken string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if isPublicRoute(r.Method, r.URL.Path) {
				next.ServeHTTP(w, r)
				return
			}

			token := bearerToken(r.Header.Get("Authorization"))
			if token != "" {
				if _, err := utils.ParseAdminJWT(jwtSecret, token); err == nil {
					next.ServeHTTP(w, r)
					return
				}
			}

			legacyToken := strings.TrimSpace(r.Header.Get("X-Admin-Token"))
			if legacyToken == "" && token != "" {
				legacyToken = token
			}
			if strings.TrimSpace(apiToken) != "" && legacyToken == apiToken {
				next.ServeHTTP(w, r)
				return
			}

			if strings.TrimSpace(apiToken) == "" && strings.TrimSpace(jwtSecret) == "" {
				next.ServeHTTP(w, r)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			if token == "" && legacyToken == "" {
				_, _ = w.Write([]byte(`{"error":"authentication required"}`))
				return
			}

			_, _ = w.Write([]byte(`{"error":"invalid or expired session"}`))
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
	case method == http.MethodPost && path == "/api/v1/auth/login":
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
