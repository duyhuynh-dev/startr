# Docker Deployment Guide

## Building the Backend Image

```bash
cd backend
docker build -t vc-matcher-backend:latest .
```

## Running Locally

```bash
# Build and run
docker-compose -f docker-compose.dev.yml up -d

# Run migrations
docker-compose -f docker-compose.dev.yml exec backend alembic upgrade head

# View logs
docker-compose -f docker-compose.dev.yml logs -f backend
```

## Production Deployment

See [DEPLOYMENT.md](../DEPLOYMENT.md) for complete production deployment guide.

## Dockerfile Details

The backend Dockerfile uses a multi-stage build:

1. **Builder stage**: Installs dependencies
2. **Runtime stage**: Minimal image with only runtime dependencies

This results in a smaller production image (~200MB vs ~1GB+).

## Health Checks

The backend includes a health check endpoint at `/health` that:
- Returns 200 if service is healthy
- Can be used by Docker/orchestration tools
- Checks database connectivity

