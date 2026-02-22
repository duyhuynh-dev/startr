#!/bin/bash
# AWS EC2 deployment script
# Same setup - everything runs in Docker on one EC2 instance

set -e

echo "🚀 Starting deployment to AWS EC2..."

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

# Get public IP
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || hostname -I | awk '{print $1}')

echo "✅ Deployment complete!"
echo ""
echo "📍 Backend API: http://${PUBLIC_IP}:8000"
echo "📍 API Docs: http://${PUBLIC_IP}:8000/api/docs"
echo "📍 Health Check: http://${PUBLIC_IP}:8000/healthz"
echo ""
echo "📊 Check status: docker-compose -f docker-compose.prod.yml ps"
echo "📋 View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo ""
echo "⚠️  Make sure Security Group allows inbound traffic on ports 80, 443, 8000!"
echo ""
echo "🔒 To set up HTTPS with Let's Encrypt:"
echo "   1. First set up DuckDNS: ./setup-duckdns.sh"
echo "   2. Then set up HTTPS:   ./setup-https.sh"

