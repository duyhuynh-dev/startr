# Deployment Checklist

## Pre-Deployment Verification

### ✅ Code Quality

- [x] Code is maintainable and readable
- [x] Configuration externalized (no hard-coded values)
- [x] Constants extracted to shared files
- [x] Error handling consistent
- [x] CORS configured properly

### ✅ Security

- [x] No secrets in codebase
- [x] `.env` files in `.gitignore`
- [x] Security headers configured
- [x] Input sanitization in place

### ✅ Documentation

- [x] README.md with deployment instructions
- [x] PROJECT_TODO.md for planning
- [x] All redundant files removed

## Deployment Steps

### 1. Verify Current Status

```bash
git status
git log --oneline -5
```

### 2. Commit Any Remaining Changes (if needed)

```bash
git add .
git commit -m "Final deployment preparation: market autocomplete and code quality improvements"
```

### 3. Push to Repository

```bash
git push origin main
```

### 4. Production Deployment Options

#### Option A: Docker Compose (Self-Hosted)

```bash
# Set up environment variables
cp backend/.env.example backend/.env
# Edit backend/.env with production values

# Build and start services
docker-compose -f docker-compose.prod.yml up -d --build

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head

# Verify
docker-compose -f docker-compose.prod.yml ps
curl http://localhost:8000/healthz
```

#### Option B: Cloud Deployment (Recommended)

**Backend:**

- Fly.io, Railway, or Render
- Set environment variables in platform dashboard
- Connect to managed PostgreSQL and Redis
- Deploy using Dockerfile

**Frontend:**

- Vercel (recommended for Next.js)
- Connect GitHub repository
- Set environment variables:
  - `NEXT_PUBLIC_API_URL` - Your backend URL
  - `NEXT_PUBLIC_WS_URL` - Your WebSocket URL
- Auto-deploys on push to main

### 5. Post-Deployment Verification

- [ ] Backend health check: `/healthz`
- [ ] Frontend loads correctly
- [ ] API endpoints respond
- [ ] Database migrations applied
- [ ] Redis connection working
- [ ] Environment variables set correctly

## Required Environment Variables

### Backend (.env)

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/vc_matcher
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=vc_matcher

# Redis
REDIS_URL=redis://:password@host:6379/0
REDIS_PASSWORD=<strong-password>

# Security
SECRET_KEY=<generate-strong-secret-key>
CORS_ORIGINS=["https://yourdomain.com"]

# Frontend URL
FRONTEND_URL=https://yourdomain.com

# Optional: ML
ML_ENABLED=false  # Set to true if you have ML dependencies

# Optional: Storage (MinIO or S3)
STORAGE_TYPE=s3  # or "minio"
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...
AWS_REGION=us-east-1
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=https://your-backend-api.com/api/v1
NEXT_PUBLIC_WS_URL=wss://your-backend-api.com/api/v1/realtime/ws
```

## Next Steps After Deployment

1. Configure reverse proxy (nginx/traefik) for HTTPS
2. Set up SSL certificates (Let's Encrypt)
3. Configure domain DNS
4. Set up monitoring and logging
5. Configure backup strategy
6. Set up CI/CD pipeline
