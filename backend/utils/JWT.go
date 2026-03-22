package utils

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

type AdminClaims struct {
	Subject string `json:"sub"`
	Email   string `json:"email"`
	Role    string `json:"role"`
	Issued  int64  `json:"iat"`
	Expires int64  `json:"exp"`
}

var jwtEncoding = base64.RawURLEncoding

func GenerateAdminJWT(secret, email string, ttl time.Duration) (string, error) {
	if strings.TrimSpace(secret) == "" {
		return "", errors.New("jwt secret is required")
	}

	now := time.Now().UTC()
	headerJSON, err := json.Marshal(map[string]string{
		"alg": "HS256",
		"typ": "JWT",
	})
	if err != nil {
		return "", fmt.Errorf("marshal jwt header: %w", err)
	}

	claimsJSON, err := json.Marshal(AdminClaims{
		Subject: email,
		Email:   email,
		Role:    "admin",
		Issued:  now.Unix(),
		Expires: now.Add(ttl).Unix(),
	})
	if err != nil {
		return "", fmt.Errorf("marshal jwt claims: %w", err)
	}

	unsigned := jwtEncoding.EncodeToString(headerJSON) + "." + jwtEncoding.EncodeToString(claimsJSON)
	return unsigned + "." + signJWT(secret, unsigned), nil
}

func ParseAdminJWT(secret, token string) (*AdminClaims, error) {
	if strings.TrimSpace(secret) == "" {
		return nil, errors.New("jwt secret is required")
	}

	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return nil, errors.New("invalid jwt format")
	}

	unsigned := parts[0] + "." + parts[1]
	if !hmac.Equal([]byte(signJWT(secret, unsigned)), []byte(parts[2])) {
		return nil, errors.New("invalid jwt signature")
	}

	payload, err := jwtEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, errors.New("invalid jwt payload")
	}

	var claims AdminClaims
	if err := json.Unmarshal(payload, &claims); err != nil {
		return nil, errors.New("invalid jwt claims")
	}

	if claims.Role != "admin" {
		return nil, errors.New("invalid jwt role")
	}
	if claims.Expires <= time.Now().UTC().Unix() {
		return nil, errors.New("jwt expired")
	}

	return &claims, nil
}

func signJWT(secret, message string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(message))
	return jwtEncoding.EncodeToString(mac.Sum(nil))
}
