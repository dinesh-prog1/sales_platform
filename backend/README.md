# AI Sales Backend

Go backend for an AI-driven sales outreach pipeline. The service manages company imports, outreach email campaigns, demo scheduling, trial lifecycle tracking, interest detection, and dashboard analytics.

## What This Project Does

This backend is designed to support a B2B sales workflow:

1. Import prospect companies from Excel.
2. Store and segment companies by size, industry, and pipeline status.
3. Queue and send outreach emails through Redis-backed jobs.
4. Capture interest responses and move companies through the pipeline.
5. Schedule demos and confirm follow-up communication.
6. Start and monitor free trials.
7. Track metrics for outreach, conversion, and trial performance.

The API is built with:

- Go
- Chi router
- PostgreSQL
- Redis
- SMTP email delivery

## Project Structure

```text
.
|-- cmd/
|   `-- worker/            # Dedicated email worker entrypoint
|-- internal/
|   |-- analytics/         # Dashboard metrics and reporting
|   |-- api/               # HTTP router and middleware
|   |-- company/           # Company import, listing, status management
|   |-- config/            # Environment-based configuration
|   |-- demo/              # Demo booking lifecycle
|   |-- email/             # Email templates, logs, queueing, worker logic
|   |-- interest/          # Interest detection and manual interest marking
|   `-- trial/             # Trial creation, updates, reminders
|-- migrations/            # PostgreSQL schema and seed data
|-- pkg/
|   |-- database/          # DB connection and migration runner
|   |-- envutil/           # .env loader
|   |-- excel/             # Excel parsing for company uploads
|   |-- mailer/            # SMTP email sender
|   `-- queue/             # Redis or in-memory queue abstraction
`-- main.go                # API entrypoint
```

## Runtime Architecture

The application has two executable flows:

- `main.go`: starts the HTTP API, applies migrations, starts the queue, initializes services, and launches the email worker plus scheduled automation.
- `cmd/worker/main.go`: separate worker entrypoint intended to process queued emails.

Core runtime behavior:

- The API exposes `/health` and `/api/v1/...` routes.
- PostgreSQL stores the pipeline state and email history.
- Redis is used as the queue backend in non-development environments.
- The email worker pulls jobs from queue topics like outreach, demo invite, and trial reminder.
- A scheduler runs periodically to queue outreach batches and trial reminder emails.

## Setup

### Requirements

- Go 1.24+
- PostgreSQL
- Redis
- SMTP credentials for outbound email

### Environment Variables

Copy `.env.example` into `.env` and adjust values:

```env
PORT=8080
ENVIRONMENT=development
APP_BASE_URL=http://localhost:3000
JWT_SECRET=change-this
DATABASE_URL=postgres://postgres:password@localhost:5432/aisales?sslmode=disable
REDIS_URL=redis://:aisales_redis_secret@localhost:6379/0
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=AI Sales Platform <noreply@example.com>
SCHEDULING_LINK=https://calendly.com/your-link
```

### Run The API

```bash
go run .
```

### Run The Worker

```bash
go run ./cmd/worker
```

### Build Binaries

```bash
go build -o backend.exe .
go build -o worker.exe ./cmd/worker
```

## API Overview

Base path: `/api/v1`

### Health

- `GET /health`

### Company Module

- `GET /companies`
- `POST /companies/upload`
- `GET /companies/stats/size`
- `GET /companies/stats/status`
- `GET /companies/{id}`
- `PATCH /companies/{id}/status`

Purpose:

- Upload companies from Excel.
- Filter and paginate prospect lists.
- Track where each company sits in the sales pipeline.

### Email Module

- `GET /emails`
- `POST /emails/manual-outreach`
- `POST /emails/respond-outreach`
- `GET /emails/stats`
- `GET /emails/trend`
- `GET /emails/templates`
- `PUT /emails/templates/{type}`
- `GET /emails/config`
- `PUT /emails/config`

Purpose:

- Queue outreach manually or automatically.
- Store email logs and delivery state.
- Manage template content and campaign configuration.

### Demo Module

- `GET /demos`
- `POST /demos`
- `POST /demos/public-schedule`
- `GET /demos/stats`
- `GET /demos/{id}`
- `PUT /demos/{id}`

Purpose:

- Create demo bookings internally or from a public scheduling form.
- Track confirmation, completion, cancellations, and no-shows.

### Trial Module

- `GET /trials`
- `POST /trials`
- `GET /trials/stats`
- `GET /trials/{id}`
- `PUT /trials/{id}`

Purpose:

- Start a 14-day trial.
- Record conversion, expiry, or drop-off outcomes.
- Support reminder automation.

### Interest Module

- `GET /interest/stats`
- `POST /interest/detect`
- `POST /interest/mark`

Purpose:

- Detect likely intent from inbound email text.
- Mark a company as interested or not interested.

### Analytics Module

- `GET /analytics/dashboard`

Purpose:

- Provide dashboard-ready pipeline, email, company, and trial metrics.

## Complete Model Explanation

This section describes the main domain models used by the backend.

### 1. Company

Represents a lead or prospect organization moving through the sales funnel.

Fields:

- `id`: UUID primary key.
- `name`: Company name.
- `size`: Prospect segment. Allowed values: `small`, `medium`, `large`.
- `email`: Main contact email. Must be unique.
- `contact_person`: Human contact name.
- `industry`: Business vertical.
- `country`: Geographic location.
- `status`: Current pipeline stage.
- `notes`: Freeform sales notes.
- `created_at`, `updated_at`: Audit timestamps.

Pipeline statuses:

- `uploaded`: Imported but no outreach sent yet.
- `outreach_sent`: Initial email was sent.
- `interested`: Positive response or confirmed interest.
- `not_interested`: Negative response.
- `demo_invited`: Demo invitation sent.
- `demo_scheduled`: Demo scheduled.
- `demo_completed`: Demo completed.
- `trial_started`: Trial activated.
- `trial_expired`: Trial ended without conversion yet.
- `converted`: Became a paying customer.
- `dropped`: Opportunity was lost.

Business role:

- This is the central entity across the whole system.
- Email logs, demos, trials, and feedback all link back to a company.

### 2. EmailLog

Represents one outbound email attempt or scheduled message associated with a company.

Fields:

- `id`: UUID primary key.
- `company_id`: Foreign key to `companies`.
- `type`: Email category.
- `status`: Delivery or engagement status.
- `subject`, `body`: Final rendered content stored for traceability.
- `to_email`: Recipient address.
- `sent_at`, `opened_at`, `replied_at`: Event timestamps.
- `error_message`: Failure details for troubleshooting.
- `retry_count`, `max_retries`: Retry controls.
- `scheduled_at`: Intended execution time.
- `created_at`, `updated_at`: Audit timestamps.

Email types:

- `outreach`
- `demo_invite`
- `demo_confirm`
- `post_demo`
- `trial_reminder`
- `feedback`

Email statuses:

- `pending`
- `queued`
- `sent`
- `failed`
- `opened`
- `replied`

Business role:

- Tracks delivery history.
- Supports retries and analytics.
- Preserves the rendered version of each email even if templates change later.

### 3. EmailTemplate

Stores reusable content for each email type.

Fields:

- `id`: UUID primary key.
- `type`: Unique email template category.
- `subject`: Template subject.
- `body`: Template body, including placeholders.
- `is_active`: Whether the template is enabled.
- `created_at`, `updated_at`: Audit timestamps.

Business role:

- Allows business teams to modify outreach and lifecycle messaging without changing code.
- Supports placeholder substitution such as company name, contact name, demo link, and response links.

### 4. EmailConfig

Stores operational settings for email automation.

Fields:

- `id`: UUID primary key.
- `emails_per_day`: Daily send cap.
- `target_size`: Which company size segment to target, or `all`.
- `batch_interval_minutes`: Campaign batch interval.
- `is_active`: Whether automation is enabled.
- `scheduling_link`: Demo scheduling URL.
- `created_at`, `updated_at`: Audit timestamps.

Business role:

- Controls campaign throughput.
- Lets operators pause or tune outreach without redeploying the backend.

### 5. DemoBooking

Represents a scheduled or proposed product demo.

Fields:

- `id`: UUID primary key.
- `company_id`: Foreign key to `companies`.
- `scheduled_at`: Planned demo time.
- `status`: Demo state.
- `meeting_link`: Video call or meeting URL.
- `calendar_event_id`: Optional external calendar reference.
- `notes`: Internal notes or context.
- `completed_at`: Completion timestamp.
- `created_at`, `updated_at`: Audit timestamps.

Demo statuses:

- `pending`
- `confirmed`
- `completed`
- `cancelled`
- `no_show`

Business role:

- Connects prospect interest to a concrete sales conversation.
- Feeds demo conversion reporting.

### 6. Trial

Represents a free product trial after a prospect has engaged further in the funnel.

Fields:

- `id`: UUID primary key.
- `company_id`: Foreign key to `companies`.
- `started_at`: Trial start time.
- `expires_at`: Trial end time, default 14 days after start.
- `reminder_sent`: Whether the expiration reminder was sent.
- `reminder_sent_at`: When the reminder was sent.
- `status`: Trial state.
- `plan_selected`: Selected plan when converting or evaluating.
- `converted_at`: Conversion timestamp.
- `created_at`, `updated_at`: Audit timestamps.

Trial statuses:

- `active`
- `expired`
- `converted`
- `dropped`

Business role:

- Tracks activation, expiration, and conversion outcomes.
- Supports automated reminder campaigns before expiry.

### 7. Feedback

Represents qualitative feedback captured after a trial ends.

Fields:

- `id`: UUID primary key.
- `company_id`: Foreign key to `companies`.
- `reason`: Main reason for churn or hesitation.
- `required_features`: Missing features requested by the prospect.
- `improvements`: Suggestions for improvement.
- `rating`: Score from 1 to 5.
- `submitted_at`: Submission time.
- `created_at`: Record creation time.

Business role:

- Helps understand lost deals and product gaps.
- Can inform future product roadmap and messaging changes.

### 8. InterestDetection

In code, `interest.Detection` is a computed response object rather than a database table.

Fields:

- `company_id`
- `company_name`
- `company_email`
- `interested`
- `confidence`
- `keywords_found`
- `detected_at`

Business role:

- Encapsulates the result of analyzing inbound email text for intent signals.
- Used for API responses and pipeline decisions, not long-term persistence.

### 9. Analytics Dashboard Models

Analytics models are aggregated response types, not raw database tables.

Main response objects:

- `DashboardData`
- `PipelineMetrics`
- `EmailMetrics`
- `CompanyMetrics`
- `TrialMetrics`
- `DailyPoint`
- `PipelinePoint`
- `SizePoint`

Business role:

- Shape data for dashboards, charts, and funnel summaries.
- Present high-level operational performance without exposing raw table joins to clients.

## Data Relationships

The main relationships are:

- One `company` can have many `email_logs`.
- One `company` can have many `demo_bookings`.
- One `company` can have many `trials`.
- One `company` can have many `feedback` entries.
- `email_templates` are global by email type.
- `email_configs` is effectively a shared global automation configuration table.

## Automation Flow

Typical flow in this backend:

1. Companies are uploaded from Excel and stored with `uploaded` status.
2. Scheduler fetches eligible companies and queues outreach emails.
3. Email worker sends emails and records delivery status.
4. If a company responds positively, the system marks it `interested`.
5. A demo invite email is queued.
6. Demo gets scheduled and later completed.
7. Trial starts and expires after 14 days unless converted.
8. Reminder and feedback emails can be queued based on lifecycle stage.

## Database

Migration file: [migrations/001_init.sql](/f:/AI-sales/backend/migrations/001_init.sql)

The migration creates:

- `companies`
- `email_logs`
- `demo_bookings`
- `trials`
- `feedback`
- `email_templates`
- `email_configs`

It also:

- seeds default email templates
- seeds a default email config
- creates indexes for query performance
- creates `updated_at` triggers for mutable tables

## Notes

- CORS is enabled in the API router.
- The backend loads `.env` automatically on startup.
- Queue backend selection is environment-aware through `pkg/queue`.
- Several email templates are currently tailored to the `Employee Galaxy` product messaging.

## Suggested Next Improvements

- Add a frontend-oriented API documentation section with example request and response payloads.
- Add authentication and authorization around admin endpoints.
- Add OpenAPI or Swagger documentation.
- Add tests for services, repositories, and worker flows.
- Document deployment with Docker Compose for PostgreSQL and Redis.
