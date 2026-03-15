#!/bin/bash
# AI Sales Platform - Quick Start Script

set -e

echo "🚀 Starting AI Sales Platform..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Copying from example..."
    cp backend/.env.example .env
    echo "📝 Please edit .env with your SMTP credentials"
    echo "   Then run this script again"
    exit 1
fi

echo "📦 Building and starting services..."
docker-compose up -d --build

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

echo ""
echo "✅ AI Sales Platform is running!"
echo ""
echo "📊 Frontend Dashboard: http://localhost:3000"
echo "🔌 Backend API:        http://localhost:8080"
echo "💊 Health Check:       http://localhost:8080/health"
echo ""
echo "To stop: docker-compose down"
echo "To view logs: docker-compose logs -f"
