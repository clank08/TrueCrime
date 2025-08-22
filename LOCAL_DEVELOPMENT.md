# Local Development Setup - True Crime App

This guide provides comprehensive instructions for setting up the True Crime app for local development.

## Prerequisites

Before starting, ensure you have the following installed:

- **Node.js 20+** (https://nodejs.org/)
- **npm 10+** (comes with Node.js)
- **Docker Desktop** (https://www.docker.com/products/docker-desktop)
- **Git** (https://git-scm.com/)

## Quick Start

### Option 1: Automated Setup (Recommended)

**Windows:**
```bash
.\start-dev.bat
```

**Linux/macOS:**
```bash
chmod +x start-dev.sh
./start-dev.sh
```

### Option 2: Manual Setup

#### Step 1: Start Database Services

```bash
# Start PostgreSQL and Redis containers
docker-compose -f docker-compose.dev.yml up -d postgres redis

# Verify services are healthy
docker-compose -f docker-compose.dev.yml ps
```

#### Step 2: Setup Backend

```bash
cd TC-backend

# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

The backend will be available at: http://localhost:3000/api/trpc

#### Step 3: Setup Frontend

In a new terminal:

```bash
cd TC-frontend/TrueCrime

# Install dependencies
npm install

# Start Expo development server
npx expo start
```

Choose your platform:
- **Web**: Press `w` or visit http://localhost:8081
- **iOS Simulator**: Press `i` (requires Xcode on macOS)
- **Android Emulator**: Press `a` (requires Android Studio)
- **Physical Device**: Scan QR code with Expo Go app

## Environment Configuration

### Backend Environment (.env)

The backend environment file is located at `TC-backend/.env` and includes:

- **Database**: PostgreSQL connection to Docker container
- **Cache**: Redis connection for sessions and caching
- **Authentication**: JWT secrets and session configuration
- **CORS**: Configured for local frontend origins
- **API**: tRPC endpoint configuration

Key settings for local development:
```env
DATABASE_URL=postgresql://truecrime:truecrime@127.0.0.1:5432/truecrime_db
REDIS_URL=redis://localhost:6379
CORS_ORIGIN=http://localhost:8081,http://localhost:19006,exp://localhost:8081
NODE_ENV=development
```

### Frontend Environment (.env)

The frontend environment file is located at `TC-frontend/TrueCrime/.env` and includes:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api/trpc
EXPO_PUBLIC_DEBUG_MODE=true
EXPO_PUBLIC_MOCK_DATA=false
```

## Development Workflow

### Starting Development

1. **Start Services**: Run the automated setup script or manually start services
2. **Backend Development**: 
   - Backend runs with hot-reload at http://localhost:3000
   - API endpoints available at http://localhost:3000/api/trpc
   - Logs appear in terminal with colored output
3. **Frontend Development**:
   - Frontend accessible via Expo at http://localhost:8081 (web)
   - Hot-reload enabled for React Native components
   - Choose development platform (web/iOS/Android)

### Making Changes

- **Backend Changes**: TypeScript files auto-reload with `tsx watch`
- **Frontend Changes**: React Native components hot-reload automatically
- **Database Changes**: Create migrations with `npm run db:migrate:dev`
- **API Changes**: tRPC provides type-safe client-server communication

## Optional Services

### Meilisearch (Search Engine)

```bash
# Start Meilisearch for content search
docker-compose -f docker-compose.dev.yml --profile search up -d meilisearch

# Access at: http://localhost:7700
# API Key: masterKey_LOCAL_DEVELOPMENT_ONLY
```

### Database Management Tools

```bash
# Start pgAdmin and Redis Insight
docker-compose -f docker-compose.dev.yml --profile tools up -d

# Access tools:
# pgAdmin: http://localhost:5050 (dev@truecrime.local / dev123)
# Redis Insight: http://localhost:8001
```

## Testing

### Backend Testing

```bash
cd TC-backend

# Run all tests
npm run test

# Run specific test types
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:security

# Run tests with coverage
npm run test:coverage
```

### Frontend Testing

```bash
cd TC-frontend/TrueCrime

# Run Jest tests
npm run test

# Run with coverage
npm run test:coverage

# Run E2E tests (requires setup)
npm run e2e:test
```

## Database Operations

### Common Database Commands

```bash
cd TC-backend

# Generate Prisma client after schema changes
npm run db:generate

# Create and apply new migration
npm run db:migrate:dev

# Reset database (WARNING: destroys data)
npm run db:reset

# Open Prisma Studio
npm run db:studio
```

### Database Connection

- **Host**: localhost
- **Port**: 5432
- **Database**: truecrime_db
- **User**: truecrime
- **Password**: truecrime

## API Development

### tRPC Integration

The app uses tRPC for type-safe API communication:

- **Backend Routers**: `TC-backend/src/routers/`
- **Frontend Client**: `TC-frontend/TrueCrime/lib/trpc.ts`
- **Type Safety**: Full TypeScript integration

### Adding New API Endpoints

1. Create router in `TC-backend/src/routers/`
2. Add to main router in `TC-backend/src/routers/index.ts`
3. Frontend automatically gets type inference

## Troubleshooting

### Common Issues

#### Docker Services Won't Start

```bash
# Check Docker Desktop is running
docker --version

# Stop all containers and restart
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up -d postgres redis
```

#### Backend Connection Issues

```bash
# Check environment variables
cd TC-backend && cat .env

# Verify database connection
npm run db:generate

# Check service health
docker-compose -f docker-compose.dev.yml ps
```

#### Frontend Can't Connect to Backend

1. Verify backend is running at http://localhost:3000
2. Check CORS configuration in backend `.env`
3. Confirm frontend `.env` has correct API URL
4. Clear Expo cache: `npx expo start -c`

#### Database Migration Errors

```bash
# Reset database and re-run migrations
cd TC-backend
npm run db:reset
npm run db:migrate
```

#### Port Conflicts

If you encounter port conflicts, you can modify the ports in:
- `docker-compose.dev.yml` - for database services
- `TC-backend/.env` - for backend port (PORT=3000)
- Update CORS origins accordingly

### Debugging

#### Backend Debugging

- **Logs**: Colored logs with pino-pretty in development
- **Debug Mode**: Set `LOG_LEVEL=debug` in `.env`
- **Database Queries**: Prisma logs all queries in development

#### Frontend Debugging

- **React DevTools**: Available in web browser
- **Debug Mode**: Enabled via `EXPO_PUBLIC_DEBUG_MODE=true`
- **Network Requests**: Visible in browser/Expo developer tools

## Performance Optimization

### Development Performance

- **Hot Reload**: Both frontend and backend support hot reloading
- **TypeScript**: Incremental compilation for fast rebuilds
- **Docker**: Optimized with volume mounts for development

### Database Performance

- **Connection Pooling**: Configured via Prisma
- **Indexes**: Defined in Prisma schema
- **Query Optimization**: Use Prisma Studio to analyze queries

## Security Considerations

### Development Security

- **HTTPS**: Not required for local development
- **JWT Secrets**: Use development secrets (provided in .env)
- **CORS**: Configured for local origins only
- **Rate Limiting**: Disabled in development mode

## Next Steps

After setting up local development:

1. **Explore the Codebase**: Review existing components and API routes
2. **Run Tests**: Ensure everything is working with test suites
3. **Make Changes**: Start implementing new features
4. **Check Documentation**: Review other docs in the project

## Getting Help

If you encounter issues:

1. Check this troubleshooting guide
2. Review error logs in terminal
3. Verify all prerequisites are installed
4. Check that all services are healthy: `docker-compose -f docker-compose.dev.yml ps`

## Useful Commands Reference

```bash
# Start everything
./start-dev.sh  # or start-dev.bat on Windows

# Backend development
cd TC-backend && npm run dev

# Frontend development  
cd TC-frontend/TrueCrime && npx expo start

# Stop all services
docker-compose -f docker-compose.dev.yml down

# Database operations
cd TC-backend
npm run db:migrate:dev  # Create migration
npm run db:studio      # Open database GUI
npm run db:reset       # Reset database

# Testing
npm run test           # Run all tests
npm run test:coverage  # Run with coverage
```