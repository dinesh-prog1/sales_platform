# ECS Fargate Deployment

This folder contains starter templates for deploying the app to AWS ECS Fargate.

## Services

- `api`: Go backend HTTP service
- `worker`: background email worker
- `scheduler`: timed job runner
- `frontend`: Next.js frontend container

## Expected AWS Resources

- 1 ECR repository per image, or a shared repo with separate tags
- 1 ECS cluster
- 4 ECS services
- 1 Application Load Balancer for `api` and optionally `frontend`
- 1 RDS PostgreSQL instance
- 1 ElastiCache Redis instance
- 1 CloudWatch log group per service
- Secrets in AWS Secrets Manager or SSM Parameter Store

## Recommended Runtime Shape

- `api`: desired count `2+`
- `worker`: desired count `1+`
- `scheduler`: desired count `1`
- `frontend`: desired count `1+`

The scheduler also uses a PostgreSQL advisory lock, but it should still be configured as a single-task service.

## Files

- `taskdef-api.json`
- `taskdef-worker.json`
- `taskdef-scheduler.json`
- `taskdef-frontend.json`
- `env.example.json`
- `deploy-checklist.md`

## How To Use

1. Copy each task definition and replace placeholders like:
   - `<AWS_ACCOUNT_ID>`
   - `<AWS_REGION>`
   - `<ECR_REPOSITORY>`
   - `<IMAGE_TAG>`
   - `<SUBNET_ID_1>`
   - `<SECURITY_GROUP_ID>`
   - secret ARNs
2. Create CloudWatch log groups referenced by the task definitions.
3. Push images to ECR.
4. Register the task definitions with ECS.
5. Create ECS services using the matching task definitions.
6. Attach the `api` and `frontend` services to an ALB target group.

## Notes

- The `api` container exposes port `8080`.
- The `frontend` container exposes port `3000`.
- `worker` and `scheduler` do not need a load balancer.
- The backend applies migrations on startup, so keep startup ordering and IAM/network access in mind.
