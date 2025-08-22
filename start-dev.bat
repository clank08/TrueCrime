@echo off
setlocal EnableDelayedExpansion

REM True Crime App - Local Development Startup Script (Windows)
REM This script starts all required services for local development

echo 🚀 Starting True Crime App Local Development Environment
echo ========================================================

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

REM Check if required files exist
if not exist "docker-compose.dev.yml" (
    echo [ERROR] docker-compose.dev.yml not found. Please run this script from the project root.
    pause
    exit /b 1
)

if not exist "TC-backend\.env" (
    echo [ERROR] Backend .env file not found. Please ensure TC-backend\.env exists.
    pause
    exit /b 1
)

if not exist "TC-frontend\TrueCrime\.env" (
    echo [ERROR] Frontend .env file not found. Please ensure TC-frontend\TrueCrime\.env exists.
    pause
    exit /b 1
)

REM Step 1: Start database services
echo [INFO] Starting database services (PostgreSQL + Redis)...
docker-compose -f docker-compose.dev.yml up -d postgres redis

REM Wait for services to be healthy
echo [INFO] Waiting for database services to be ready...
set /a timeout=60
:wait_loop
if !timeout! leq 0 (
    echo [ERROR] Database services failed to start within 60 seconds
    pause
    exit /b 1
)

docker-compose -f docker-compose.dev.yml exec -T postgres pg_isready -U truecrime -d truecrime_db >nul 2>&1
if errorlevel 1 (
    timeout /t 2 /nobreak >nul
    set /a timeout=!timeout!-2
    goto wait_loop
)

docker-compose -f docker-compose.dev.yml exec -T redis redis-cli ping >nul 2>&1
if errorlevel 1 (
    timeout /t 2 /nobreak >nul
    set /a timeout=!timeout!-2
    goto wait_loop
)

echo [SUCCESS] Database services are ready!

REM Step 2: Install backend dependencies and run migrations
echo [INFO] Setting up backend...
cd TC-backend

if not exist "node_modules" (
    echo [INFO] Installing backend dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install backend dependencies
        pause
        exit /b 1
    )
)

REM Generate Prisma client
echo [INFO] Generating Prisma client...
call npm run db:generate
if errorlevel 1 (
    echo [ERROR] Failed to generate Prisma client
    pause
    exit /b 1
)

REM Run database migrations
echo [INFO] Running database migrations...
call npm run db:migrate
if errorlevel 1 (
    echo [ERROR] Failed to run database migrations
    pause
    exit /b 1
)

cd ..

REM Step 3: Install frontend dependencies
echo [INFO] Setting up frontend...
cd TC-frontend\TrueCrime

if not exist "node_modules" (
    echo [INFO] Installing frontend dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install frontend dependencies
        pause
        exit /b 1
    )
)

cd ..\..

REM Success message
echo.
echo [SUCCESS] ✅ Local development environment is ready!
echo.
echo 🌟 Next Steps:
echo 1. Start the backend server:
echo    cd TC-backend ^&^& npm run dev
echo.
echo 2. Start the frontend app (in a new terminal):
echo    cd TC-frontend\TrueCrime ^&^& npx expo start
echo.
echo 📊 Optional Services:
echo - Meilisearch: docker-compose -f docker-compose.dev.yml --profile search up -d meilisearch
echo - Database Tools: docker-compose -f docker-compose.dev.yml --profile tools up -d
echo.
echo 🔧 Useful URLs:
echo - Backend API: http://localhost:3000/api/trpc
echo - Frontend: http://localhost:8081 (web) or scan QR code (mobile)
echo - Database (if pgAdmin started): http://localhost:5050
echo - Redis Insight (if started): http://localhost:8001
echo - Meilisearch (if started): http://localhost:7700
echo.
echo 🛑 To stop all services: docker-compose -f docker-compose.dev.yml down
echo.
pause