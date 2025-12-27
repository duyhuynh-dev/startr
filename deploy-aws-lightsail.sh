#!/bin/bash
# AWS Lightsail deployment script - $5/month TOTAL!
# Same setup as Droplet, but cheaper

set -e

echo "🚀 Starting deployment to AWS Lightsail..."

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
docker-compose -f docker-compose.prod.yml up -d --build

echo "⏳ Waiting for services to be healthy..."
sleep 10

echo "🗄️  Running database migrations..."
docker-compose -f docker-compose.prod.yml exec -T backend alembic upgrade head

echo "✅ Deployment complete!"
echo ""
echo "📍 Backend API: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || hostname -I | awk '{print $1}'):8000"
echo "📍 API Docs: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || hostname -I | awk '{print $1}'):8000/api/v1/docs"
echo "📍 Health Check: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || hostname -I | awk '{print $1}'):8000/healthz"
echo ""
echo "📊 Check status: docker-compose -f docker-compose.prod.yml ps"
echo "📋 View logs: docker-compose -f docker-compose.prod.yml logs -f"







