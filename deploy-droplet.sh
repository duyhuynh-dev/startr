#!/bin/bash
# Minimal cost deployment script for DigitalOcean Droplet
# Total cost: ~$6-12/month for everything!

set -e

echo "🚀 Starting deployment to DigitalOcean Droplet..."

# Check if .env exists
if [ ! -f "backend/.env" ]; then
    echo "❌ Error: backend/.env file not found!"
    echo "📝 Copy backend/.env.example to backend/.env and fill in values"
    exit 1
fi

# Load environment variables
set -a
source backend/.env
set +a

echo "📦 Building and starting services..."
docker-compose -f docker-compose.droplet.yml up -d --build

echo "⏳ Waiting for services to be healthy..."
sleep 10

echo "🗄️  Running database migrations..."
docker-compose -f docker-compose.droplet.yml exec -T backend alembic upgrade head

echo "✅ Deployment complete!"
echo ""
echo "📍 Backend API: http://$(hostname -I | awk '{print $1}'):8000"
echo "📍 API Docs: http://$(hostname -I | awk '{print $1}'):8000/api/v1/docs"
echo "📍 Health Check: http://$(hostname -I | awk '{print $1}'):8000/healthz"
echo ""
echo "📊 Check status: docker-compose -f docker-compose.droplet.yml ps"
echo "📋 View logs: docker-compose -f docker-compose.droplet.yml logs -f"







