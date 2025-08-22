📱 Mobile & Web Frontend
Expo React Native (Mobile)

Expo SDK 50+ with EAS Build & Updates
React Native 0.73+ with TypeScript
NativeWind (Tailwind CSS for React Native)
Expo Router for navigation
Tanstack Query v5 for API state management
Zustand for app state
tRPC client for type-safe API calls

Remix (Web)

Remix v2 with nested routing
Tailwind CSS (consistent with mobile)
Remix Auth for authentication
Shared TypeScript types with mobile via tRPC
Progressive enhancement & SSR

🖥️ Backend

Node.js 20 LTS + Fastify with TypeScript
PostgreSQL 15+ with Prisma ORM
Redis for caching and session storage
Supabase Auth for authentication
Temporal for workflow orchestration
tRPC server for type-safe APIs
Meilisearch for content search

☁️ Infrastructure

Supabase - Auth + Database + Realtime ($25/month)
Vercel - Web app hosting (free hobby plan)
Expo EAS - Mobile builds & OTA updates ($29/month)
Meilisearch Cloud - Search engine ($29/month for 100K docs)
Temporal Cloud - Workflow orchestration ($25/month starter)

🔌 API Integrations

// External APIs
- Watchmode API (primary streaming availability)
- TMDb API (movie/TV metadata)
- Reelgood API (backup availability)
- JustWatch API (international availability)
- Gracenote API (cable TV listings)

// Search & Discovery
- Meilisearch (instant search with typo tolerance)
- PostgreSQL with Prisma (relational queries)

// Notifications
- Expo Push Notifications (mobile)
- Web Push API (browser)
- Resend (transactional email)

🛠️ Development Tools

TypeScript across entire stack
tRPC for end-to-end type safety
Prisma for type-safe database access
Fastify with schema validation
ESLint + Prettier for code quality
Vitest for testing
Sentry for error tracking
GitHub Actions for CI/CD

📊 Key Technology Decisions

1. **Fastify over Express**: 2x performance improvement, built-in schema validation, better TypeScript support

2. **tRPC for API Layer**: Eliminates API contract bugs, automatic type sharing between frontend/backend

3. **Supabase for Backend Services**: Integrated auth, realtime subscriptions, row-level security - saves 200+ dev hours

4. **Remix over Next.js**: Better data loading patterns for content-heavy app, nested routing perfect for dashboard

5. **Meilisearch for Content Search**: Purpose-built for instant search, handles typos, faceted filtering for platforms/cases

6. **Temporal for Workflows**: Manages complex content sync across multiple APIs, built-in retry logic for flaky aggregators

7. **Tanstack Query v5**: Enhanced caching control for content availability updates

💰 Monthly Infrastructure Costs

- Supabase: $25/month (auth + database + realtime)
- Expo EAS: $29/month (mobile builds + OTA)
- Meilisearch Cloud: $29/month (100K documents)
- Temporal Cloud: $25/month (workflow orchestration)
- Vercel: $0 (free hobby tier)
- **Total: ~$108/month**

Note: Additional $58/month vs original budget, but includes auth, search, realtime, and workflow orchestration out-of-box - saves approximately 200-300 development hours.

🚀 Performance Targets

- App launch: <2 seconds
- Search response: <100ms (via Meilisearch)
- Deep-link success: 95%+
- API response: <500ms p99
- Workflow completion: 99.9% success rate