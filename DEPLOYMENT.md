# Deployment Guide

This guide covers deploying the VC × Startup Matching Platform using Docker.

## Prerequisites

- Docker 20.10+ and Docker Compose 2.0+
- Environment variables configured (see `.env.example`)

## Quick Start

### Production Deployment

1. **Set up environment variables:**

   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your production values
   ```

2. **Build and start services:**

   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

3. **Run database migrations:**

   ```bash
   docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head
   ```

4. **Verify services are running:**

   ```bash
   docker-compose -f docker-compose.prod.yml ps
   ```

5. **Check health:**

   - Backend: http://localhost:8000/health
   - API Docs: http://localhost:8000/api/v1/docs

## Configuration

### Environment Variables

Key environment variables for production:

```bash
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=vc_matcher

# Redis
REDIS_PASSWORD=<strong-password>

# Security
SECRET_KEY=<generate-strong-secret-key>

# MinIO/S3 Storage
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=<strong-password>

# Optional: ML Features
ML_ENABLED=true

# Optional: OAuth (if configured)
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### Service Ports

- **Backend API**: 8000 (configurable via `BACKEND_PORT`)
- **PostgreSQL**: 5432 (internal only in production)
- **Redis**: 6379 (internal only in production)
- **MinIO API**: 9000 (internal only)
- **MinIO Console**: 9001 (internal only)

### Volumes

Persistent data is stored in Docker volumes:

- `postgres-data`: Database files
- `redis-data`: Redis persistence
- `minio-data`: File storage

## Production Considerations

### Security

1. **Use strong passwords** for all services
2. **Change default credentials** (especially MinIO)
3. **Use environment variables** for secrets (not hardcoded)
4. **Enable HTTPS** in production (use reverse proxy like nginx)
5. **Restrict network access** (only expose necessary ports)

### Scaling

- **Backend**: Scale horizontally with multiple backend containers behind a load balancer
- **Database**: Consider managed PostgreSQL for production
- **Redis**: Consider managed Redis service for production
- **Storage**: Use AWS S3 or managed object storage for production

### Monitoring

- Monitor container health: `docker-compose ps`
- Check logs: `docker-compose logs -f backend`
- Set up health check monitoring
- Configure log aggregation (e.g., ELK stack)

### Backup

- **Database**: Regular PostgreSQL backups
- **Redis**: Periodic snapshots (if critical data)
- **Storage**: MinIO/S3 backups or replication

## Development vs Production

### Development (`docker-compose.dev.yml`)

- Exposes all ports for local access
- Uses default/test credentials
- Includes development tools
- No production optimizations

### Production (`docker-compose.prod.yml`)

- Internal networking only
- Requires secure passwords
- Multi-stage Docker builds
- Health checks enabled
- Non-root user execution

## Troubleshooting

### Services won't start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Check service status
docker-compose -f docker-compose.prod.yml ps

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

### Database connection issues

- Verify `DATABASE_URL` in environment
- Check PostgreSQL is healthy: `docker-compose ps postgres`
- Test connection: `docker-compose exec postgres psql -U postgres -d vc_matcher`

### Migration issues

```bash
# Reset database (WARNING: destroys data)
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d postgres
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

## Next Steps

- Set up reverse proxy (nginx/traefik) for HTTPS
- Configure SSL certificates
- Set up monitoring and alerting
- Configure backup automation
- Set up CI/CD for automated deployments

