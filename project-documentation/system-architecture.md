# True Crime Tracking App - System Architecture

## Executive Summary

### Project Overview
The True Crime Tracking App consolidates content from 200+ streaming services and cable networks, enabling users to track watched content and discover new material related to specific cases and perpetrators. This architecture document provides comprehensive technical specifications for implementing a scalable, type-safe, and performant cross-platform application.

### Key Architectural Decisions
- **Type Safety**: End-to-end TypeScript with tRPC for compile-time API contracts
- **Cross-Platform**: Expo React Native for mobile, Remix for web, shared business logic
- **Real-Time**: Supabase for authentication, database with RLS, and real-time subscriptions
- **Search**: Meilisearch for sub-100ms content discovery across 100K+ items
- **Reliability**: Temporal workflows for robust external API integration
- **Performance**: Multi-layer caching (client, CDN, API, database) with aggressive optimization

### Technology Stack Summary
- **Frontend**: Expo React Native (mobile), Remix v2 (web), NativeWind/Tailwind CSS
- **Backend**: Node.js 20 + Fastify + tRPC, Supabase PostgreSQL with RLS
- **Infrastructure**: Vercel (web), EAS (mobile), Temporal Cloud (workflows)
- **Search**: Meilisearch Cloud with faceted search and typo tolerance
- **External APIs**: Watchmode (primary), TMDB (metadata), Gracenote (cable)

### System Component Overview
1. **Client Applications**: Type-safe mobile and web apps with offline support
2. **API Gateway**: Fastify + tRPC providing validated, type-safe endpoints
3. **Authentication**: Supabase Auth with JWT and row-level security
4. **Search Engine**: Meilisearch for instant content discovery
5. **Workflow Engine**: Temporal for reliable API synchronization
6. **Data Layer**: PostgreSQL with Redis caching and external API integration

### Critical Technical Constraints
- Watchmode API rate limit: 1000 requests/day (free tier)
- Search index limit: 100K documents (Meilisearch starter)
- Mobile app stores require consistent user experience
- External API failures must not block core functionality
- GDPR compliance required for user data handling

## 1. SYSTEM ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   iOS App       │  │   Android App   │  │   Web App       │  │
│  │ (Expo/RN 0.73)  │  │ (Expo/RN 0.73)  │  │  (Remix v2)     │  │
│  │ - NativeWind    │  │ - NativeWind    │  │ - Tailwind CSS  │  │
│  │ - Expo Router   │  │ - Expo Router   │  │ - Remix Auth    │  │
│  │ - Tanstack Q v5 │  │ - Tanstack Q v5 │  │ - Tanstack Q v5 │  │
│  │ - Zustand       │  │ - Zustand       │  │ - Zustand       │  │
│  │ - tRPC Client   │  │ - tRPC Client   │  │ - tRPC Client   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTPS/WSS (tRPC + Supabase Realtime)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │           Fastify Server + tRPC Router                      │ │
│  │  - Type-safe API contracts                                  │ │
│  │  - Rate Limiting (built-in)                                 │ │
│  │  - Schema validation                                        │ │
│  │  - WebSocket support                                        │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              Supabase Auth Gateway                          │ │
│  │  - JWT verification                                         │ │
│  │  - Row-level security                                       │ │
│  │  - OAuth providers                                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │           Node.js + Fastify + tRPC Services                │ │
│  │                    (TypeScript)                             │ │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │ │
│  │  │ Auth Router   │  │ Content Router│  │ User Router   │   │ │
│  │  │ - Supabase    │  │ - Search      │  │ - Profiles    │   │ │
│  │  │ - Sessions    │  │ - Discovery   │  │ - Preferences │   │ │
│  │  │ - Permissions │  │ - Tracking    │  │ - Social      │   │ │
│  │  └───────────────┘  └───────────────┘  └───────────────┘   │ │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │ │
│  │  │Platform Router│  │Notification   │  │Analytics      │   │ │
│  │  │ - Aggregators │  │Router         │  │Router         │   │ │
│  │  │ - Deep links  │  │ - Push/Email  │  │ - Events      │   │ │
│  │  │ - Availability│  │ - Preferences │  │ - Insights    │   │ │
│  │  └───────────────┘  └───────────────┘  └───────────────┘   │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Supabase      │  │  Meilisearch    │  │     Redis       │  │
│  │   PostgreSQL    │  │  Search Engine  │  │     Cache       │  │
│  │  - User data    │  │ - Content index │  │ - Sessions      │  │
│  │  - Tracking     │  │ - Case facets   │  │ - API cache     │  │
│  │  - Social       │  │ - Typo tolerant │  │ - Rate limits   │  │
│  │  - RLS policies │  │ - <100ms search │  │                 │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   WORKFLOW ORCHESTRATION                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Temporal Cloud                           │ │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │ │
│  │  │ Content Sync  │  │ Notification  │  │ Data Pipeline │   │ │
│  │  │ Workflow      │  │ Workflow      │  │ Workflow      │   │ │
│  │  │ - API polling │  │ - Scheduling  │  │ - Enrichment  │   │ │
│  │  │ - Retry logic │  │ - Batching    │  │ - Validation  │   │ │
│  │  │ - Fallbacks   │  │ - Delivery    │  │ - Migration   │   │ │
│  │  └───────────────┘  └───────────────┘  └───────────────┘   │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   EXTERNAL INTEGRATIONS                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Watchmode     │  │      TMDB       │  │   Gracenote     │  │
│  │   API (Primary) │  │   API (Meta)    │  │  API (Cable)    │  │
│  │ - Availability  │  │ - Metadata      │  │ - TV Listings   │  │
│  │ - 200+ platforms│  │ - Images        │  │ - Schedules     │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Reelgood      │  │   JustWatch     │  │     Resend      │  │
│  │  API (Backup)   │  │ API (Intl Data) │  │  (Email API)    │  │
│  │ - Validation    │  │ - Regional      │  │ - Transactional │  │
│  │ - Deep links    │  │ - Availability  │  │ - Templates     │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 2. DETAILED COMPONENT SPECIFICATIONS

### 2.1 Frontend Applications

#### Mobile Apps (iOS/Android)
**Purpose**: Native mobile experience with offline support
**Technology Stack**:
- Expo React Native 0.73+ with TypeScript
- NativeWind for styling (Tailwind CSS)
- Expo Router for file-based navigation
- Tanstack Query v5 for data fetching/caching
- Zustand for local state management
- tRPC client for type-safe API calls

**Key Features**:
- Offline-first architecture with Tanstack Query persistence
- Push notifications via Expo Push
- Deep linking to streaming platforms
- Biometric authentication support

#### Web Application
**Purpose**: Progressive web app with SSR
**Technology Stack**:
- Remix v2 for nested routing and data loading
- Tailwind CSS for styling
- Remix Auth for authentication
- Tanstack Query v5 for client-side caching
- tRPC client for API communication

**Key Features**:
- Server-side rendering for SEO
- Progressive enhancement
- Parallel data loading on routes
- Web push notifications

### 2.2 Backend Services

#### API Gateway (Fastify + tRPC)
**Purpose**: Type-safe API with built-in validation
**Technology Stack**:
- Node.js 20 LTS
- Fastify for high-performance HTTP
- tRPC for end-to-end type safety
- Zod for schema validation

**Interfaces**:
```typescript
// Example tRPC router
export const contentRouter = router({
  search: publicProcedure
    .input(z.object({
      query: z.string(),
      platforms: z.array(z.string()).optional()
    }))
    .query(async ({ input }) => {
      return meilisearch.search(input.query);
    }),
    
  track: protectedProcedure
    .input(z.object({
      contentId: z.string(),
      status: z.enum(['watching', 'completed', 'planned'])
    }))
    .mutation(async ({ input, ctx }) => {
      return supabase.from('tracking')
        .insert({ ...input, userId: ctx.user.id });
    })
});
```

#### Authentication Service
**Purpose**: Secure user authentication and authorization
**Technology Stack**:
- Supabase Auth for authentication
- JWT tokens with refresh strategy
- Row-level security policies

**Key Features**:
- Social OAuth (Google, Apple, Facebook)
- Email/password authentication
- Magic link support
- Session management

### 2.3 Data Architecture

#### Primary Database (Supabase PostgreSQL)
**Purpose**: Core relational data storage with RLS
**Schema Design**:

```sql
-- Users table with RLS
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  preferences JSONB DEFAULT '{}'::jsonb
);

-- Content tracking with RLS
CREATE TABLE tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL,
  status TEXT CHECK (status IN ('watching', 'completed', 'planned')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, content_id)
);

-- Enable RLS
ALTER TABLE tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can only see their own tracking"
  ON tracking FOR ALL
  USING (auth.uid() = user_id);
```

#### Search Engine (Meilisearch)
**Purpose**: Lightning-fast content discovery
**Configuration**:
- 100K+ documents indexed
- Faceted search by platform, case, year
- Typo tolerance for True Crime names
- <100ms response time

**Index Structure**:
```json
{
  "id": "content_12345",
  "title": "The Ted Bundy Tapes",
  "type": "documentary",
  "platforms": ["netflix", "hulu"],
  "cases": ["ted_bundy"],
  "year": 2019,
  "description": "...",
  "searchableAttributes": ["title", "cases", "description"]
}
```

#### Cache Layer (Redis)
**Purpose**: Session management and API response caching
**Usage**:
- User sessions (15-minute TTL)
- API response cache (1-hour TTL for content)
- Rate limiting counters
- Temporary data for workflows

### 2.4 Workflow Orchestration (Temporal)

#### Content Sync Workflow
**Purpose**: Reliable synchronization with external APIs
**Implementation**:
```typescript
export async function contentSyncWorkflow() {
  const sources = ['watchmode', 'tmdb', 'reelgood'];
  
  for (const source of sources) {
    try {
      await activities.fetchContentFromSource(source);
      await activities.updateMeilisearchIndex();
      await activities.invalidateCache();
    } catch (error) {
      // Temporal handles retries automatically
      await activities.logError(error);
      // Fallback to next source
      continue;
    }
  }
}
```

**Features**:
- Automatic retry with exponential backoff
- Circuit breaker for failing APIs
- Scheduled execution (daily sync)
- Failure notifications

### 2.5 External Integrations

#### API Integration Strategy
**Primary Sources**:
1. **Watchmode API**: Streaming availability
   - Rate limit: 1000/day (free tier)
   - Caching: 24-hour TTL
   - Fallback: Reelgood

2. **TMDB API**: Content metadata
   - Rate limit: 40 requests/10 seconds
   - Caching: 7-day TTL for metadata
   - Usage: Posters, descriptions, cast

3. **Meilisearch Cloud**: Search infrastructure
   - 100K document limit (starter)
   - Auto-scaling enabled
   - Daily backups

**Integration Pattern**:
```typescript
// Circuit breaker pattern for API calls
class AggregatorService {
  async getAvailability(contentId: string) {
    // Try primary source
    try {
      return await this.watchmodeApi.get(contentId);
    } catch (error) {
      // Fallback to secondary
      try {
        return await this.reelgoodApi.get(contentId);
      } catch {
        // Return cached data
        return await this.cache.get(contentId);
      }
    }
  }
}
```

## 3. DEPLOYMENT ARCHITECTURE

### Infrastructure Topology
```
Production Environment:
├── Supabase Cloud
│   ├── PostgreSQL Database
│   ├── Authentication Service
│   └── Realtime Subscriptions
├── Vercel
│   └── Remix Web Application
├── Expo EAS
│   ├── iOS Build Pipeline
│   └── Android Build Pipeline
├── Meilisearch Cloud
│   └── Search Index
└── Temporal Cloud
    └── Workflow Orchestration
```

### CI/CD Pipeline
```yaml
# GitHub Actions workflow
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run test
      - run: npm run type-check
      
  deploy-api:
    needs: test
    steps:
      - run: npm run build:api
      - run: npm run deploy:supabase
      
  deploy-web:
    needs: test
    steps:
      - run: npm run build:web
      - run: vercel --prod
      
  deploy-mobile:
    needs: test
    steps:
      - run: eas build --platform all
      - run: eas submit --platform all
```

## 4. PERFORMANCE OPTIMIZATION

### Caching Strategy
**Multi-layer caching**:
1. **Client**: Tanstack Query (5-minute stale time)
2. **CDN**: Vercel Edge Cache (static assets)
3. **API**: Redis (1-hour TTL for content)
4. **Database**: PostgreSQL query cache

### Database Optimization
- Indexes on frequently queried fields
- Materialized views for complex aggregations
- Connection pooling via Supabase
- Read replicas for analytics queries

### API Performance
- Fastify for 2x throughput vs Express
- tRPC for eliminating over-fetching
- Batch queries where possible
- GraphQL-like field selection

## 5. SECURITY ARCHITECTURE

### Authentication & Authorization
- Supabase Auth with JWT tokens
- Row-level security in PostgreSQL
- API rate limiting per user
- Content encryption for sensitive notes

### Data Privacy
- GDPR-compliant data handling
- User data export via tRPC endpoint
- Automatic data retention policies
- Anonymous analytics only

### Infrastructure Security
- HTTPS everywhere
- Environment variables for secrets
- Regular security audits
- Dependency scanning via GitHub

## 6. MONITORING & OBSERVABILITY

### Application Monitoring
- **Sentry**: Error tracking and performance
- **Vercel Analytics**: Web vitals
- **Expo Analytics**: Mobile app metrics
- **Temporal UI**: Workflow monitoring

### Infrastructure Monitoring
- **Supabase Dashboard**: Database metrics
- **Meilisearch Dashboard**: Search performance
- **Custom dashboards**: Business metrics

### Alerting Strategy
- Error rate > 1% triggers alert
- API response time > 2s triggers warning
- Failed workflows trigger immediate notification
- Database connection pool exhaustion alerts

## 7. SCALABILITY CONSIDERATIONS

### Horizontal Scaling
- Stateless API servers (easy to scale)
- Read replicas for database
- CDN for static content
- Queue-based background jobs

### Vertical Scaling Triggers
- CPU usage > 70% sustained
- Memory usage > 80%
- Database connections > 80% of pool
- Search index > 80K documents

### Cost Optimization
- Aggressive caching to reduce API calls
- Batch processing for background jobs
- Scheduled scaling for predictable traffic
- Reserved capacity for consistent workloads

## 8. DISASTER RECOVERY

### Backup Strategy
- Database: Daily automated backups (30-day retention)
- Search index: Daily snapshots
- User uploads: S3 with versioning
- Configuration: Git version control

### Recovery Procedures
- RTO (Recovery Time Objective): 4 hours
- RPO (Recovery Point Objective): 24 hours
- Automated failover for critical services
- Manual runbooks for complex scenarios

## For Backend Engineers

### API Endpoint Specifications

#### Authentication Router
```typescript
// Authentication endpoints with exact schemas
export const authRouter = router({
  // Sign up with email/password
  signup: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
      firstName: z.string().min(1).max(50),
      lastName: z.string().min(1).max(50)
    }))
    .mutation(async ({ input }) => {
      // Returns: { user: UserProfile, session: Session }
      // Status: 201 Created | 400 Bad Request | 409 Conflict
    }),

  // Sign in with email/password  
  signin: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(1)
    }))
    .mutation(async ({ input }) => {
      // Returns: { user: UserProfile, session: Session }
      // Status: 200 OK | 401 Unauthorized | 429 Too Many Requests
    }),

  // Refresh authentication token
  refresh: publicProcedure
    .input(z.object({
      refreshToken: z.string()
    }))
    .mutation(async ({ input }) => {
      // Returns: { accessToken: string, refreshToken: string }
      // Status: 200 OK | 401 Unauthorized
    }),

  // Sign out and invalidate session
  signout: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Returns: { success: boolean }
      // Status: 200 OK | 401 Unauthorized
    })
});
```

#### Content Router
```typescript
export const contentRouter = router({
  // Search content across all platforms
  search: publicProcedure
    .input(z.object({
      query: z.string().min(1).max(100),
      platforms: z.array(z.string()).optional(),
      cases: z.array(z.string()).optional(),
      types: z.array(z.enum(['movie', 'series', 'documentary'])).optional(),
      limit: z.number().min(1).max(50).default(20),
      offset: z.number().min(0).default(0)
    }))
    .query(async ({ input }) => {
      // Returns: { results: ContentItem[], total: number, facets: SearchFacets }
      // Status: 200 OK | 400 Bad Request | 503 Service Unavailable
    }),

  // Get content details by ID
  getById: publicProcedure
    .input(z.object({
      contentId: z.string().uuid()
    }))
    .query(async ({ input }) => {
      // Returns: ContentDetail | null
      // Status: 200 OK | 404 Not Found
    }),

  // Track content (add to user's tracking list)
  track: protectedProcedure
    .input(z.object({
      contentId: z.string().uuid(),
      status: z.enum(['watching', 'completed', 'planned', 'dropped']),
      rating: z.number().min(1).max(5).optional(),
      notes: z.string().max(1000).optional(),
      episodeProgress: z.number().min(0).optional()
    }))
    .mutation(async ({ input, ctx }) => {
      // Returns: TrackingEntry
      // Status: 201 Created | 400 Bad Request | 401 Unauthorized
    }),

  // Get user's tracking list
  getTracked: protectedProcedure
    .input(z.object({
      status: z.enum(['watching', 'completed', 'planned', 'dropped']).optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0)
    }))
    .query(async ({ input, ctx }) => {
      // Returns: { entries: TrackingEntry[], total: number }
      // Status: 200 OK | 401 Unauthorized
    })
});
```

#### Platform Router
```typescript
export const platformRouter = router({
  // Get available platforms
  getAll: publicProcedure
    .query(async () => {
      // Returns: Platform[]
      // Status: 200 OK
    }),

  // Get content availability by platform
  getAvailability: publicProcedure
    .input(z.object({
      contentId: z.string().uuid(),
      region: z.string().length(2).default('US')
    }))
    .query(async ({ input }) => {
      // Returns: PlatformAvailability[]
      // Status: 200 OK | 404 Not Found
    })
});
```

### Database Schema with Relationships

#### Core Tables
```sql
-- Users table with RLS enabled
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL CHECK (length(first_name) > 0),
  last_name TEXT NOT NULL CHECK (length(last_name) > 0),
  avatar_url TEXT,
  preferences JSONB DEFAULT '{
    "notifications": {
      "push": true,
      "email": true,
      "newReleases": true,
      "recommendations": false
    },
    "privacy": {
      "profileVisible": true,
      "trackingVisible": false
    }
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content tracking with composite indexes
CREATE TABLE tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('watching', 'completed', 'planned', 'dropped')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT CHECK (length(notes) <= 1000),
  episode_progress INTEGER DEFAULT 0 CHECK (episode_progress >= 0),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, content_id)
);

-- Content metadata cache
CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('movie', 'series', 'documentary')),
  year INTEGER CHECK (year >= 1900 AND year <= 2100),
  description TEXT,
  poster_url TEXT,
  backdrop_url TEXT,
  duration_minutes INTEGER CHECK (duration_minutes > 0),
  episode_count INTEGER CHECK (episode_count > 0),
  cases JSONB DEFAULT '[]'::jsonb,
  genres JSONB DEFAULT '[]'::jsonb,
  platforms JSONB DEFAULT '[]'::jsonb,
  external_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(external_id)
);

-- Platform availability tracking
CREATE TABLE platform_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID REFERENCES content(id) ON DELETE CASCADE,
  platform_code TEXT NOT NULL,
  platform_name TEXT NOT NULL,
  available_since TIMESTAMPTZ,
  deep_link_url TEXT,
  subscription_required BOOLEAN DEFAULT true,
  rental_price_usd DECIMAL(10,2),
  purchase_price_usd DECIMAL(10,2),
  region TEXT DEFAULT 'US',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(content_id, platform_code, region)
);
```

#### Indexes for Performance
```sql
-- Tracking table indexes
CREATE INDEX idx_tracking_user_status ON tracking(user_id, status);
CREATE INDEX idx_tracking_user_updated ON tracking(user_id, updated_at DESC);
CREATE INDEX idx_tracking_content_id ON tracking(content_id);

-- Content table indexes  
CREATE INDEX idx_content_type_year ON content(type, year DESC);
CREATE INDEX idx_content_title_trgm ON content USING gin(title gin_trgm_ops);
CREATE INDEX idx_content_cases ON content USING gin(cases);
CREATE INDEX idx_content_external_updated ON content(external_updated_at DESC);

-- Platform availability indexes
CREATE INDEX idx_platform_content_region ON platform_availability(content_id, region);
CREATE INDEX idx_platform_code_region ON platform_availability(platform_code, region);
```

#### Row Level Security Policies
```sql
-- Enable RLS on sensitive tables
ALTER TABLE tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Tracking policies
CREATE POLICY "Users can only access their own tracking data"
  ON tracking FOR ALL
  USING (auth.uid() = user_id);

-- User policies  
CREATE POLICY "Users can only access their own profile"
  ON users FOR ALL
  USING (auth.uid() = id);

CREATE POLICY "Public profiles are visible to all"
  ON users FOR SELECT
  USING (
    (preferences->>'privacy'->>'profileVisible')::boolean = true
    OR auth.uid() = id
  );
```

### Business Logic Organization

#### Service Layer Architecture
```typescript
// Core service interfaces
interface ContentService {
  searchContent(params: SearchParams): Promise<SearchResult>;
  getContentDetails(id: string): Promise<ContentDetail | null>;
  syncFromExternalAPIs(): Promise<SyncResult>;
}

interface TrackingService {
  addTracking(userId: string, entry: CreateTrackingEntry): Promise<TrackingEntry>;
  updateTracking(userId: string, contentId: string, updates: UpdateTrackingEntry): Promise<TrackingEntry>;
  getUserTracking(userId: string, filters: TrackingFilters): Promise<TrackingList>;
  getTrackingStats(userId: string): Promise<TrackingStats>;
}

interface PlatformService {
  getAvailability(contentId: string, region: string): Promise<PlatformAvailability[]>;
  updateAvailabilityData(contentId: string): Promise<void>;
  getAllPlatforms(): Promise<Platform[]>;
}

// Service implementations with dependency injection
export class ContentServiceImpl implements ContentService {
  constructor(
    private meilisearch: MeiliSearch,
    private database: SupabaseClient,
    private cache: Redis,
    private externalApis: ExternalAPIService
  ) {}

  async searchContent(params: SearchParams): Promise<SearchResult> {
    // Implement search with caching and fallbacks
    const cacheKey = `search:${JSON.stringify(params)}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const results = await this.meilisearch.search(params.query, {
      filter: this.buildFilters(params),
      limit: params.limit,
      offset: params.offset,
      facetDistribution: ['platforms', 'cases', 'type', 'year']
    });

    await this.cache.setex(cacheKey, 300, JSON.stringify(results)); // 5min cache
    return results;
  }
}
```

### Authentication and Authorization Implementation

#### JWT Strategy with Supabase
```typescript
// Authentication middleware for tRPC
export const authMiddleware = middleware(async ({ ctx, next }) => {
  const token = ctx.req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    return next({
      ctx: {
        ...ctx,
        user: {
          id: user.id,
          email: user.email!,
          role: user.user_metadata?.role || 'user'
        }
      }
    });
  } catch (error) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
});

// Protected procedure with authentication
export const protectedProcedure = publicProcedure.use(authMiddleware);

// Role-based authorization
export const adminProcedure = protectedProcedure.use(
  middleware(async ({ ctx, next }) => {
    if (ctx.user.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    return next({ ctx });
  })
);
```

### Error Handling and Validation Strategies

#### Comprehensive Error Types
```typescript
// Custom error classes
export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public code: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ExternalAPIError extends Error {
  constructor(
    message: string,
    public service: string,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ExternalAPIError';
  }
}

// Global error handler for tRPC
export const errorFormatter: TRPCErrorFormatter = ({ shape, error }) => {
  if (error.cause instanceof ValidationError) {
    return {
      ...shape,
      data: {
        ...shape.data,
        field: error.cause.field,
        code: error.cause.code
      }
    };
  }

  if (error.cause instanceof ExternalAPIError) {
    return {
      ...shape,
      message: 'External service unavailable',
      data: {
        ...shape.data,
        service: error.cause.service,
        retryable: error.cause.retryable
      }
    };
  }

  return shape;
};
```

#### Input Validation with Zod
```typescript
// Shared validation schemas
export const ContentTrackingSchema = z.object({
  contentId: z.string().uuid('Invalid content ID format'),
  status: z.enum(['watching', 'completed', 'planned', 'dropped']),
  rating: z.number()
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating cannot exceed 5')
    .optional(),
  notes: z.string()
    .max(1000, 'Notes cannot exceed 1000 characters')
    .optional(),
  episodeProgress: z.number()
    .min(0, 'Episode progress cannot be negative')
    .optional()
});

export const SearchParamsSchema = z.object({
  query: z.string()
    .min(1, 'Search query is required')
    .max(100, 'Search query too long'),
  platforms: z.array(z.string()).optional(),
  cases: z.array(z.string()).optional(),
  types: z.array(z.enum(['movie', 'series', 'documentary'])).optional(),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0)
});

// Usage in tRPC procedures
export const trackContent = protectedProcedure
  .input(ContentTrackingSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      return await trackingService.addTracking(ctx.user.id, input);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Validation failed',
          cause: new ValidationError(
            error.errors[0].message,
            error.errors[0].path.join('.'),
            'VALIDATION_FAILED'
          )
        });
      }
      throw error;
    }
  });
```

## For Frontend Engineers

### Component Architecture and State Management

#### Mobile App Architecture (Expo React Native)
```typescript
// App structure with Expo Router file-based routing
app/
├── _layout.tsx                 // Root layout with providers
├── (tabs)/                     // Tab navigation group
│   ├── _layout.tsx            // Tab layout configuration
│   ├── index.tsx              // Home/Discovery feed
│   ├── search.tsx             // Search interface
│   ├── tracking.tsx           // User's tracking list
│   └── profile.tsx            // User profile and settings
├── content/
│   └── [id].tsx               // Content details modal
├── auth/
│   ├── signin.tsx             // Authentication screens
│   └── signup.tsx
└── +not-found.tsx             // 404 fallback

// Root layout with global providers
export default function RootLayout() {
  return (
    <TRPCProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen 
                name="content/[id]" 
                options={{ presentation: 'modal' }}
              />
            </Stack>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </TRPCProvider>
  );
}
```

#### State Management Strategy
```typescript
// Global state with Zustand
interface AppState {
  // Authentication state
  user: User | null;
  isAuthenticated: boolean;
  
  // UI state
  activeTheme: 'light' | 'dark' | 'system';
  searchHistory: string[];
  
  // Offline state
  isOnline: boolean;
  pendingActions: PendingAction[];
  
  // Actions
  setUser: (user: User | null) => void;
  addToSearchHistory: (query: string) => void;
  toggleTheme: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      activeTheme: 'system',
      searchHistory: [],
      isOnline: true,
      pendingActions: [],
      
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      addToSearchHistory: (query) => {
        const { searchHistory } = get();
        const updated = [query, ...searchHistory.filter(h => h !== query)].slice(0, 10);
        set({ searchHistory: updated });
      },
      toggleTheme: () => {
        const { activeTheme } = get();
        const themes = ['light', 'dark', 'system'] as const;
        const currentIndex = themes.indexOf(activeTheme);
        const nextTheme = themes[(currentIndex + 1) % themes.length];
        set({ activeTheme: nextTheme });
      }
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({ 
        searchHistory: state.searchHistory,
        activeTheme: state.activeTheme 
      })
    }
  )
);
```

#### Component Design System
```typescript
// Themed component foundations
interface ThemedProps {
  lightColor?: string;
  darkColor?: string;
}

export function ThemedText({ 
  style, 
  lightColor, 
  darkColor, 
  ...props 
}: ThemedProps & Text['props']) {
  const theme = useColorScheme() ?? 'light';
  const color = theme === 'dark' ? darkColor : lightColor;

  return (
    <Text
      style={[
        { color: color ?? Colors[theme].text },
        style
      ]}
      {...props}
    />
  );
}

export function ThemedView({ 
  style, 
  lightColor, 
  darkColor, 
  ...props 
}: ThemedProps & View['props']) {
  const theme = useColorScheme() ?? 'light';
  const backgroundColor = theme === 'dark' ? darkColor : lightColor;

  return (
    <View
      style={[
        { backgroundColor: backgroundColor ?? Colors[theme].background },
        style
      ]}
      {...props}
    />
  );
}

// Reusable UI components
export function ContentCard({ content, onPress, ...props }: {
  content: ContentItem;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-3 shadow-sm"
      {...props}
    >
      <View className="flex-row">
        <Image 
          source={{ uri: content.posterUrl }}
          className="w-16 h-24 rounded-md mr-3"
          resizeMode="cover"
        />
        <View className="flex-1">
          <ThemedText className="font-semibold text-lg mb-1">
            {content.title}
          </ThemedText>
          <ThemedText className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {content.year} • {content.type}
          </ThemedText>
          <View className="flex-row flex-wrap">
            {content.platforms.slice(0, 3).map((platform) => (
              <View 
                key={platform}
                className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded mr-2 mb-1"
              >
                <ThemedText className="text-xs text-blue-800 dark:text-blue-200">
                  {platform}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Pressable>
  );
}
```

### API Integration Patterns and Error Handling

#### tRPC Client Setup
```typescript
// tRPC client configuration with authentication
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../../TC-backend/src/router';

export const trpc = createTRPCReact<AppRouter>();

// Auth-aware HTTP link
const httpLink = httpBatchLink({
  url: 'https://api.truecrime.app/trpc',
  headers() {
    const token = useAppStore.getState().authToken;
    return token ? { authorization: `Bearer ${token}` } : {};
  },
});

// Setup with React Query integration
export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: (failureCount, error) => {
          if (error.data?.code === 'UNAUTHORIZED') return false;
          return failureCount < 3;
        }
      }
    }
  }));

  const [trpcClient] = useState(() => trpc.createClient({
    links: [
      errorLink({
        onError: ({ error, operation, next }) => {
          if (error.data?.code === 'UNAUTHORIZED') {
            useAppStore.getState().setUser(null);
            router.replace('/auth/signin');
          }
        }
      }),
      httpLink
    ]
  }));

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

#### Data Fetching Patterns
```typescript
// Content search with optimistic updates
export function useContentSearch() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  
  const { data, isLoading, error, refetch } = trpc.content.search.useQuery(
    { query, ...filters },
    { 
      enabled: query.length > 0,
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000 // 5 minutes
    }
  );

  return {
    results: data?.results ?? [],
    facets: data?.facets,
    isLoading,
    error,
    query,
    setQuery,
    filters,
    setFilters,
    refetch
  };
}

// Content tracking with optimistic updates
export function useContentTracking() {
  const queryClient = useQueryClient();
  
  const trackMutation = trpc.content.track.useMutation({
    onMutate: async (newTracking) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(['content', 'getTracked']);
      
      // Snapshot previous value
      const previousTracking = queryClient.getQueryData(['content', 'getTracked']);
      
      // Optimistically update
      queryClient.setQueryData(['content', 'getTracked'], (old: any) => ({
        ...old,
        entries: [newTracking, ...(old?.entries ?? [])]
      }));
      
      return { previousTracking };
    },
    onError: (err, newTracking, context) => {
      // Rollback on error
      queryClient.setQueryData(['content', 'getTracked'], context?.previousTracking);
    },
    onSettled: () => {
      // Refetch after error or success
      queryClient.invalidateQueries(['content', 'getTracked']);
    }
  });

  return {
    trackContent: trackMutation.mutate,
    isTracking: trackMutation.isLoading,
    error: trackMutation.error
  };
}
```

#### Offline Support and Synchronization
```typescript
// Offline-first mutations with background sync
export function useOfflineSync() {
  const { isOnline } = useNetInfo();
  const { pendingActions, addPendingAction, removePendingAction } = useAppStore();
  
  useEffect(() => {
    if (isOnline && pendingActions.length > 0) {
      syncPendingActions();
    }
  }, [isOnline, pendingActions.length]);

  const syncPendingActions = async () => {
    for (const action of pendingActions) {
      try {
        await executeAction(action);
        removePendingAction(action.id);
      } catch (error) {
        console.error('Failed to sync action:', error);
      }
    }
  };

  const executeWithOfflineSupport = async (action: PendingAction) => {
    if (isOnline) {
      return await executeAction(action);
    } else {
      addPendingAction(action);
      return { success: true, offline: true };
    }
  };

  return { executeWithOfflineSupport, syncPendingActions };
}
```

### Routing and Navigation Architecture

#### Expo Router Configuration
```typescript
// Tab navigation layout with icons
export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'home' : 'home-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'search' : 'search-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tracking"
        options={{
          title: 'My List',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'bookmark' : 'bookmark-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name={focused ? 'person' : 'person-outline'} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

#### Deep Linking Strategy
```typescript
// Handle deep links to content and streaming platforms
export function useDeepLinking() {
  const router = useRouter();
  
  useEffect(() => {
    const handleDeepLink = (url: string) => {
      const { pathname, queryParams } = Linking.parse(url);
      
      if (pathname?.startsWith('/content/')) {
        const contentId = pathname.split('/')[2];
        router.push(`/content/${contentId}`);
      } else if (queryParams?.platform && queryParams?.contentId) {
        // External platform deep link
        openExternalPlatform(queryParams.platform, queryParams.contentId);
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription?.remove();
  }, []);
}

// Platform-specific deep linking
const openExternalPlatform = async (platform: string, contentId: string) => {
  const deepLinks = {
    netflix: `https://www.netflix.com/title/${contentId}`,
    hulu: `https://www.hulu.com/watch/${contentId}`,
    'amazon-prime': `https://app.primevideo.com/detail?gti=${contentId}`,
    // ... other platforms
  };

  const url = deepLinks[platform];
  if (url && await Linking.canOpenURL(url)) {
    await Linking.openURL(url);
  } else {
    // Fallback to web browser
    await WebBrowser.openBrowserAsync(url);
  }
};
```

### Performance Optimization Strategies

#### Image and Asset Optimization
```typescript
// Optimized image loading with caching
export function OptimizedImage({ 
  source, 
  placeholder, 
  ...props 
}: ImageProps & { placeholder?: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <View style={props.style}>
      {isLoading && (
        <View className="absolute inset-0 bg-gray-200 dark:bg-gray-700 rounded">
          <ActivityIndicator className="flex-1" />
        </View>
      )}
      <Image
        {...props}
        source={hasError ? { uri: placeholder } : source}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
        // Enable native caching
        cachePolicy="memory-disk"
      />
    </View>
  );
}

// Lazy loading for large lists
export function ContentList({ contentIds }: { contentIds: string[] }) {
  const renderItem = useCallback(({ item }: { item: string }) => (
    <ContentListItem contentId={item} />
  ), []);

  const keyExtractor = useCallback((item: string) => item, []);

  return (
    <FlatList
      data={contentIds}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      // Performance optimizations
      removeClippedSubviews
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={10}
      windowSize={10}
      getItemLayout={(data, index) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index,
      })}
    />
  );
}
```

#### Memory and Bundle Optimization
```typescript
// Code splitting with dynamic imports
const ContentDetailModal = lazy(() => import('../components/ContentDetailModal'));
const SearchResults = lazy(() => import('../components/SearchResults'));

// Memory-efficient large data handling
export function useVirtualizedData<T>(
  data: T[],
  itemHeight: number,
  containerHeight: number
) {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 10 });
  
  const visibleItems = useMemo(() => 
    data.slice(visibleRange.start, visibleRange.end),
    [data, visibleRange]
  );

  const onScroll = useCallback((event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    const start = Math.floor(scrollY / itemHeight);
    const end = Math.min(start + Math.ceil(containerHeight / itemHeight) + 5, data.length);
    
    setVisibleRange({ start, end });
  }, [itemHeight, containerHeight, data.length]);

  return { visibleItems, onScroll };
}
```

### Build and Development Setup Requirements

#### Development Environment
```bash
# Required Node.js version and package manager
node: ">=20.0.0"
npm: ">=10.0.0"

# Essential Expo CLI setup
npm install -g @expo/cli eas-cli

# Development scripts
npm run start          # Start Expo development server
npm run android        # Run on Android emulator
npm run ios           # Run on iOS simulator  
npm run web           # Run in web browser
npm run tunnel        # Enable tunnel for device testing
```

#### Build Configuration
```typescript
// app.config.ts - Expo configuration
export default {
  expo: {
    name: "True Crime",
    slug: "truecrime-tracker",
    scheme: "truecrime",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    platforms: ["ios", "android", "web"],
    
    // Performance optimizations
    assetBundlePatterns: ["**/*"],
    
    // Platform-specific configurations
    ios: {
      bundleIdentifier: "com.truecrime.tracker",
      buildNumber: "1",
      supportsTablet: true,
      infoPlist: {
        LSApplicationQueriesSchemes: ["netflix", "hulu", "prime-video"]
      }
    },
    
    android: {
      package: "com.truecrime.tracker",
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#FFFFFF"
      },
      intentFilters: [
        {
          action: "VIEW",
          data: [{ scheme: "truecrime" }],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    
    web: {
      favicon: "./assets/favicon.png",
      bundler: "metro"
    },
    
    // Development and debugging
    extra: {
      apiUrl: process.env.API_URL,
      eas: { projectId: "your-project-id" }
    }
  }
};
```

#### TypeScript Configuration
```json
// tsconfig.json for mobile
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": "./",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/types/*": ["./src/types/*"]
    },
    "types": ["expo", "node"]
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ]
}
```

## For QA Engineers

### Testable Component Boundaries and Interfaces

#### API Testing Strategy
```typescript
// tRPC endpoint testing with type safety
describe('Content API', () => {
  let testDb: TestDatabase;
  let testUser: User;

  beforeEach(async () => {
    testDb = await createTestDatabase();
    testUser = await testDb.createUser({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User'
    });
  });

  describe('content.search', () => {
    it('should return paginated search results', async () => {
      // Seed test data
      await testDb.seedContent([
        { title: 'Making a Murderer', type: 'documentary', cases: ['steven_avery'] },
        { title: 'The Ted Bundy Tapes', type: 'documentary', cases: ['ted_bundy'] }
      ]);

      const result = await trpc.content.search.query({
        query: 'murder',
        limit: 10,
        offset: 0
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].title).toBe('Making a Murderer');
      expect(result.total).toBe(1);
    });

    it('should filter by platform correctly', async () => {
      await testDb.seedContent([
        { title: 'Netflix Documentary', platforms: ['netflix'] },
        { title: 'Hulu Documentary', platforms: ['hulu'] }
      ]);

      const result = await trpc.content.search.query({
        query: 'documentary',
        platforms: ['netflix']
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].platforms).toContain('netflix');
    });

    it('should handle empty search queries gracefully', async () => {
      await expect(
        trpc.content.search.query({ query: '' })
      ).rejects.toThrow('Search query is required');
    });
  });

  describe('content.track', () => {
    it('should create tracking entry for authenticated user', async () => {
      const content = await testDb.createContent({
        title: 'Test Content',
        type: 'documentary'
      });

      const result = await trpc.content.track.mutate({
        contentId: content.id,
        status: 'watching',
        rating: 4
      }, { context: { user: testUser } });

      expect(result.userId).toBe(testUser.id);
      expect(result.contentId).toBe(content.id);
      expect(result.status).toBe('watching');
      expect(result.rating).toBe(4);
    });

    it('should prevent duplicate tracking entries', async () => {
      const content = await testDb.createContent({ title: 'Test' });
      
      // First tracking should succeed
      await trpc.content.track.mutate({
        contentId: content.id,
        status: 'watching'
      }, { context: { user: testUser } });

      // Second tracking should update existing entry
      const updated = await trpc.content.track.mutate({
        contentId: content.id,
        status: 'completed',
        rating: 5
      }, { context: { user: testUser } });

      expect(updated.status).toBe('completed');
      expect(updated.rating).toBe(5);
    });

    it('should reject unauthenticated requests', async () => {
      await expect(
        trpc.content.track.mutate({
          contentId: 'some-id',
          status: 'watching'
        })
      ).rejects.toThrow('UNAUTHORIZED');
    });
  });
});
```

#### Component Integration Testing
```typescript
// React Native component testing with React Testing Library
describe('ContentCard Component', () => {
  const mockContent: ContentItem = {
    id: '1',
    title: 'The Ted Bundy Tapes',
    type: 'documentary',
    year: 2019,
    posterUrl: 'https://example.com/poster.jpg',
    platforms: ['netflix', 'hulu'],
    cases: ['ted_bundy']
  };

  it('should render content information correctly', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <ContentCard content={mockContent} onPress={onPress} />
    );

    expect(getByText('The Ted Bundy Tapes')).toBeTruthy();
    expect(getByText('2019 • documentary')).toBeTruthy();
    expect(getByText('netflix')).toBeTruthy();
    expect(getByText('hulu')).toBeTruthy();
  });

  it('should call onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <ContentCard content={mockContent} onPress={onPress} testID="content-card" />
    );

    fireEvent.press(getByTestId('content-card'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should limit platform display to 3 items', () => {
    const contentWithManyPlatforms = {
      ...mockContent,
      platforms: ['netflix', 'hulu', 'amazon-prime', 'apple-tv', 'disney-plus']
    };

    const { queryByText } = render(
      <ContentCard content={contentWithManyPlatforms} onPress={jest.fn()} />
    );

    expect(queryByText('netflix')).toBeTruthy();
    expect(queryByText('hulu')).toBeTruthy();
    expect(queryByText('amazon-prime')).toBeTruthy();
    expect(queryByText('apple-tv')).toBeFalsy();
    expect(queryByText('disney-plus')).toBeFalsy();
  });
});

// Search functionality integration testing
describe('Search Integration', () => {
  it('should perform search and display results', async () => {
    const { getByPlaceholderText, getByText } = render(
      <SearchScreen />
    );

    const searchInput = getByPlaceholderText('Search true crime content...');
    fireEvent.changeText(searchInput, 'ted bundy');

    await waitFor(() => {
      expect(getByText('The Ted Bundy Tapes')).toBeTruthy();
    });
  });

  it('should handle search errors gracefully', async () => {
    // Mock API failure
    jest.spyOn(trpc.content.search, 'useQuery').mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Search service unavailable')
    });

    const { getByText } = render(<SearchScreen />);
    
    await waitFor(() => {
      expect(getByText(/search service unavailable/i)).toBeTruthy();
    });
  });
});
```

### Data Validation Requirements and Edge Cases

#### Input Validation Test Cases
```typescript
describe('Data Validation', () => {
  describe('ContentTrackingSchema', () => {
    it('should validate correct tracking data', () => {
      const validData = {
        contentId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        status: 'watching' as const,
        rating: 4,
        notes: 'Great documentary',
        episodeProgress: 5
      };

      expect(() => ContentTrackingSchema.parse(validData)).not.toThrow();
    });

    it('should reject invalid content ID format', () => {
      const invalidData = {
        contentId: 'not-a-uuid',
        status: 'watching' as const
      };

      expect(() => ContentTrackingSchema.parse(invalidData))
        .toThrow('Invalid content ID format');
    });

    it('should reject rating outside valid range', () => {
      const invalidRating = {
        contentId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        status: 'watching' as const,
        rating: 6
      };

      expect(() => ContentTrackingSchema.parse(invalidRating))
        .toThrow('Rating cannot exceed 5');
    });

    it('should reject notes exceeding character limit', () => {
      const longNotes = {
        contentId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        status: 'watching' as const,
        notes: 'x'.repeat(1001)
      };

      expect(() => ContentTrackingSchema.parse(longNotes))
        .toThrow('Notes cannot exceed 1000 characters');
    });

    it('should reject negative episode progress', () => {
      const negativeProgress = {
        contentId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        status: 'watching' as const,
        episodeProgress: -1
      };

      expect(() => ContentTrackingSchema.parse(negativeProgress))
        .toThrow('Episode progress cannot be negative');
    });
  });

  describe('SearchParamsSchema', () => {
    it('should apply default values correctly', () => {
      const minimalSearch = { query: 'test' };
      const parsed = SearchParamsSchema.parse(minimalSearch);

      expect(parsed.limit).toBe(20);
      expect(parsed.offset).toBe(0);
    });

    it('should reject empty search queries', () => {
      expect(() => SearchParamsSchema.parse({ query: '' }))
        .toThrow('Search query is required');
    });

    it('should reject search queries that are too long', () => {
      const longQuery = { query: 'x'.repeat(101) };
      expect(() => SearchParamsSchema.parse(longQuery))
        .toThrow('Search query too long');
    });
  });
});
```

#### Database Constraint Testing
```typescript
describe('Database Constraints', () => {
  describe('User Table', () => {
    it('should enforce unique email constraint', async () => {
      await testDb.createUser({ email: 'test@example.com' });
      
      await expect(
        testDb.createUser({ email: 'test@example.com' })
      ).rejects.toThrow('duplicate key value violates unique constraint');
    });

    it('should enforce non-empty name constraints', async () => {
      await expect(
        testDb.createUser({ 
          email: 'test@example.com',
          firstName: '',
          lastName: 'User'
        })
      ).rejects.toThrow('violates check constraint');
    });
  });

  describe('Tracking Table', () => {
    it('should enforce valid status values', async () => {
      const user = await testDb.createUser({ email: 'test@example.com' });
      const content = await testDb.createContent({ title: 'Test' });

      await expect(
        testDb.query(`
          INSERT INTO tracking (user_id, content_id, status)
          VALUES ($1, $2, 'invalid_status')
        `, [user.id, content.id])
      ).rejects.toThrow('violates check constraint');
    });

    it('should enforce rating range constraints', async () => {
      const user = await testDb.createUser({ email: 'test@example.com' });
      const content = await testDb.createContent({ title: 'Test' });

      await expect(
        testDb.query(`
          INSERT INTO tracking (user_id, content_id, status, rating)
          VALUES ($1, $2, 'watching', 6)
        `, [user.id, content.id])
      ).rejects.toThrow('violates check constraint');
    });

    it('should enforce unique user-content pairs', async () => {
      const user = await testDb.createUser({ email: 'test@example.com' });
      const content = await testDb.createContent({ title: 'Test' });

      await testDb.createTracking({
        userId: user.id,
        contentId: content.id,
        status: 'watching'
      });

      await expect(
        testDb.createTracking({
          userId: user.id,
          contentId: content.id,
          status: 'completed'
        })
      ).rejects.toThrow('duplicate key value violates unique constraint');
    });
  });
});
```

### Integration Points Requiring Testing

#### External API Integration Testing
```typescript
describe('External API Integrations', () => {
  describe('Watchmode API', () => {
    beforeEach(() => {
      nock('https://api.watchmode.com')
        .get('/v1/list-titles/')
        .reply(200, {
          titles: [
            {
              id: 12345,
              title: 'The Ted Bundy Tapes',
              type: 'tv_series',
              year: 2019,
              plot_overview: 'Documentary about Ted Bundy'
            }
          ]
        });
    });

    it('should fetch and transform content data correctly', async () => {
      const service = new WatchmodeService();
      const content = await service.fetchContent();

      expect(content).toHaveLength(1);
      expect(content[0].title).toBe('The Ted Bundy Tapes');
      expect(content[0].type).toBe('documentary');
      expect(content[0].year).toBe(2019);
    });

    it('should handle API rate limiting gracefully', async () => {
      nock('https://api.watchmode.com')
        .get('/v1/list-titles/')
        .reply(429, { error: 'Rate limit exceeded' });

      const service = new WatchmodeService();
      
      await expect(service.fetchContent())
        .rejects.toThrow('Rate limit exceeded');
    });

    it('should fallback to cached data when API is unavailable', async () => {
      nock('https://api.watchmode.com')
        .get('/v1/list-titles/')
        .reply(503, { error: 'Service unavailable' });

      // Pre-populate cache
      await redis.set('watchmode:content', JSON.stringify([
        { id: '1', title: 'Cached Content' }
      ]));

      const service = new WatchmodeService();
      const content = await service.fetchContent();

      expect(content).toHaveLength(1);
      expect(content[0].title).toBe('Cached Content');
    });
  });

  describe('Meilisearch Integration', () => {
    it('should sync content to search index correctly', async () => {
      const content = [
        {
          id: '1',
          title: 'The Ted Bundy Tapes',
          cases: ['ted_bundy'],
          platforms: ['netflix']
        }
      ];

      await meilisearchService.syncContent(content);

      const searchResults = await meilisearchService.search('ted bundy');
      expect(searchResults.hits).toHaveLength(1);
      expect(searchResults.hits[0].title).toBe('The Ted Bundy Tapes');
    });

    it('should handle search index failures gracefully', async () => {
      // Mock Meilisearch failure
      jest.spyOn(meilisearchService, 'search')
        .mockRejectedValue(new Error('Search index unavailable'));

      const searchService = new ContentSearchService();
      
      await expect(searchService.search('test query'))
        .rejects.toThrow('Search service temporarily unavailable');
    });
  });
});
```

#### Temporal Workflow Testing
```typescript
describe('Temporal Workflows', () => {
  describe('Content Sync Workflow', () => {
    it('should sync content from all sources successfully', async () => {
      const testEnv = await TestWorkflowEnvironment.createTimeSkipping();
      const { client } = testEnv;

      const handle = await client.workflow.start(contentSyncWorkflow, {
        taskQueue: 'test-task-queue',
        workflowId: `test-sync-${Date.now()}`
      });

      const result = await handle.result();

      expect(result.success).toBe(true);
      expect(result.sourcesProcessed).toEqual(['watchmode', 'tmdb', 'reelgood']);
      expect(result.itemsProcessed).toBeGreaterThan(0);
    });

    it('should retry failed API calls with exponential backoff', async () => {
      // Mock first two calls to fail, third to succeed
      let callCount = 0;
      jest.spyOn(activities, 'fetchContentFromSource')
        .mockImplementation(async (source) => {
          callCount++;
          if (callCount <= 2) {
            throw new Error('API temporarily unavailable');
          }
          return { items: [], success: true };
        });

      const testEnv = await TestWorkflowEnvironment.createTimeSkipping();
      const { client } = testEnv;

      const handle = await client.workflow.start(contentSyncWorkflow, {
        taskQueue: 'test-task-queue',
        workflowId: `test-retry-${Date.now()}`
      });

      const result = await handle.result();

      expect(callCount).toBe(3);
      expect(result.success).toBe(true);
    });

    it('should handle complete source failure by continuing with other sources', async () => {
      jest.spyOn(activities, 'fetchContentFromSource')
        .mockImplementation(async (source) => {
          if (source === 'watchmode') {
            throw new Error('Watchmode API down');
          }
          return { items: [{ title: `Content from ${source}` }], success: true };
        });

      const testEnv = await TestWorkflowEnvironment.createTimeSkipping();
      const { client } = testEnv;

      const handle = await client.workflow.start(contentSyncWorkflow, {
        taskQueue: 'test-task-queue',
        workflowId: `test-fallback-${Date.now()}`
      });

      const result = await handle.result();

      expect(result.success).toBe(true);
      expect(result.sourcesProcessed).toEqual(['tmdb', 'reelgood']);
      expect(result.failedSources).toEqual(['watchmode']);
    });
  });
});
```

### Performance Benchmarks and Quality Metrics

#### API Performance Testing
```typescript
describe('API Performance', () => {
  it('should respond to search queries within 500ms', async () => {
    const startTime = Date.now();
    
    await trpc.content.search.query({
      query: 'ted bundy',
      limit: 20
    });
    
    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(500);
  });

  it('should handle concurrent search requests efficiently', async () => {
    const concurrentRequests = 10;
    const promises = Array(concurrentRequests).fill(null).map((_, i) =>
      trpc.content.search.query({ query: `search ${i}` })
    );

    const startTime = Date.now();
    await Promise.all(promises);
    const totalTime = Date.now() - startTime;

    // Should complete all requests within 2 seconds
    expect(totalTime).toBeLessThan(2000);
  });

  it('should cache frequent search queries effectively', async () => {
    const query = { query: 'popular documentary' };

    // First request (cache miss)
    const start1 = Date.now();
    await trpc.content.search.query(query);
    const time1 = Date.now() - start1;

    // Second request (cache hit)
    const start2 = Date.now();
    await trpc.content.search.query(query);
    const time2 = Date.now() - start2;

    // Cached response should be significantly faster
    expect(time2).toBeLessThan(time1 * 0.5);
  });
});
```

#### Mobile App Performance Testing
```typescript
describe('Mobile App Performance', () => {
  it('should render content lists smoothly with 60 FPS', async () => {
    const { getByTestId } = render(
      <ContentList contentIds={Array(100).fill(null).map((_, i) => `item-${i}`)} />
    );

    const list = getByTestId('content-list');
    
    // Simulate rapid scrolling
    const scrollEvents = Array(50).fill(null).map((_, i) => ({
      nativeEvent: {
        contentOffset: { y: i * 100 },
        contentSize: { height: 10000 }
      }
    }));

    const startTime = performance.now();
    scrollEvents.forEach(event => {
      fireEvent.scroll(list, event);
    });
    const endTime = performance.now();

    // Should handle 50 scroll events in under 100ms (600+ FPS)
    expect(endTime - startTime).toBeLessThan(100);
  });

  it('should keep memory usage under 100MB for large content lists', async () => {
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

    render(
      <ContentList contentIds={Array(1000).fill(null).map((_, i) => `item-${i}`)} />
    );

    // Force garbage collection if available
    if ((global as any).gc) {
      (global as any).gc();
    }

    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB

    expect(memoryIncrease).toBeLessThan(100);
  });
});
```

### Security Testing Considerations

#### Authentication and Authorization Testing
```typescript
describe('Security Testing', () => {
  describe('Authentication', () => {
    it('should reject requests with invalid JWT tokens', async () => {
      const invalidToken = 'invalid.jwt.token';
      
      await expect(
        trpc.content.track.mutate(
          { contentId: 'test-id', status: 'watching' },
          { context: { token: invalidToken } }
        )
      ).rejects.toThrow('UNAUTHORIZED');
    });

    it('should reject expired JWT tokens', async () => {
      const expiredToken = generateExpiredJWT();
      
      await expect(
        trpc.content.track.mutate(
          { contentId: 'test-id', status: 'watching' },
          { context: { token: expiredToken } }
        )
      ).rejects.toThrow('UNAUTHORIZED');
    });
  });

  describe('Row Level Security', () => {
    it('should prevent users from accessing other users\' tracking data', async () => {
      const user1 = await testDb.createUser({ email: 'user1@example.com' });
      const user2 = await testDb.createUser({ email: 'user2@example.com' });
      
      await testDb.createTracking({
        userId: user1.id,
        contentId: 'content-1',
        status: 'watching'
      });

      const result = await trpc.content.getTracked.query(
        {},
        { context: { user: user2 } }
      );

      expect(result.entries).toHaveLength(0);
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize SQL injection attempts', async () => {
      const maliciousQuery = "'; DROP TABLE users; --";
      
      await expect(
        trpc.content.search.query({ query: maliciousQuery })
      ).not.toThrow();
      
      // Verify users table still exists
      const users = await testDb.query('SELECT COUNT(*) FROM users');
      expect(users.rows[0].count).toBeDefined();
    });

    it('should sanitize XSS attempts in user input', async () => {
      const maliciousNotes = '<script>alert("xss")</script>';
      
      const user = await testDb.createUser({ email: 'test@example.com' });
      const result = await trpc.content.track.mutate({
        contentId: 'content-1',
        status: 'watching',
        notes: maliciousNotes
      }, { context: { user } });

      // Notes should be escaped or sanitized
      expect(result.notes).not.toContain('<script>');
    });
  });
});
```

## For Security Analysts

### Authentication Flow and Security Model

#### Authentication Architecture
```typescript
// Comprehensive authentication flow with Supabase Auth
export class AuthenticationService {
  private supabase: SupabaseClient;
  
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        }
      }
    );
  }

  // Multi-factor authentication flow
  async signInWithMFA(email: string, password: string, totpCode?: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw new AuthenticationError(error.message);

    // Check if MFA is required
    if (data.user && !data.session && data.user.factors?.length > 0) {
      if (!totpCode) {
        throw new MFARequiredError('TOTP code required');
      }

      const { data: mfaData, error: mfaError } = await this.supabase.auth.verifyOtp({
        type: 'totp',
        token: totpCode
      });

      if (mfaError) throw new AuthenticationError(mfaError.message);
      return mfaData;
    }

    return data;
  }

  // Secure session management with automatic refresh
  async refreshSession(refreshToken: string): Promise<Session> {
    const { data, error } = await this.supabase.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (error) throw new SessionExpiredError();
    return data.session!;
  }

  // Secure logout with token invalidation
  async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw new LogoutError(error.message);
  }
}
```

#### Role-Based Access Control (RBAC)
```sql
-- User roles and permissions system
CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin');

-- Enhanced users table with roles
ALTER TABLE users ADD COLUMN role user_role DEFAULT 'user';
ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until TIMESTAMPTZ;

-- Audit trail for security events
CREATE TABLE security_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  event_type TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies for role-based access
CREATE POLICY "Users can read their own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all user data"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Moderators can read basic user data"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );
```

#### JWT Security Implementation
```typescript
// Enhanced JWT validation with security checks
export class JWTSecurityService {
  private readonly JWT_SECRET = process.env.JWT_SECRET!;
  private readonly blacklistedTokens = new Set<string>();
  
  async validateJWT(token: string): Promise<DecodedToken> {
    // Check token blacklist
    if (this.blacklistedTokens.has(token)) {
      throw new SecurityError('Token has been revoked', 'TOKEN_REVOKED');
    }

    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as DecodedToken;
      
      // Additional security checks
      await this.performSecurityChecks(decoded, token);
      
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new SecurityError('Token expired', 'TOKEN_EXPIRED');
      }
      throw new SecurityError('Invalid token', 'TOKEN_INVALID');
    }
  }

  private async performSecurityChecks(decoded: DecodedToken, token: string) {
    // Check for suspicious activity
    const securityEvent = await this.checkSecurityEvents(decoded.sub);
    if (securityEvent.riskScore > 80) {
      await this.logSecurityEvent({
        userId: decoded.sub,
        eventType: 'HIGH_RISK_LOGIN_ATTEMPT',
        riskScore: securityEvent.riskScore,
        metadata: { tokenId: decoded.jti }
      });
      throw new SecurityError('Account locked due to suspicious activity', 'ACCOUNT_LOCKED');
    }

    // Validate token age and usage patterns
    const tokenAge = Date.now() - decoded.iat * 1000;
    if (tokenAge > 24 * 60 * 60 * 1000) { // 24 hours
      throw new SecurityError('Token too old', 'TOKEN_EXPIRED');
    }
  }

  async revokeToken(token: string): Promise<void> {
    this.blacklistedTokens.add(token);
    // Also store in database for distributed systems
    await this.supabase.from('revoked_tokens').insert({
      token_hash: crypto.createHash('sha256').update(token).digest('hex'),
      revoked_at: new Date()
    });
  }
}
```

### Data Encryption and Privacy Protection

#### End-to-End Encryption for Sensitive Data
```typescript
// Encryption service for sensitive user data
export class EncryptionService {
  private readonly encryptionKey = process.env.ENCRYPTION_KEY!;
  
  // Encrypt sensitive user notes and personal data
  encryptUserData(data: string): EncryptedData {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);
    cipher.setAAD(Buffer.from('user-data'));
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encryptedData: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  decryptUserData(encryptedData: EncryptedData): string {
    const decipher = crypto.createDecipher('aes-256-gcm', this.encryptionKey);
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    decipher.setAAD(Buffer.from('user-data'));
    
    let decrypted = decipher.update(encryptedData.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // Hash sensitive search queries for privacy
  hashSearchQuery(query: string): string {
    return crypto.createHash('sha256')
      .update(query + process.env.SEARCH_SALT!)
      .digest('hex');
  }
}
```

#### GDPR Compliance Implementation
```typescript
// GDPR compliance service
export class GDPRComplianceService {
  async exportUserData(userId: string): Promise<UserDataExport> {
    // Collect all user data across tables
    const userData = await this.supabase.from('users')
      .select('*')
      .eq('id', userId)
      .single();

    const trackingData = await this.supabase.from('tracking')
      .select('*')
      .eq('user_id', userId);

    const securityEvents = await this.supabase.from('security_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    return {
      personalData: userData.data,
      trackingHistory: trackingData.data,
      securityEvents: securityEvents.data,
      exportedAt: new Date().toISOString(),
      dataRetentionPolicy: 'Data retained for 7 years as per GDPR Article 17'
    };
  }

  async deleteUserData(userId: string, verificationCode: string): Promise<void> {
    // Verify deletion request
    const isValid = await this.verifyDeletionCode(userId, verificationCode);
    if (!isValid) {
      throw new SecurityError('Invalid verification code', 'VERIFICATION_FAILED');
    }

    // Soft delete with audit trail
    await this.supabase.rpc('soft_delete_user', { user_id: userId });
    
    // Log GDPR deletion event
    await this.logSecurityEvent({
      userId,
      eventType: 'GDPR_DATA_DELETION',
      metadata: { requestedAt: new Date().toISOString() }
    });
  }

  async anonymizeUserData(userId: string): Promise<void> {
    // Replace PII with anonymized values
    await this.supabase.from('users').update({
      email: `anon_${crypto.randomUUID()}@anonymized.com`,
      first_name: 'Anonymous',
      last_name: 'User',
      avatar_url: null,
      preferences: {}
    }).eq('id', userId);
  }
}
```

### Input Validation and Sanitization

#### Comprehensive Input Validation
```typescript
// Security-focused validation schemas
export const SecureValidationSchemas = {
  // User registration with security rules
  userRegistration: z.object({
    email: z.string()
      .email('Invalid email format')
      .max(254, 'Email too long')
      .refine(email => !email.includes('+'), 'Plus addressing not allowed')
      .refine(email => !/\b(test|admin|root)\b/i.test(email), 'Reserved email addresses not allowed'),
    
    password: z.string()
      .min(12, 'Password must be at least 12 characters')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
             'Password must contain uppercase, lowercase, number and special character')
      .refine(password => !commonPasswords.includes(password.toLowerCase()), 
              'Password is too common'),
    
    firstName: z.string()
      .min(1, 'First name required')
      .max(50, 'First name too long')
      .regex(/^[a-zA-Z\s\-']+$/, 'First name contains invalid characters')
      .refine(name => !profanityFilter.isProfane(name), 'Inappropriate content detected'),
    
    lastName: z.string()
      .min(1, 'Last name required')
      .max(50, 'Last name too long')
      .regex(/^[a-zA-Z\s\-']+$/, 'Last name contains invalid characters')
      .refine(name => !profanityFilter.isProfane(name), 'Inappropriate content detected')
  }),

  // Secure content tracking with XSS prevention
  contentTracking: z.object({
    contentId: z.string().uuid('Invalid content ID'),
    status: z.enum(['watching', 'completed', 'planned', 'dropped']),
    rating: z.number().min(1).max(5).optional(),
    notes: z.string()
      .max(1000, 'Notes too long')
      .optional()
      .refine(notes => !notes || isCleanHTML(notes), 'HTML content not allowed')
      .refine(notes => !notes || !containsMaliciousPatterns(notes), 'Suspicious content detected'),
    episodeProgress: z.number().min(0).max(10000).optional()
  }),

  // Search query validation with injection prevention
  searchQuery: z.object({
    query: z.string()
      .min(1, 'Search query required')
      .max(100, 'Search query too long')
      .refine(query => !containsSQLPatterns(query), 'Invalid search terms')
      .refine(query => !containsXSSPatterns(query), 'Invalid search terms'),
    platforms: z.array(z.string().regex(/^[a-z0-9\-]+$/, 'Invalid platform name')).optional(),
    limit: z.number().min(1).max(50).default(20),
    offset: z.number().min(0).max(10000).default(0)
  })
};

// Security helper functions
function isCleanHTML(input: string): boolean {
  const cleaned = DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
  return cleaned === input;
}

function containsMaliciousPatterns(input: string): boolean {
  const maliciousPatterns = [
    /javascript:/i,
    /data:text\/html/i,
    /<script/i,
    /on\w+\s*=/i,
    /eval\s*\(/i,
    /expression\s*\(/i
  ];
  return maliciousPatterns.some(pattern => pattern.test(input));
}

function containsSQLPatterns(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
    /['"]\s*(OR|AND)\s*['"]/i,
    /;\s*(DROP|DELETE|INSERT|UPDATE)/i,
    /--/,
    /\/\*/
  ];
  return sqlPatterns.some(pattern => pattern.test(input));
}

function containsXSSPatterns(input: string): boolean {
  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i
  ];
  return xssPatterns.some(pattern => pattern.test(input));
}
```

### Rate Limiting and DDoS Protection

#### Multi-Layer Rate Limiting
```typescript
// Comprehensive rate limiting service
export class RateLimitingService {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL!);
  }

  // API endpoint rate limiting
  async checkApiRateLimit(userId: string, endpoint: string): Promise<RateLimitResult> {
    const key = `api_limit:${userId}:${endpoint}`;
    const limit = this.getEndpointLimit(endpoint);
    
    const current = await this.redis.incr(key);
    
    if (current === 1) {
      await this.redis.expire(key, 60); // 1 minute window
    }
    
    if (current > limit) {
      await this.logSecurityEvent({
        userId,
        eventType: 'RATE_LIMIT_EXCEEDED',
        metadata: { endpoint, attempts: current, limit }
      });
      
      throw new RateLimitError(`Rate limit exceeded for ${endpoint}`);
    }
    
    return {
      allowed: true,
      remaining: limit - current,
      resetTime: Date.now() + 60000
    };
  }

  // IP-based rate limiting for unauthenticated requests
  async checkIPRateLimit(ipAddress: string): Promise<RateLimitResult> {
    const key = `ip_limit:${ipAddress}`;
    const limit = 100; // 100 requests per minute per IP
    
    const current = await this.redis.incr(key);
    
    if (current === 1) {
      await this.redis.expire(key, 60);
    }
    
    if (current > limit) {
      await this.logSecurityEvent({
        eventType: 'IP_RATE_LIMIT_EXCEEDED',
        metadata: { ipAddress, attempts: current }
      });
      
      throw new RateLimitError('Too many requests from this IP');
    }
    
    return {
      allowed: true,
      remaining: limit - current,
      resetTime: Date.now() + 60000
    };
  }

  // Authentication attempt rate limiting
  async checkAuthRateLimit(identifier: string): Promise<boolean> {
    const key = `auth_limit:${identifier}`;
    const attempts = await this.redis.incr(key);
    
    if (attempts === 1) {
      await this.redis.expire(key, 900); // 15 minutes
    }
    
    if (attempts > 5) {
      // Lock account after 5 failed attempts
      await this.lockAccount(identifier);
      return false;
    }
    
    return true;
  }

  private getEndpointLimit(endpoint: string): number {
    const limits = {
      'content.search': 60,
      'content.track': 30,
      'auth.signin': 5,
      'auth.signup': 3,
      'user.export': 1
    };
    
    return limits[endpoint] || 30;
  }
}
```

### Security Monitoring and Incident Response

#### Real-time Security Monitoring
```typescript
// Security monitoring and alerting system
export class SecurityMonitoringService {
  private alertThresholds = {
    failedLogins: 10,
    suspiciousIPs: 5,
    dataExportRequests: 3,
    adminActions: 1
  };

  async monitorSecurityEvents(): Promise<void> {
    // Monitor failed login attempts
    const failedLogins = await this.getRecentEvents('FAILED_LOGIN', 5); // Last 5 minutes
    if (failedLogins.length > this.alertThresholds.failedLogins) {
      await this.sendSecurityAlert('HIGH_FAILED_LOGIN_RATE', {
        count: failedLogins.length,
        timeWindow: '5 minutes'
      });
    }

    // Monitor suspicious IP patterns
    const suspiciousIPs = await this.detectSuspiciousIPs();
    if (suspiciousIPs.length > 0) {
      await this.sendSecurityAlert('SUSPICIOUS_IP_ACTIVITY', {
        ips: suspiciousIPs
      });
    }

    // Monitor data export requests
    const exportRequests = await this.getRecentEvents('DATA_EXPORT_REQUEST', 60);
    if (exportRequests.length > this.alertThresholds.dataExportRequests) {
      await this.sendSecurityAlert('HIGH_DATA_EXPORT_RATE', {
        count: exportRequests.length,
        timeWindow: '1 hour'
      });
    }
  }

  async detectAnomalousActivity(userId: string): Promise<SecurityRisk[]> {
    const risks: SecurityRisk[] = [];
    const userEvents = await this.getUserSecurityEvents(userId, 24); // Last 24 hours

    // Check for unusual login patterns
    const loginEvents = userEvents.filter(e => e.event_type === 'LOGIN');
    const uniqueIPs = new Set(loginEvents.map(e => e.ip_address));
    if (uniqueIPs.size > 5) {
      risks.push({
        type: 'MULTIPLE_IP_LOGINS',
        severity: 'HIGH',
        description: `Logins from ${uniqueIPs.size} different IPs in 24 hours`
      });
    }

    // Check for unusual geographic patterns
    const locations = await this.getIPLocations([...uniqueIPs]);
    const uniqueCountries = new Set(locations.map(l => l.country));
    if (uniqueCountries.size > 3) {
      risks.push({
        type: 'MULTIPLE_COUNTRY_LOGINS',
        severity: 'CRITICAL',
        description: `Logins from ${uniqueCountries.size} different countries`
      });
    }

    // Check for rapid successive actions
    const rapidActions = this.detectRapidActions(userEvents);
    if (rapidActions.length > 0) {
      risks.push({
        type: 'RAPID_ACTIONS',
        severity: 'MEDIUM',
        description: 'Unusually rapid successive actions detected'
      });
    }

    return risks;
  }

  async respondToSecurityIncident(incident: SecurityIncident): Promise<void> {
    switch (incident.type) {
      case 'ACCOUNT_COMPROMISE':
        await this.handleAccountCompromise(incident);
        break;
      case 'DATA_BREACH':
        await this.handleDataBreach(incident);
        break;
      case 'DDOS_ATTACK':
        await this.handleDDoSAttack(incident);
        break;
      default:
        await this.logIncident(incident);
    }
  }

  private async handleAccountCompromise(incident: SecurityIncident): Promise<void> {
    // Immediately lock affected accounts
    for (const userId of incident.affectedUsers) {
      await this.lockAccount(userId);
      await this.revokeAllSessions(userId);
      await this.sendUserSecurityAlert(userId, 'ACCOUNT_LOCKED');
    }

    // Notify security team
    await this.sendSecurityAlert('ACCOUNT_COMPROMISE', {
      affectedUsers: incident.affectedUsers.length,
      incidentId: incident.id
    });
  }
}

// Security event types and interfaces
interface SecurityEvent {
  id: string;
  user_id?: string;
  event_type: string;
  ip_address?: string;
  user_agent?: string;
  metadata: Record<string, any>;
  risk_score: number;
  created_at: Date;
}

interface SecurityRisk {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
}

interface SecurityIncident {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affectedUsers: string[];
  description: string;
  detectedAt: Date;
}
```

### Vulnerability Assessment and Penetration Testing

#### Security Testing Framework
```typescript
// Automated security testing suite
export class SecurityTestSuite {
  async runSecurityTests(): Promise<SecurityTestReport> {
    const results: SecurityTestResult[] = [];

    // Test authentication bypass attempts
    results.push(await this.testAuthenticationBypass());
    
    // Test SQL injection vulnerabilities
    results.push(await this.testSQLInjection());
    
    // Test XSS vulnerabilities
    results.push(await this.testXSSVulnerabilities());
    
    // Test authorization flaws
    results.push(await this.testAuthorizationFlaws());
    
    // Test rate limiting effectiveness
    results.push(await this.testRateLimiting());

    return {
      testResults: results,
      overallScore: this.calculateSecurityScore(results),
      recommendations: this.generateRecommendations(results)
    };
  }

  private async testAuthenticationBypass(): Promise<SecurityTestResult> {
    const testCases = [
      { name: 'Empty JWT token', payload: '' },
      { name: 'Malformed JWT', payload: 'invalid.jwt.token' },
      { name: 'Expired JWT', payload: this.generateExpiredJWT() },
      { name: 'Tampered JWT', payload: this.generateTamperedJWT() }
    ];

    const results = await Promise.all(
      testCases.map(async testCase => {
        try {
          await this.makeAuthenticatedRequest(testCase.payload);
          return { ...testCase, passed: false, issue: 'Authentication bypass possible' };
        } catch (error) {
          return { ...testCase, passed: true, issue: null };
        }
      })
    );

    return {
      category: 'Authentication',
      passed: results.every(r => r.passed),
      details: results
    };
  }

  private async testSQLInjection(): Promise<SecurityTestResult> {
    const injectionPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM users --",
      "1; UPDATE users SET role='admin' WHERE id=1 --"
    ];

    const vulnerableEndpoints = [
      '/api/content/search',
      '/api/user/profile',
      '/api/tracking/list'
    ];

    const results = [];
    
    for (const endpoint of vulnerableEndpoints) {
      for (const payload of injectionPayloads) {
        try {
          const response = await this.makeRequest(endpoint, { query: payload });
          const isVulnerable = this.detectSQLInjectionSuccess(response);
          
          results.push({
            endpoint,
            payload,
            vulnerable: isVulnerable,
            response: isVulnerable ? response : null
          });
        } catch (error) {
          results.push({
            endpoint,
            payload,
            vulnerable: false,
            error: error.message
          });
        }
      }
    }

    return {
      category: 'SQL Injection',
      passed: !results.some(r => r.vulnerable),
      details: results
    };
  }
}
```

This comprehensive security architecture provides multiple layers of protection including authentication, authorization, encryption, input validation, rate limiting, monitoring, and incident response capabilities. The system is designed to protect against common vulnerabilities while maintaining usability and performance.

This architecture provides a robust, scalable foundation for the True Crime tracking app while maintaining development velocity through modern tooling like tRPC, Supabase, and Temporal.