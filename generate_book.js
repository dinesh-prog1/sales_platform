const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  TableOfContents,
  StyleLevel,
  LevelFormat,
  convertInchesToTwip,
  PageOrientation,
  PageSize,
  NumberingLevel,
  AbstractNumbering,
  Numbering,
  NumberFormat,
} = require("docx");
const fs = require("fs");

// Helper: Create a Heading 1 paragraph
function h1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
  });
}

// Helper: Create a Heading 2 paragraph
function h2(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
  });
}

// Helper: Create a Heading 3 paragraph
function h3(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
  });
}

// Helper: Normal body paragraph
function body(text) {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        font: "Arial",
        size: 22, // 11pt
      }),
    ],
    spacing: { before: 100, after: 100 },
  });
}

// Helper: Bullet item
function bullet(text, level = 0) {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        font: "Arial",
        size: 22,
      }),
    ],
    bullet: {
      level,
    },
    spacing: { before: 60, after: 60 },
  });
}

// Helper: Numbered bullet item
function numbered(text, numId, level = 0) {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        font: "Arial",
        size: 22,
      }),
    ],
    numbering: {
      reference: numId,
      level,
    },
    spacing: { before: 60, after: 60 },
  });
}

// Helper: Code/monospace line
function code(text) {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        font: "Courier New",
        size: 18,
        color: "2E4057",
      }),
    ],
    spacing: { before: 40, after: 40 },
    indent: { left: convertInchesToTwip(0.4) },
  });
}

// Helper: Empty line
function emptyLine() {
  return new Paragraph({ text: "" });
}

// Helper: Bold label + normal text
function labeledLine(label, text) {
  return new Paragraph({
    children: [
      new TextRun({ text: label + ": ", bold: true, font: "Arial", size: 22 }),
      new TextRun({ text, font: "Arial", size: 22 }),
    ],
    spacing: { before: 80, after: 80 },
  });
}

// Helper: Section divider note
function sectionNote(text) {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        italics: true,
        font: "Arial",
        size: 20,
        color: "666666",
      }),
    ],
    spacing: { before: 160, after: 80 },
  });
}

// Page break
function pageBreak() {
  return new Paragraph({
    children: [new TextRun({ text: "", break: 1 })],
    pageBreakBefore: true,
  });
}

// ─── DOCUMENT CONTENT ────────────────────────────────────────────────────────

const children = [];

// ── TITLE PAGE ───────────────────────────────────────────────────────────────
children.push(
  new Paragraph({
    children: [new TextRun({ text: "", break: 3 })],
  }),
  new Paragraph({
    children: [
      new TextRun({
        text: "AI Sales Platform",
        bold: true,
        font: "Arial",
        size: 72,
        color: "1565C0",
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  }),
  new Paragraph({
    children: [
      new TextRun({
        text: "Employee Galaxy",
        bold: true,
        font: "Arial",
        size: 48,
        color: "1976D2",
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
  }),
  new Paragraph({
    children: [
      new TextRun({
        text: "A Comprehensive Technical Guide",
        font: "Arial",
        size: 28,
        color: "444444",
        italics: true,
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 600 },
  }),
  new Paragraph({
    children: [
      new TextRun({
        text: "────────────────────────────────────",
        font: "Arial",
        size: 24,
        color: "CCCCCC",
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
  }),
  new Paragraph({
    children: [
      new TextRun({
        text: "Pagatur Software Pvt. Ltd.",
        bold: true,
        font: "Arial",
        size: 28,
        color: "1A237E",
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 160 },
  }),
  new Paragraph({
    children: [
      new TextRun({
        text: "Developer: Bevara Dinesh Sai Manikanta",
        font: "Arial",
        size: 24,
        color: "555555",
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
  }),
  new Paragraph({
    children: [
      new TextRun({
        text: "Version 1.0  •  2026",
        font: "Arial",
        size: 22,
        color: "888888",
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 800 },
  })
);

// ── PAGE BREAK before TOC ─────────────────────────────────────────────────────
children.push(pageBreak());

// ── TABLE OF CONTENTS ─────────────────────────────────────────────────────────
children.push(
  new Paragraph({
    children: [
      new TextRun({
        text: "Table of Contents",
        bold: true,
        font: "Arial",
        size: 36,
        color: "1A237E",
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 400 },
  }),
  new TableOfContents("Table of Contents", {
    hyperlink: true,
    headingStyleRange: "1-3",
    stylesWithLevels: [
      new StyleLevel("Heading1", 1),
      new StyleLevel("Heading2", 2),
      new StyleLevel("Heading3", 3),
    ],
  })
);

// ── PAGE BREAK before Chapter 1 ───────────────────────────────────────────────
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════════════════════
// CHAPTER 1: IDEA & OVERVIEW
// ══════════════════════════════════════════════════════════════════════════════
children.push(
  h1("Chapter 1: Idea & Overview"),
  emptyLine(),

  h2("1.1 The Problem"),
  body(
    "Sales teams waste enormous amounts of time on repetitive manual tasks: finding leads, " +
    "crafting cold outreach emails, following up, and scheduling product demos. " +
    "The vast majority of cold outreach never receives a reply, leading to low conversion rates, " +
    "wasted resources, and team burnout."
  ),
  emptyLine(),
  body("Key pain points include:"),
  bullet("Manual identification and research of target companies"),
  bullet("Writing and sending individual cold outreach emails"),
  bullet("Tracking which companies showed interest"),
  bullet("Coordinating demo scheduling back and forth via email"),
  bullet("Following up with trial users before their trials expire"),
  bullet("Gathering post-trial feedback to improve the product"),
  emptyLine(),

  h2("1.2 The Solution"),
  body(
    "The AI Sales Platform is an end-to-end sales automation system purpose-built to sell " +
    "Employee Galaxy — an HR/employee management SaaS product by Pagatur Software Pvt. Ltd. " +
    "The platform automates the entire outbound sales pipeline from initial outreach through " +
    "demo scheduling, trial management, and feedback collection."
  ),
  emptyLine(),
  body("Core capabilities:"),
  bullet("Upload a list of target companies via Excel (.xlsx) or CSV file"),
  bullet("Automatically send personalized cold outreach emails at a configurable rate"),
  bullet("Detect lead interest via magic links embedded in emails"),
  bullet("Automatically send demo invitation emails to interested leads"),
  bullet("Manage demo bookings, confirmation, and meeting link distribution"),
  bullet("Track trials and send reminder emails before expiry"),
  bullet("Collect post-trial feedback with ratings and comments"),
  bullet("Full analytics dashboard showing the complete sales pipeline funnel"),
  emptyLine(),

  h2("1.3 Product Being Sold"),
  labeledLine("Product Name", "Employee Galaxy"),
  labeledLine("Product Type", "HR / Employee Management SaaS"),
  labeledLine("Company", "Pagatur Software Pvt. Ltd."),
  labeledLine("Target Customers", "Companies of all sizes — startup, small, medium, large, enterprise"),
  emptyLine(),

  h2("1.4 Automated Email Pipeline"),
  body(
    "The heart of the platform is a fully automated 6-stage email pipeline. Each stage is " +
    "triggered either by a scheduled worker, an admin action, or a lead's own click."
  ),
  emptyLine(),
  numbered("Outreach Email — Cold email sent to uploaded companies at the configured daily rate", "numList"),
  numbered("Demo Invite Email — Sent automatically when a lead clicks 'I'm Interested' in the outreach email", "numList"),
  numbered("Demo Confirmation Email — Sent after admin confirms the demo time slot and meeting link", "numList"),
  numbered("Post-Demo / Trial Email — Sent after the demo is marked completed, initiating the trial period", "numList"),
  numbered("Trial Reminder Email — Sent 3 days before the trial expires to encourage conversion", "numList"),
  numbered("Feedback Request Email — Sent when a trial ends without conversion to gather product feedback", "numList"),
  emptyLine(),

  sectionNote(
    "Each email stage uses a fully customizable HTML template editable from the admin settings panel."
  )
);

// ── PAGE BREAK before Chapter 2 ───────────────────────────────────────────────
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════════════════════
// CHAPTER 2: TECH STACK
// ══════════════════════════════════════════════════════════════════════════════
children.push(
  h1("Chapter 2: Tech Stack"),
  emptyLine(),
  body(
    "The platform uses a modern, production-grade technology stack chosen for reliability, " +
    "performance, and developer productivity."
  ),
  emptyLine(),

  h2("2.1 Backend"),
  bullet("Language: Go 1.21 — fast, statically typed, excellent for concurrent workloads"),
  bullet("Router: chi — lightweight, idiomatic HTTP router with middleware support"),
  bullet("Database Driver: pgx v5 — high-performance PostgreSQL driver for Go"),
  bullet("Cache / Queue: go-redis — Redis client for queuing outreach emails"),
  bullet("Excel Parsing: excelize — reads .xlsx files for company upload"),
  emptyLine(),

  h2("2.2 Frontend"),
  bullet("Framework: Next.js 14 — React-based framework with App Router"),
  bullet("Language: TypeScript — type-safe development across all components"),
  bullet("Styling: Tailwind CSS — utility-first CSS for rapid UI development"),
  bullet("Charts: Recharts — composable charting library for the analytics dashboard"),
  bullet("HTTP Client: Axios — promise-based client for API calls"),
  emptyLine(),

  h2("2.3 Data & Infrastructure"),
  bullet("Database: PostgreSQL 16 — relational database for all persistent data"),
  bullet("Queue: Redis 7 — in-memory data store for email job queuing"),
  bullet("Containerization: Docker + Docker Compose — consistent development and production environments"),
  emptyLine(),

  h2("2.4 Email & Integrations"),
  bullet("Email Protocol: SMTP — supports Gmail and any standard SMTP provider"),
  bullet("Email Templates: HTML — fully customizable per email type via the admin UI"),
  bullet("Calendar: Google Calendar API — optional integration for generating Meet links"),
  emptyLine(),

  h2("2.5 Technology Rationale"),
  body(
    "Go was chosen for the backend due to its excellent concurrency model (goroutines), " +
    "low memory footprint, and fast compilation. This makes it ideal for the email worker " +
    "which must handle rate-limited bulk sends reliably."
  ),
  emptyLine(),
  body(
    "Next.js with the App Router provides both server-side and client-side rendering flexibility, " +
    "making the admin dashboard fast to load and easy to navigate. Tailwind CSS enables " +
    "rapid UI development without context switching to separate stylesheets."
  ),
  emptyLine(),
  body(
    "PostgreSQL provides ACID-compliant data storage with excellent support for UUIDs, enums, " +
    "and JSON. Redis provides fast, reliable job queuing for the outreach email worker."
  )
);

// ── PAGE BREAK before Chapter 3 ───────────────────────────────────────────────
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════════════════════
// CHAPTER 3: DATABASE SCHEMA DESIGN
// ══════════════════════════════════════════════════════════════════════════════
children.push(
  h1("Chapter 3: Database Schema Design"),
  emptyLine(),
  body(
    "The database schema is designed around the lifecycle of a sales lead — from initial upload " +
    "through outreach, demo scheduling, trial management, and feedback. Seven tables capture " +
    "all necessary data."
  ),
  emptyLine(),

  h2("3.1 Table: companies"),
  body("The central table — one row per target company."),
  bullet("id — UUID, primary key"),
  bullet("name — VARCHAR, company name"),
  bullet("email — VARCHAR, unique, primary contact email"),
  bullet("contact_person — VARCHAR, name of the primary contact"),
  bullet("industry — VARCHAR, industry sector"),
  bullet("size — ENUM (startup, small, medium, large, enterprise)"),
  bullet("department — VARCHAR, target department"),
  bullet(
    "status — ENUM: uploaded → outreach_sent → interested → demo_invited → " +
    "demo_scheduled → demo_completed → trial_started → converted | churned"
  ),
  bullet("notes — TEXT, internal admin notes"),
  bullet("created_at, updated_at — TIMESTAMP WITH TIME ZONE"),
  emptyLine(),

  h2("3.2 Table: email_logs"),
  body("One row per email sent or scheduled. Enables full audit trail."),
  bullet("id — UUID, primary key"),
  bullet("company_id — UUID, foreign key to companies"),
  bullet("type — ENUM (outreach, demo_invite, demo_confirm, post_demo, trial_reminder, feedback)"),
  bullet("status — ENUM (queued, sent, failed, opened, replied)"),
  bullet("subject, body — TEXT, captured at send time"),
  bullet("to_email — VARCHAR, recipient address"),
  bullet("error_message — TEXT, populated if send fails"),
  bullet("scheduled_at — TIMESTAMP, when email was queued"),
  bullet("sent_at — TIMESTAMP, when email was actually delivered"),
  emptyLine(),

  h2("3.3 Table: email_templates"),
  body("Stores editable HTML templates for each email type."),
  bullet("id — UUID, primary key"),
  bullet("type — ENUM matching email_logs.type"),
  bullet("subject — TEXT, email subject line"),
  bullet("body — TEXT, full HTML content of the email"),
  bullet("updated_at — TIMESTAMP"),
  emptyLine(),

  h2("3.4 Table: email_configs"),
  body("Single-row configuration table for all operational settings."),
  bullet("id — UUID, primary key"),
  bullet("daily_limit — INT, maximum outreach emails per day"),
  bullet("min_interval_minutes — INT, minimum gap between sends"),
  bullet("scheduling_link — VARCHAR, e.g. Calendly link embedded in emails"),
  bullet("app_base_url — VARCHAR, base URL of the frontend (for magic links)"),
  bullet("cron_hour — INT, hour at which the outreach worker runs (0-23)"),
  bullet("smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from — SMTP credentials"),
  emptyLine(),

  h2("3.5 Table: demo_bookings"),
  body("Tracks all demo appointments."),
  bullet("id — UUID, primary key"),
  bullet("company_id — UUID, nullable FK to companies"),
  bullet("booker_name, booker_email, booker_company — VARCHAR"),
  bullet("scheduled_date — DATE"),
  bullet("time_slot — VARCHAR, e.g. '10:00 AM - 10:30 AM'"),
  bullet("status — ENUM (pending, confirmed, completed, cancelled)"),
  bullet("meeting_link — VARCHAR, Zoom/Meet URL"),
  bullet("notes — TEXT"),
  bullet("created_at, updated_at — TIMESTAMP"),
  emptyLine(),

  h2("3.6 Table: trials"),
  body("Tracks trial periods initiated after completed demos."),
  bullet("id — UUID, primary key"),
  bullet("company_id — UUID, nullable FK"),
  bullet("demo_id — UUID, nullable FK to demo_bookings"),
  bullet("booker_name, booker_email, booker_company — VARCHAR"),
  bullet("status — ENUM (active, expired, converted, cancelled)"),
  bullet("started_at — TIMESTAMP, trial start time"),
  bullet("expires_at — TIMESTAMP, trial expiry time"),
  bullet("notes — TEXT"),
  emptyLine(),

  h2("3.7 Table: feedback"),
  body("Stores post-trial feedback responses from leads."),
  bullet("id — UUID, primary key"),
  bullet("company_id — UUID, FK to companies"),
  bullet("rating — INT (1-5), satisfaction score"),
  bullet("message — TEXT, free-form feedback comment"),
  bullet("created_at — TIMESTAMP"),
  emptyLine(),

  h2("3.8 Status Flow Diagram"),
  body("The companies.status column tracks the full lifecycle of each lead:"),
  emptyLine(),
  code("uploaded"),
  code("    └─► outreach_sent"),
  code("            ├─► not_interested  (dead end)"),
  code("            └─► interested"),
  code("                    └─► demo_invited"),
  code("                            └─► demo_scheduled"),
  code("                                    └─► demo_completed"),
  code("                                            └─► trial_started"),
  code("                                                    ├─► converted  (success)"),
  code("                                                    └─► churned    (feedback sent)")
);

// ── PAGE BREAK before Chapter 4 ───────────────────────────────────────────────
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════════════════════
// CHAPTER 4: ARCHITECTURE
// ══════════════════════════════════════════════════════════════════════════════
children.push(
  h1("Chapter 4: Architecture"),
  emptyLine(),
  body(
    "The platform follows Clean Architecture principles, separating concerns across clearly " +
    "defined layers. This enables testability, maintainability, and the ability to swap " +
    "implementations (e.g., change the database) without affecting business logic."
  ),
  emptyLine(),

  h2("4.1 Architectural Layers"),
  emptyLine(),
  h3("Controller Layer"),
  body(
    "HTTP handlers using the chi router. Responsibilities: decode incoming requests, " +
    "validate inputs, call the appropriate service method, and write JSON responses."
  ),
  emptyLine(),
  h3("Service Layer"),
  body(
    "Business logic and orchestration. Responsibilities: enforce business rules, " +
    "coordinate between repositories, trigger email sends, and manage state transitions."
  ),
  emptyLine(),
  h3("Repository Layer"),
  body(
    "Data access using pgx queries. Responsibilities: execute parameterized SQL, " +
    "map rows to Go structs, and return errors to the service layer."
  ),
  emptyLine(),
  h3("Models"),
  body("Shared Go structs representing domain entities (Company, EmailLog, Demo, Trial, etc.)."),
  emptyLine(),
  h3("Helper / Utils"),
  body("Config loading from environment variables (helper/Config.go) and shared utilities like the SMTP mailer (utils/Mailer.go)."),
  emptyLine(),

  h2("4.2 API Base URL"),
  code("http://localhost:8080/api/v1"),
  emptyLine(),

  h2("4.3 Key API Endpoints"),
  emptyLine(),
  h3("Company Endpoints"),
  bullet("POST  /companies/upload — Upload Excel/CSV file of target companies"),
  bullet("GET   /companies — List all companies with optional status/size filters"),
  bullet("PATCH /companies/:id/status — Update a single company's status"),
  emptyLine(),
  h3("Email Endpoints"),
  bullet("POST  /emails/manual-outreach — Send outreach to a selection of companies"),
  bullet("POST  /emails/respond-outreach — Handle interested/not-interested response from a lead"),
  bullet("GET   /emails/templates — Retrieve all email templates"),
  bullet("PUT   /emails/templates/:type — Update a specific email template"),
  bullet("GET   /emails/config — Get current email configuration"),
  bullet("PUT   /emails/config — Update configuration including SMTP settings"),
  bullet("POST  /emails/test-smtp — Send a test email to verify SMTP credentials"),
  bullet("POST  /emails/send-demo-invite/:company_id — Admin force-send a demo invite"),
  emptyLine(),
  h3("Demo Endpoints"),
  bullet("GET  /demos — List all demo bookings"),
  bullet("POST /demos/book — Public endpoint for leads to book a demo slot"),
  bullet("POST /demos/:id/confirm — Admin confirms demo with meeting link"),
  emptyLine(),
  h3("Trial Endpoints"),
  bullet("GET /trials — List all active and past trials"),
  emptyLine(),
  h3("Analytics Endpoints"),
  bullet("GET /analytics/dashboard — Full pipeline analytics with counts at each stage"),
  emptyLine(),

  h2("4.4 Worker Architecture"),
  body("The system runs two separate processes:"),
  emptyLine(),
  h3("API Server (cmd/api/main.go)"),
  body(
    "Serves all HTTP API endpoints. Handles synchronous operations including triggered emails " +
    "(demo invite, confirmation, post-demo, reminder, feedback). Runs database migrations on startup."
  ),
  emptyLine(),
  h3("Email Worker (cmd/worker/main.go)"),
  body(
    "Consumes outreach email jobs from the Redis queue. Applies rate limiting based on the " +
    "configured daily_limit and min_interval_minutes settings. Runs as a separate process " +
    "so bulk email sending never blocks the API."
  ),
  emptyLine(),

  h2("4.5 Email Deduplication Strategy"),
  body(
    "Before queuing or sending any email, the system checks email_logs for a prior successful send " +
    "of the same type to the same company. If a successful send exists, the new send is skipped. " +
    "This prevents duplicate outreach caused by retries or operator error."
  ),
  emptyLine(),

  h2("4.6 SMTP Configuration Strategy"),
  body(
    "SMTP credentials are stored in the email_configs table, allowing the admin to configure " +
    "email settings from the UI without touching server files. Environment variables serve as " +
    "fallback values when the database fields are empty."
  )
);

// ── PAGE BREAK before Chapter 5 ───────────────────────────────────────────────
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════════════════════
// CHAPTER 5: BACKEND IMPLEMENTATION
// ══════════════════════════════════════════════════════════════════════════════
children.push(
  h1("Chapter 5: Backend Implementation"),
  emptyLine(),
  body(
    "The backend is written entirely in Go and organized into clearly separated packages. " +
    "Each package has a single well-defined responsibility."
  ),
  emptyLine(),

  h2("5.1 Directory Structure"),
  emptyLine(),
  code("backend/"),
  code("├── cmd/"),
  code("│   ├── api/"),
  code("│   │   └── main.go          — API server entry point"),
  code("│   └── worker/"),
  code("│       └── main.go          — Email worker entry point"),
  code("├── controller/"),
  code("│   ├── CompanyController.go"),
  code("│   ├── EmailController.go"),
  code("│   ├── DemoController.go"),
  code("│   ├── TrialController.go"),
  code("│   ├── InterestController.go"),
  code("│   └── AnalyticsController.go"),
  code("├── service/"),
  code("│   ├── EmailService.go      — Core SMTP sending logic"),
  code("│   ├── CompanyService.go"),
  code("│   ├── DemoService.go"),
  code("│   └── TrialService.go"),
  code("├── repository/"),
  code("│   ├── EmailRepository.go"),
  code("│   ├── CompanyRepository.go"),
  code("│   ├── DemoRepository.go"),
  code("│   └── TrialRepository.go"),
  code("├── models/"),
  code("│   ├── Email.go"),
  code("│   ├── Company.go"),
  code("│   ├── Demo.go"),
  code("│   └── Trial.go"),
  code("├── helper/"),
  code("│   └── Config.go            — AppConfig, SMTPConfig, LoadConfig()"),
  code("├── utils/"),
  code("│   ├── Mailer.go            — SMTP send utility"),
  code("│   └── Env.go               — .env file loader"),
  code("├── migrations/"),
  code("│   ├── 001_init.sql"),
  code("│   ├── 002_email_logs.sql"),
  code("│   ├── 003_templates.sql"),
  code("│   ├── 004_demos.sql"),
  code("│   ├── 005_trials.sql"),
  code("│   ├── 006_feedback.sql"),
  code("│   └── 007_smtp_config.sql"),
  code("└── main.go                  — Starts API + applies migrations"),
  emptyLine(),

  h2("5.2 Key Design Decisions"),
  emptyLine(),
  h3("SMTP Credentials in Database"),
  body(
    "Storing SMTP settings in the email_configs table rather than hardcoded environment variables " +
    "enables the admin to update credentials from the settings UI without SSH access to the server. " +
    "Environment variables remain as a fallback for initial setup."
  ),
  emptyLine(),
  h3("Triggered vs. Queued Emails"),
  body(
    "Bulk outreach emails (potentially hundreds per day) are queued to Redis and processed " +
    "by the worker at a configured rate. All other triggered emails (demo invite, confirmation, " +
    "post-demo, trial reminder, feedback) are sent synchronously via SMTP at the moment the " +
    "triggering event occurs, ensuring immediate delivery."
  ),
  emptyLine(),
  h3("Email Deduplication"),
  body(
    "The system queries email_logs before every send. If a successful send of the same type " +
    "to the same company already exists, the new send is blocked. This protects leads from " +
    "receiving duplicate emails due to retries, double-clicks, or operator mistakes."
  ),
  emptyLine(),
  h3("Magic Links for Interest Detection"),
  body(
    "Each outreach email contains two magic links: one for 'I'm Interested' and one for " +
    "'Not Interested'. These links encode the company_id as a URL parameter. When clicked, " +
    "they hit the /emails/respond-outreach endpoint which updates the company status and " +
    "triggers the next pipeline stage automatically — no manual admin intervention required."
  ),
  emptyLine(),

  h2("5.3 Email Service (service/EmailService.go)"),
  body("The EmailService is the most critical service. It handles:"),
  bullet("Loading SMTP credentials from DB with env var fallback"),
  bullet("Rendering HTML templates with dynamic fields (company name, demo link, etc.)"),
  bullet("Creating email_log records before and after each send"),
  bullet("Sending emails via net/smtp with TLS"),
  bullet("Updating company status after successful pipeline stage transitions"),
  emptyLine(),

  h2("5.4 Database Migrations"),
  body(
    "Migrations are applied in sequence on startup. Each migration file is idempotent — " +
    "it uses CREATE TABLE IF NOT EXISTS and ALTER TABLE ... ADD COLUMN IF NOT EXISTS patterns " +
    "to prevent errors on re-run."
  ),
  bullet("001_init.sql — companies table and status enum"),
  bullet("002_email_logs.sql — email_logs table"),
  bullet("003_templates.sql — email_templates table with seed data"),
  bullet("004_demos.sql — demo_bookings table"),
  bullet("005_trials.sql — trials table"),
  bullet("006_feedback.sql — feedback table"),
  bullet("007_smtp_config.sql — email_configs table with defaults")
);

// ── PAGE BREAK before Chapter 6 ───────────────────────────────────────────────
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════════════════════
// CHAPTER 6: FRONTEND IMPLEMENTATION
// ══════════════════════════════════════════════════════════════════════════════
children.push(
  h1("Chapter 6: Frontend Implementation"),
  emptyLine(),
  body(
    "The frontend is a Next.js 14 application using the App Router. It provides a full admin " +
    "dashboard for operating the sales platform, plus two public-facing pages for lead " +
    "interaction."
  ),
  emptyLine(),

  h2("6.1 Directory Structure"),
  emptyLine(),
  code("frontend/src/"),
  code("├── app/"),
  code("│   ├── page.tsx                    — Main dashboard (pipeline summary)"),
  code("│   ├── companies/"),
  code("│   │   └── page.tsx                — Company pipeline list with filters"),
  code("│   ├── emails/"),
  code("│   │   └── page.tsx                — Email logs viewer"),
  code("│   ├── demos/"),
  code("│   │   └── page.tsx                — Demo bookings management"),
  code("│   ├── trials/"),
  code("│   │   └── page.tsx                — Trial management"),
  code("│   ├── settings/"),
  code("│   │   └── page.tsx                — SMTP config + templates + outreach settings"),
  code("│   ├── analytics/"),
  code("│   │   └── page.tsx                — Charts and funnel analytics"),
  code("│   ├── interest/respond/"),
  code("│   │   └── page.tsx                — Public: lead interest response page"),
  code("│   └── demo/book/"),
  code("│       └── page.tsx                — Public: demo booking form"),
  code("├── components/"),
  code("│   └── layout/"),
  code("│       ├── Header.tsx"),
  code("│       └── Sidebar.tsx"),
  code("└── lib/"),
  code("    └── api.ts                      — Axios API client"),
  emptyLine(),

  h2("6.2 Design Theme"),
  body("The UI follows the Pagatur Software brand identity:"),
  bullet("Sidebar: deep blue gradient from #1a237e (deep indigo) to #1565c0 (medium blue)"),
  bullet("Header / AppBar: #1976d2 (standard blue)"),
  bullet("Page Background: #f0f4f8 (light blue-grey)"),
  bullet("Cards: white with drop shadow"),
  bullet("Primary Font: Inter / system-ui"),
  bullet("Accent Color: #1565c0 for buttons and interactive elements"),
  emptyLine(),

  h2("6.3 Admin Pages"),
  emptyLine(),
  h3("Dashboard (/)"),
  body(
    "Pipeline summary cards showing counts at each status. Quick-access buttons for uploading " +
    "companies and sending outreach."
  ),
  emptyLine(),
  h3("Companies (/companies)"),
  body(
    "Paginated, filterable table of all target companies. Columns: name, email, industry, size, " +
    "department, status, created date. Supports filtering by status and size. Each row has " +
    "action buttons for status update and force-sending emails."
  ),
  emptyLine(),
  h3("Emails (/emails)"),
  body(
    "Complete log of all sent and queued emails. Columns: company, type, status, subject, " +
    "recipient, sent date. Filterable by email type and status."
  ),
  emptyLine(),
  h3("Demos (/demos)"),
  body(
    "List of all demo bookings with status, scheduled date, time slot, and meeting link. " +
    "Admin can confirm pending demos and attach meeting links."
  ),
  emptyLine(),
  h3("Trials (/trials)"),
  body(
    "List of active and past trials with status, expiry date, and associated company. " +
    "Admin can manually transition trial status."
  ),
  emptyLine(),
  h3("Analytics (/analytics)"),
  body(
    "Recharts-powered visualization of the full pipeline funnel. Shows bar charts, " +
    "conversion rates between stages, and trend lines over time."
  ),
  emptyLine(),
  h3("Settings (/settings)"),
  body("Three-tab settings panel:"),
  bullet("Tab 1 — SMTP / Email: configure host, port, username, password, from address, and send a test email"),
  bullet("Tab 2 — Configuration: set daily send limit, minimum interval, scheduling link, and cron hour"),
  bullet("Tab 3 — Email Templates: edit HTML content and subject lines for all 6 email types"),
  emptyLine(),

  h2("6.4 Public-Facing Pages"),
  emptyLine(),
  h3("Interest Response (/interest/respond)"),
  body(
    "When a lead clicks 'I'm Interested' in their outreach email, they are redirected to this page. " +
    "The page reads company_id and action from URL parameters and calls the API. " +
    "On success, it displays a 5-step 'What Happens Next' timeline showing the full journey " +
    "from interest to demo to trial to conversion. This page requires no login."
  ),
  emptyLine(),
  h3("Demo Booking (/demo/book)"),
  body(
    "A clean, public-facing form where leads can select a preferred demo date and time slot, " +
    "and provide their name, email, and company. On submission, a demo_bookings record is created " +
    "and a confirmation email is queued. No login required."
  ),
  emptyLine(),

  h2("6.5 API Client (lib/api.ts)"),
  body(
    "A centralized Axios instance configured with the backend base URL. All API calls across " +
    "all pages route through this module. Provides typed helper functions for each endpoint, " +
    "including error handling and response type definitions."
  )
);

// ── PAGE BREAK before Chapter 7 ───────────────────────────────────────────────
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════════════════════
// CHAPTER 7: CONFIGURATION & DEPLOYMENT
// ══════════════════════════════════════════════════════════════════════════════
children.push(
  h1("Chapter 7: Configuration & Deployment"),
  emptyLine(),
  body(
    "The platform is designed for easy local development and straightforward production deployment " +
    "via Docker Compose."
  ),
  emptyLine(),

  h2("7.1 Environment Variables"),
  body("The following environment variables configure the backend service:"),
  emptyLine(),
  code("PORT=8080"),
  code("DATABASE_URL=postgres://user:pass@localhost:5432/aisales"),
  code("REDIS_URL=redis://:secret@localhost:6379/0"),
  code("JWT_SECRET=your-secret-key"),
  code("APP_BASE_URL=http://localhost:3000"),
  code(""),
  code("# SMTP (fallback — can be overridden from UI)"),
  code("SMTP_HOST=smtp.gmail.com"),
  code("SMTP_PORT=587"),
  code("SMTP_USER=your@gmail.com"),
  code("SMTP_PASS=your-16-character-app-password"),
  code("SMTP_FROM=Your Name <your@gmail.com>"),
  code(""),
  code("# Optional scheduling link"),
  code("SCHEDULING_LINK=https://calendly.com/your-link"),
  code(""),
  code("# Optional Google Calendar integration"),
  code("GOOGLE_SERVICE_ACCOUNT_JSON="),
  code("GOOGLE_CALENDAR_ID="),
  emptyLine(),

  h2("7.2 Gmail SMTP Setup"),
  body(
    "Gmail requires an App Password (not your regular password) for SMTP access. " +
    "Follow these steps:"
  ),
  numbered("Enable 2-Factor Authentication on your Google account at myaccount.google.com/security", "numSetup"),
  numbered("Navigate to myaccount.google.com/apppasswords", "numSetup"),
  numbered("Create a new App Password — select 'Mail' as the app type", "numSetup"),
  numbered("Copy the generated 16-character password", "numSetup"),
  numbered("Use this password as the value for SMTP_PASS", "numSetup"),
  numbered("Set SMTP_HOST=smtp.gmail.com, SMTP_PORT=587", "numSetup"),
  emptyLine(),
  sectionNote(
    "Never use your regular Gmail password. Google blocks sign-in attempts from apps using account passwords."
  ),
  emptyLine(),

  h2("7.3 Running Locally"),
  body("Prerequisites: Go 1.21+, Node.js 18+, PostgreSQL 16, Redis 7"),
  emptyLine(),
  numbered("Start PostgreSQL and Redis (or use Docker: docker-compose up postgres redis)", "numLocal"),
  numbered("Apply all migrations: run files 001 through 007 in /backend/migrations/ using psql", "numLocal"),
  numbered("Create /backend/.env with the environment variables from section 7.1", "numLocal"),
  numbered("Start the backend: cd backend && go run main.go", "numLocal"),
  numbered("Start the email worker: cd backend && go run cmd/worker/main.go", "numLocal"),
  numbered("Start the frontend: cd frontend && npm install && npm run dev", "numLocal"),
  numbered("Open http://localhost:3000 in your browser", "numLocal"),
  emptyLine(),

  h2("7.4 Docker Production Deployment"),
  body(
    "The root docker-compose.yml orchestrates all services: PostgreSQL, Redis, the Go API, " +
    "the email worker, and the Next.js frontend."
  ),
  emptyLine(),
  code("# Build and start all services"),
  code("docker-compose up --build"),
  code(""),
  code("# Start in detached mode"),
  code("docker-compose up --build -d"),
  code(""),
  code("# View logs"),
  code("docker-compose logs -f"),
  code(""),
  code("# Stop all services"),
  code("docker-compose down"),
  emptyLine(),
  body("Services defined in docker-compose.yml:"),
  bullet("postgres — PostgreSQL 16 with persistent volume"),
  bullet("redis — Redis 7 with persistence enabled"),
  bullet("api — Go backend API server (port 8080)"),
  bullet("worker — Go email worker process"),
  bullet("frontend — Next.js application (port 3000)"),
  emptyLine(),

  h2("7.5 Production Checklist"),
  bullet("Set strong JWT_SECRET (minimum 32 random characters)"),
  bullet("Use a strong Redis password in REDIS_URL"),
  bullet("Configure a production-grade SMTP provider (SendGrid, AWS SES, or Gmail)"),
  bullet("Set APP_BASE_URL to your production domain (e.g. https://sales.yourdomain.com)"),
  bullet("Set SCHEDULING_LINK to your Calendly or cal.com booking URL"),
  bullet("Configure SSL/TLS termination (nginx or Caddy as reverse proxy)"),
  bullet("Set up database backups for PostgreSQL"),
  bullet("Monitor the email worker process — restart on failure"),
  bullet("Review and customize all 6 email templates from the Settings UI before launching"),
  emptyLine(),

  h2("7.6 Monitoring & Observability"),
  body(
    "All email sends are logged in email_logs with timestamps and error messages. " +
    "The analytics dashboard at /analytics provides real-time pipeline visibility. " +
    "For production monitoring, consider adding structured logging (zap or logrus) " +
    "to the Go backend and connecting to a logging aggregator such as Datadog or Grafana Loki."
  ),
  emptyLine(),

  pageBreak(),

  // Back matter / Closing
  new Paragraph({
    children: [new TextRun({ text: "", break: 4 })],
  }),
  new Paragraph({
    children: [
      new TextRun({
        text: "AI Sales Platform — Employee Galaxy",
        bold: true,
        font: "Arial",
        size: 32,
        color: "1565C0",
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  }),
  new Paragraph({
    children: [
      new TextRun({
        text: "Built with care by Bevara Dinesh Sai Manikanta",
        font: "Arial",
        size: 24,
        color: "555555",
        italics: true,
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
  }),
  new Paragraph({
    children: [
      new TextRun({
        text: "Pagatur Software Pvt. Ltd.  •  2026",
        font: "Arial",
        size: 22,
        color: "888888",
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
  }),
  new Paragraph({
    children: [
      new TextRun({
        text: "────────────────────────────────────",
        font: "Arial",
        size: 24,
        color: "CCCCCC",
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
  }),
  new Paragraph({
    children: [
      new TextRun({
        text: "End of Document",
        font: "Arial",
        size: 20,
        color: "AAAAAA",
        italics: true,
      }),
    ],
    alignment: AlignmentType.CENTER,
  })
);

// ─── BUILD DOCUMENT ───────────────────────────────────────────────────────────

const doc = new Document({
  features: {
    updateFields: true,
  },
  numbering: {
    config: [
      {
        reference: "numList",
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: "%1.",
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: {
                indent: {
                  left: convertInchesToTwip(0.4),
                  hanging: convertInchesToTwip(0.25),
                },
              },
              run: {
                font: "Arial",
                size: 22,
              },
            },
          },
        ],
      },
      {
        reference: "numSetup",
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: "%1.",
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: {
                indent: {
                  left: convertInchesToTwip(0.4),
                  hanging: convertInchesToTwip(0.25),
                },
              },
              run: {
                font: "Arial",
                size: 22,
              },
            },
          },
        ],
      },
      {
        reference: "numLocal",
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: "%1.",
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: {
                indent: {
                  left: convertInchesToTwip(0.4),
                  hanging: convertInchesToTwip(0.25),
                },
              },
              run: {
                font: "Arial",
                size: 22,
              },
            },
          },
        ],
      },
    ],
  },
  styles: {
    default: {
      document: {
        run: {
          font: "Arial",
          size: 22,
          color: "333333",
        },
        paragraph: {
          spacing: { line: 276 },
        },
      },
    },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: {
          font: "Arial",
          size: 44,
          bold: true,
          color: "1A237E",
        },
        paragraph: {
          spacing: { before: 480, after: 240 },
          border: {
            bottom: {
              color: "1565C0",
              space: 4,
              style: "single",
              size: 8,
            },
          },
        },
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: {
          font: "Arial",
          size: 32,
          bold: true,
          color: "1565C0",
        },
        paragraph: {
          spacing: { before: 360, after: 180 },
        },
      },
      {
        id: "Heading3",
        name: "Heading 3",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: {
          font: "Arial",
          size: 26,
          bold: true,
          color: "1976D2",
        },
        paragraph: {
          spacing: { before: 240, after: 120 },
        },
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: {
            width: 12240, // 8.5 inches in DXA
            height: 15840, // 11 inches in DXA
          },
          margin: {
            top: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1.25),
          },
        },
      },
      children,
    },
  ],
});

// ─── WRITE FILE ───────────────────────────────────────────────────────────────

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("F:/AI-sales/AI_Sales_Platform_Book.docx", buffer);
  console.log("Document created successfully: F:/AI-sales/AI_Sales_Platform_Book.docx");
  const stats = fs.statSync("F:/AI-sales/AI_Sales_Platform_Book.docx");
  console.log("File size:", (stats.size / 1024).toFixed(1), "KB");
});
