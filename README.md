# AI Sales Platform

This repo is now set up for an AWS-oriented deployment flow:

- `frontend/`: Next.js admin app plus public demo, trial, interest, and payment pages
- `backend/`: Go API, scheduler, worker, migrations, and deployment Dockerfiles

## AWS Environment Variables

Backend:

- `ENVIRONMENT=production`
- `PORT=8080`
- `APP_BASE_URL=https://your-frontend-domain`
- `ADMIN_API_TOKEN=<strong-random-secret>`
- `CORS_ALLOWED_ORIGINS=https://your-frontend-domain`
- `DATABASE_URL=<RDS PostgreSQL URL>`
- `REDIS_URL=<ElastiCache Redis URL>`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_CALENDAR_ID` if Meet integration is enabled

Frontend:

- `NEXT_PUBLIC_API_URL=https://your-api-domain`
- `NEXT_PUBLIC_ADMIN_API_TOKEN=` optional for non-production convenience only

## Recommended AWS Services

- Frontend: AWS Amplify or containerized Next.js on ECS/App Runner
- Backend API: ECS Fargate or App Runner
- Worker: separate ECS/App Runner service using `backend/Dockerfile.worker`
- PostgreSQL: Amazon RDS
- Redis: Amazon ElastiCache
- Secrets: AWS Secrets Manager or SSM Parameter Store

## Admin Access

Admin API routes now require `Authorization: Bearer <ADMIN_API_TOKEN>` or `X-Admin-Token`.

Public routes that remain open:

- `POST /api/v1/emails/respond-outreach`
- `POST /api/v1/demos/book`
- `POST /api/v1/demos/public-schedule`
- `GET /api/v1/demos/slots`
- `POST /api/v1/trials/respond`
- `POST /api/v1/subscriptions`
