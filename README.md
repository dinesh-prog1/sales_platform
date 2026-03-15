# AI Sales Automation Platform

A production-ready B2B Sales Automation Platform built with Go, Next.js, PostgreSQL, and Redis.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│           Blue SaaS Dashboard on Port 3000               │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP API
┌───────────────────────▼─────────────────────────────────┐
│                   Backend (Go)                           │
│              REST API on Port 8080                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │Companies │ │  Emails  │ │  Demos   │ │  Trials   │  │
│  │ Service  │ │ Service  │ │ Service  │ │  Service  │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
│  ┌──────────┐ ┌──────────┐                              │
│  │ Interest │ │Analytics │                              │
│  │ Service  │ │ Service  │                              │
│  └──────────┘ └──────────┘                              │
└───────────┬──────────────────────┬──────────────────────┘
            │                      │
┌───────────▼────┐     ┌───────────▼────┐
│  PostgreSQL    │     │  Redis Queue   │
│  (Port 5432)   │     │  (Port 6379)   │
└────────────────┘     └───────────┬────┘
                                   │
                        ┌──────────▼────┐
                        │ Email Worker  │
                        │ (Background)  │
                        └───────────────┘
```

## Quick Start

### Prerequisites
- Docker & Docker Compose

### 1. Configure Environment
```bash
cp backend/.env.example .env
# Edit .env with your SMTP credentials
```

### 2. Start All Services
```bash
docker-compose up -d
```

### 3. Access the Application
- **Frontend Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **API Health**: http://localhost:8080/health

## Pipeline Workflow

| Step | Action | Email Sent |
|------|--------|------------|
| 1 | Upload companies via Excel | — |
| 2 | Automated outreach | Outreach email |
| 3 | Company replies with interest | — |
| 4 | Demo invitation sent | Demo invite email |
| 5 | Demo scheduled | Demo confirmation |
| 6 | Demo completed | Trial/pricing info |
| 7 | Trial expires in 3 days | Reminder email |
| 8 | Trial converted → Paid | — |
| 9 | Trial dropped | Feedback request |

## API Endpoints

### Companies
- `GET    /api/v1/companies` — List companies (filter: status, size, search)
- `POST   /api/v1/companies/upload` — Upload Excel file
- `GET    /api/v1/companies/stats/size` — Size distribution
- `GET    /api/v1/companies/stats/status` — Status distribution
- `GET    /api/v1/companies/{id}` — Get company
- `PATCH  /api/v1/companies/{id}/status` — Update status

### Emails
- `GET    /api/v1/emails` — List email logs
- `GET    /api/v1/emails/stats` — Email statistics
- `GET    /api/v1/emails/trend` — Daily email trend
- `GET    /api/v1/emails/templates` — Get all templates
- `PUT    /api/v1/emails/templates/{type}` — Update template
- `GET    /api/v1/emails/config` — Get email config
- `PUT    /api/v1/emails/config` — Update config

### Demos
- `GET    /api/v1/demos` — List demo bookings
- `POST   /api/v1/demos` — Create booking
- `GET    /api/v1/demos/stats` — Demo statistics
- `GET    /api/v1/demos/{id}` — Get booking
- `PUT    /api/v1/demos/{id}` — Update booking

### Trials
- `GET    /api/v1/trials` — List trials
- `POST   /api/v1/trials` — Start trial
- `GET    /api/v1/trials/stats` — Trial statistics
- `PUT    /api/v1/trials/{id}` — Update trial

### Analytics
- `GET    /api/v1/analytics/dashboard` — Full dashboard data

## Excel Upload Format

| Column | Required | Values |
|--------|----------|--------|
| Company Name | Yes | Any text |
| Company Size | No | small / medium / large |
| Email | Yes | Valid email |
| Contact Person | No | Any text |
| Industry | No | Any text |
| Country | No | Any text |

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Backend | Go 1.21 + Chi Router |
| Database | PostgreSQL 16 |
| Queue | Redis 7 |
| Frontend | Next.js 14 + TypeScript |
| UI | Tailwind CSS + Recharts |
| Email | SMTP (Gmail/any provider) |
| Container | Docker + Docker Compose |

## Future AI Enhancements

- **Lead Scoring**: AI-powered scoring based on company profile
- **Smart Reply Detection**: NLP-based interest classification
- **Personalization**: GPT-generated personalized emails
- **Optimal Send Time**: ML-based send time optimization
- **Churn Prediction**: Predict which trials will convert
