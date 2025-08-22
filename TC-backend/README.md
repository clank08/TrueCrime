# True Crime Backend

Production-ready backend service for the True Crime tracking application, built with Node.js, Fastify, tRPC, and TypeScript.

## Quick Start

### Local Development

1. **Clone and setup environment:**
```bash
cd TC-backend
cp .env.example .env
# Edit .env with your configuration
```

2. **Start all services with Docker Compose:**
```bash
docker-compose up --build
```

This starts:
- Backend API (http://localhost:3000)
- PostgreSQL database (localhost:5432)
- Redis cache (localhost:6379)
- Meilisearch (http://localhost:7700)
- Temporal workflow engine (http://localhost:7233)
- Temporal UI (http://localhost:8080)

3. **Start with development tools:**
```bash
docker-compose --profile tools up --build
```

Additional tools:
- pgAdmin (http://localhost:5050)
- RedisInsight (http://localhost:8001)
- Mailhog (http://localhost:8025)

### Production Deployment

1. **Build production image:**
```bash
docker build --target production -t truecrime-backend:latest \
  --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  --build-arg VCS_REF=$(git rev-parse --short HEAD) \
  --build-arg VERSION=$(npm version --json | jq -r '.version') .
```

2. **Run with production compose:**
```bash
docker-compose -f docker-compose.production.yml up -d
```

3. **With monitoring stack:**
```bash
docker-compose -f docker-compose.production.yml --profile monitoring up -d
```

## Architecture

### Services

| Service | Port | Description |
|---------|------|-------------|
| Backend API | 3000 | Fastify + tRPC API server |
| PostgreSQL | 5432 | Primary database (Supabase) |
| Redis | 6379 | Caching and sessions |
| Meilisearch | 7700 | Full-text search engine |
| Temporal | 7233 | Workflow orchestration |
| Temporal UI | 8080 | Workflow management interface |

### Technology Stack

- **Runtime:** Node.js 20 LTS
- **Framework:** Fastify + tRPC
- **Language:** TypeScript (strict mode)
- **Database:** PostgreSQL with Supabase
- **Cache:** Redis
- **Search:** Meilisearch
- **Workflows:** Temporal
- **Authentication:** Supabase Auth

## Development

### Without Docker

```bash
# Install dependencies
npm install

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### Database Management

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Open Prisma Studio
npm run db:studio

# Reset database
npm run db:reset
```

### Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Code Quality

```bash
# Linting
npm run lint

# Type checking
npm run type-check

# Format code
npm run format
```

## Environment Variables

Key configuration variables (see `.env.example` for full list):

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | Environment (development/production) |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |
| `JWT_SECRET` | JWT signing secret |
| `TEMPORAL_URL` | Temporal server address |
| `MEILISEARCH_URL` | Meilisearch server URL |

## API Documentation

### Health Check
```bash
curl http://localhost:3000/health
```

### tRPC Endpoints
The API uses tRPC for type-safe communication. Key routers:

#### Authentication (`/api/trpc/auth.*`)
- `auth.register` - Register new user account
- `auth.login` - Login with email/password
- `auth.logout` - Logout current user
- `auth.me` - Get current user profile
- `auth.refresh` - Refresh access token
- `auth.requestPasswordReset` - Request password reset email
- `auth.confirmPasswordReset` - Reset password with token
- `auth.verifyEmail` - Verify email address
- `auth.resendVerification` - Resend verification email
- `auth.sessions` - List user sessions
- `auth.revokeSession` - Revoke specific session

#### Future Routers (To be implemented)
- `/api/trpc/content.*` - Content discovery and tracking
- `/api/trpc/user.*` - User management
- `/api/trpc/social.*` - Social features

### Authentication Examples

#### Register a new user
```typescript
const result = await trpc.auth.register.mutate({
  email: 'user@example.com',
  password: 'SecurePassword123!',
  firstName: 'John',
  lastName: 'Doe'
});
```

#### Login
```typescript
const result = await trpc.auth.login.mutate({
  email: 'user@example.com',
  password: 'SecurePassword123!',
  rememberMe: true
});
```

#### Get current user
```typescript
const user = await trpc.auth.me.query();
```

## Docker Commands

### Development
```bash
# Start all services
docker-compose up --build

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Production
```bash
# Build production image
docker build --target production -t truecrime-backend:prod .

# Run production container
docker run -d \
  --name truecrime-backend \
  -p 3000:3000 \
  --env-file .env.production \
  truecrime-backend:prod

# Health check
docker exec truecrime-backend curl -f http://localhost:3000/health
```

## Monitoring

Production deployment includes:
- **Prometheus:** Metrics collection (http://localhost:9090)
- **Grafana:** Metrics visualization (http://localhost:3001)
- **Loki:** Log aggregation (http://localhost:3100)
- **Promtail:** Log shipping

Access Grafana dashboards at http://localhost:3001 (admin/admin).

## Security

- Non-root container user
- Alpine Linux base for minimal attack surface
- Health checks and proper signal handling
- Environment-based configuration
- Row-level security with Supabase

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs backend

# Verify environment variables
docker-compose config

# Check health status
docker-compose ps
```

### Database connection issues
```bash
# Test database connection
docker-compose exec backend npm run db:test

# Reset database
docker-compose down -v
docker-compose up --build
```

### Port conflicts
```bash
# Check port usage
netstat -an | grep 3000

# Use different ports in .env
PORT=3001
```

## License

Proprietary - True Crime App

## Support

For issues or questions, contact the development team.