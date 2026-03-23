# AI Sales Platform

This repo is now set up for an AWS-oriented deployment flow:

- `frontend/`: Next.js admin app plus public demo, trial, interest, and payment pages
- `backend/`: Go API, scheduler, worker, migrations, and deployment Dockerfiles

## AWS Environment Variables

Backend:

- `RUNTIME_ROLE=api` for the API service, `worker` for the mail worker, `scheduler` for timed jobs
- `ENVIRONMENT=production`
- `PORT=8080`
- `APP_BASE_URL=https://your-frontend-domain`
- `PRODUCT_URL`, `TRIAL_START_URL`, `UPGRADE_URL`, `FEEDBACK_URL` for links used in outbound emails
- `ADMIN_EMAIL=admin@your-domain`
- `ADMIN_PASSWORD=<strong-random-password>`
- `JWT_SECRET=<strong-random-secret>`
- `ADMIN_API_TOKEN=<strong-random-secret>`
- `CORS_ALLOWED_ORIGINS=https://your-frontend-domain`
- `DATABASE_URL=<RDS PostgreSQL URL>`
- `REDIS_URL=<ElastiCache Redis URL>`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_CALENDAR_ID` if Meet integration is enabled

Frontend:

- `NEXT_PUBLIC_API_URL=https://your-api-domain`

## Recommended AWS Services

- Frontend: AWS Amplify or containerized Next.js on ECS/App Runner
- Backend API: ECS Fargate or App Runner
- Worker: separate ECS/App Runner service using `backend/Dockerfile.worker`
- Scheduler: separate ECS/App Runner service using `backend/Dockerfile.scheduler`
- PostgreSQL: Amazon RDS
- Redis: Amazon ElastiCache
- Secrets: AWS Secrets Manager or SSM Parameter Store

## Recommended Runtime Split

- Run the API with `RUNTIME_ROLE=api` and scale it horizontally as needed.
- Run exactly one scheduler task with `RUNTIME_ROLE=scheduler`. The scheduler now also takes a PostgreSQL advisory lock so only one active scheduler can run timed jobs at once.
- Run one or more worker tasks with `RUNTIME_ROLE=worker` depending on email throughput.

## Admin Access

Admin API routes accept either a JWT from `/api/v1/auth/login` or `X-Admin-Token: <ADMIN_API_TOKEN>`.

Public routes that remain open:

- `POST /api/v1/emails/respond-outreach`
- `POST /api/v1/demos/book`
- `POST /api/v1/demos/public-schedule`
- `GET /api/v1/demos/slots`
- `POST /api/v1/trials/respond`
- `POST /api/v1/subscriptions`
