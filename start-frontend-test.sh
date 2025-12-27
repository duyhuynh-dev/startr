#!/bin/bash
# Quick Start Script for Frontend Testing

echo "🚀 Starting Frontend Testing Setup..."
echo ""

# Check if backend is running
echo "1. Checking backend..."
if curl -s http://localhost:8000/api/v1/healthz > /dev/null 2>&1; then
    echo "   ✅ Backend is running on port 8000"
else
    echo "   ❌ Backend is NOT running"
    echo "   → Start it with: cd backend && uvicorn app.main:app --reload --port 8000"
    echo ""
fi

# Check if Docker services are running
echo "2. Checking Docker services..."
if docker-compose -f docker-compose.dev.yml ps 2>/dev/null | grep -q "Up"; then
    echo "   ✅ Docker services are running"
else
    echo "   ❌ Docker services are NOT running"
    echo "   → Start them with: docker-compose -f docker-compose.dev.yml up -d"
    echo ""
fi

# Check frontend dependencies
echo "3. Checking frontend dependencies..."
cd frontend
if [ -d "node_modules" ]; then
    echo "   ✅ node_modules exists"
else
    echo "   ❌ node_modules not found"
    echo "   → Installing dependencies..."
    npm install
fi

# Check .env.local
echo "4. Checking frontend environment..."
if [ -f ".env.local" ]; then
    echo "   ✅ .env.local exists"
    cat .env.local
else
    echo "   ⚠️  .env.local not found, creating..."
    echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" > .env.local
    echo "   ✅ Created .env.local"
fi

echo ""
echo "🎯 Ready to start frontend!"
echo ""
echo "Next steps:"
echo "1. Make sure backend is running: cd backend && uvicorn app.main:app --reload --port 8000"
echo "2. Start frontend: cd frontend && npm run dev"
echo "3. Open browser: http://localhost:3000"
echo ""
echo "📖 See TESTING_GUIDE.md for detailed testing steps"







