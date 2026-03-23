# AWS Deployment Checklist

## 1. Networking

- Create or choose a VPC.
- Create private subnets for ECS tasks, RDS, and Redis.
- Create public subnets for the ALB.
- Create security groups:
  - ALB ingress from `80/443`
  - API ingress from ALB to `8080`
  - Frontend ingress from ALB to `3000`
  - RDS ingress from ECS tasks to `5432`
  - Redis ingress from ECS tasks to `6379`

## 2. Database And Redis

- Create PostgreSQL in RDS.
- Create Redis in ElastiCache.
- Confirm ECS tasks can connect privately.

## 3. Secrets

Create these secrets before deploying:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_API_TOKEN`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `APP_BASE_URL`
- `CORS_ALLOWED_ORIGINS`
- `PRODUCT_URL`
- `TRIAL_START_URL`
- `UPGRADE_URL`
- `FEEDBACK_URL`
- optional `GOOGLE_SERVICE_ACCOUNT_JSON`
- optional `GOOGLE_CALENDAR_ID`

## 4. ECR Images

Build and push:

- `backend-api`
- `backend-worker`
- `backend-scheduler`
- `frontend`

## 5. ECS Services

- Deploy `api` with desired count `2` or more.
- Deploy `worker` with desired count `1`.
- Deploy `scheduler` with desired count `1`.
- Deploy `frontend` with desired count `1` or more.

## 6. Load Balancer

- Route `/health` to the API target group.
- Route frontend traffic to the frontend target group.
- Attach ACM certificates for HTTPS.

## 7. Post-Deploy Smoke Test

- Open frontend domain.
- Sign in to admin.
- Call `/health`.
- Upload a sample Excel file.
- Verify one scheduler instance is active.
- Trigger a test email flow.
- Check CloudWatch logs for startup or auth errors.
