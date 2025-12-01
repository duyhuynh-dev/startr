# Quick Deployment Guide

## 🚀 Ready to Deploy!

Your codebase is ready for deployment. Here's a quick guide:

## Deployment Options

### Option 1: Docker Compose (Local/Self-Hosted)

1. **Set up environment variables:**
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your production values
   ```

2. **Deploy:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head
   ```

3. **Verify:**
   ```bash
   curl http://localhost:8000/healthz
   ```

### Option 2: Cloud Deployment (Recommended)

#### Backend → Fly.io / Railway / Render
1. Create account and project
2. Connect GitHub repository
3. Set environment variables
4. Deploy using Dockerfile

#### Frontend → Vercel
1. Go to https://vercel.com
2. Import GitHub repository
3. Set environment variables:
   - `NEXT_PUBLIC_API_URL` - Your backend URL
   - `NEXT_PUBLIC_WS_URL` - Your WebSocket URL
4. Deploy automatically

## Required Environment Variables

See `README.md` for complete list.

## Post-Deployment

- Verify health endpoints
- Test authentication
- Test core features
- Monitor logs

