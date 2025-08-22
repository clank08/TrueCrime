#!/bin/bash

# True Crime App - Local Development Startup Script
# This script starts all required services for local development

set -e

echo "🚀 Starting True Crime App Local Development Environment"
echo "========================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Check if required files exist
if [ ! -f "docker-compose.dev.yml" ]; then
    print_error "docker-compose.dev.yml not found. Please run this script from the project root."
    exit 1
fi

if [ ! -f "TC-backend/.env" ]; then
    print_error "Backend .env file not found. Please ensure TC-backend/.env exists."
    exit 1
fi

if [ ! -f "TC-frontend/TrueCrime/.env" ]; then
    print_error "Frontend .env file not found. Please ensure TC-frontend/TrueCrime/.env exists."
    exit 1
fi

# Step 1: Start database services
print_status "Starting database services (PostgreSQL + Redis)..."
docker-compose -f docker-compose.dev.yml up -d postgres redis

# Wait for services to be healthy
print_status "Waiting for database services to be ready..."
timeout=60
while [ $timeout -gt 0 ]; do
    if docker-compose -f docker-compose.dev.yml exec -T postgres pg_isready -U truecrime -d truecrime_db > /dev/null 2>&1 && \
       docker-compose -f docker-compose.dev.yml exec -T redis redis-cli ping > /dev/null 2>&1; then
        break
    fi
    sleep 2
    timeout=$((timeout - 2))
done

if [ $timeout -le 0 ]; then
    print_error "Database services failed to start within 60 seconds"
    exit 1
fi

print_success "Database services are ready!"

# Step 2: Install backend dependencies and run migrations
print_status "Setting up backend..."
cd TC-backend

if [ ! -d "node_modules" ]; then
    print_status "Installing backend dependencies..."
    npm install
fi

# Generate Prisma client
print_status "Generating Prisma client..."
npm run db:generate

# Run database migrations
print_status "Running database migrations..."
npm run db:migrate

cd ..

# Step 3: Install frontend dependencies
print_status "Setting up frontend..."
cd TC-frontend/TrueCrime

if [ ! -d "node_modules" ]; then
    print_status "Installing frontend dependencies..."
    npm install
fi

cd ../..

# Success message
print_success "✅ Local development environment is ready!"
echo ""
echo "🌟 Next Steps:"
echo "1. Start the backend server:"
echo "   cd TC-backend && npm run dev"
echo ""
echo "2. Start the frontend app (in a new terminal):"
echo "   cd TC-frontend/TrueCrime && npx expo start"
echo ""
echo "📊 Optional Services:"
echo "- Meilisearch: docker-compose -f docker-compose.dev.yml --profile search up -d meilisearch"
echo "- Database Tools: docker-compose -f docker-compose.dev.yml --profile tools up -d"
echo ""
echo "🔧 Useful URLs:"
echo "- Backend API: http://localhost:3000/api/trpc"
echo "- Frontend: http://localhost:8081 (web) or scan QR code (mobile)"
echo "- Database (if pgAdmin started): http://localhost:5050"
echo "- Redis Insight (if started): http://localhost:8001"
echo "- Meilisearch (if started): http://localhost:7700"
echo ""
echo "🛑 To stop all services: docker-compose -f docker-compose.dev.yml down"