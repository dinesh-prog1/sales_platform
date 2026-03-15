package utils

import (
	"crypto/tls"
	"fmt"
	"net/smtp"
	"strings"
)

// MailerConfig holds SMTP connection settings.
type MailerConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	From     string
}

// Mailer sends emails via SMTP.
type Mailer struct {
	cfg MailerConfig
}

// NewMailer creates a new Mailer instance.
func NewMailer(cfg MailerConfig) *Mailer {
	return &Mailer{cfg: cfg}
}

// EmailMessage represents an email to be sent.
type EmailMessage struct {
	To      string
	Subject string
	Body    string
	HTML    bool
}

// Send dispatches an email via SMTP (TLS with STARTTLS fallback).
func (m *Mailer) Send(email EmailMessage) error {
	addr := fmt.Sprintf("%s:%d", m.cfg.Host, m.cfg.Port)
	auth := smtp.PlainAuth("", m.cfg.User, m.cfg.Password, m.cfg.Host)
	msg := buildMailMessage(m.cfg.From, email.To, email.Subject, email.Body, email.HTML)

	tlsCfg := &tls.Config{
		InsecureSkipVerify: false,
		ServerName:         m.cfg.Host,
	}

	conn, err := tls.Dial("tcp", addr, tlsCfg)
	if err != nil {
		return smtp.SendMail(addr, auth, extractEmailAddr(m.cfg.From), []string{email.To}, []byte(msg))
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, m.cfg.Host)
	if err != nil {
		return fmt.Errorf("create smtp client: %w", err)
	}
	defer client.Close()

	if err := client.Auth(auth); err != nil {
		return fmt.Errorf("smtp auth: %w", err)
	}
	if err := client.Mail(extractEmailAddr(m.cfg.From)); err != nil {
		return fmt.Errorf("smtp mail from: %w", err)
	}
	if err := client.Rcpt(email.To); err != nil {
		return fmt.Errorf("smtp rcpt: %w", err)
	}
	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("smtp data: %w", err)
	}
	if _, err = w.Write([]byte(msg)); err != nil {
		return fmt.Errorf("write message: %w", err)
	}
	return w.Close()
}

func buildMailMessage(from, to, subject, body string, html bool) string {
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("From: %s\r\n", from))
	sb.WriteString(fmt.Sprintf("To: %s\r\n", to))
	sb.WriteString(fmt.Sprintf("Subject: %s\r\n", subject))
	sb.WriteString("MIME-Version: 1.0\r\n")
	if html {
		sb.WriteString("Content-Type: text/html; charset=UTF-8\r\n")
	} else {
		sb.WriteString("Content-Type: text/plain; charset=UTF-8\r\n")
	}
	sb.WriteString("\r\n")
	sb.WriteString(body)
	return sb.String()
}

func extractEmailAddr(from string) string {
	start := strings.Index(from, "<")
	end := strings.Index(from, ">")
	if start != -1 && end != -1 && end > start {
		return from[start+1 : end]
	}
	return from
}
