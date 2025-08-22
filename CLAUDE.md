# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

True Crime tracking app that consolidates content from 200+ streaming services and cable networks. The app helps users track what they've watched and discover new content related to specific cases/killers.

## Tech Stack

### Frontend (Mobile) - Expo React Native
- **Location**: `TC-frontend/TrueCrime/`
- **Framework**: Expo SDK 53+ with React Native 0.79.5
- **Navigation**: Expo Router (file-based routing)
- **State Management**: Tanstack Query v5 + Zustand
- **API**: tRPC client for type-safe calls
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **TypeScript**: Strict mode enabled with path aliases (@/*)

### Frontend (Web) - Remix
- **Location**: `TC-web/` (to be created)
- **Framework**: Remix v2 with nested routing
- **Styling**: Tailwind CSS
- **Auth**: Remix Auth with Supabase
- **API**: tRPC client

### Backend
- **Location**: `TC-backend/` (to be implemented)
- **Stack**: Node.js 20 LTS + Fastify + TypeScript
- **API**: tRPC for type-safe endpoints
- **Database**: Supabase (PostgreSQL with RLS)
- **Search**: Meilisearch for instant search
- **Cache**: Redis for sessions and caching
- **Workflows**: Temporal for orchestration
- **Auth**: Supabase Auth

## Development Commands

### Frontend (Mobile)
```bash
cd TC-frontend/TrueCrime

# Install dependencies
npm install

# Start development server
npx expo start

# Platform-specific starts
npm run android    # Android emulator
npm run ios        # iOS simulator
npm run web        # Web browser

# Linting
npm run lint

# Type checking
npx tsc --noEmit

# Reset project to blank template
npm run reset-project
```

### Backend (When Implemented)
```bash
cd TC-backend

# Install dependencies
npm install

# Development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Database operations
npm run db:generate    # Generate Prisma client
npm run db:migrate     # Run database migrations
npm run db:seed        # Seed database with initial data

# Linting and type checking
npm run lint
npm run type-check

# Testing
npm run test
npm run test:watch
npm run test:coverage
```

### Recommended Development Workflow
```bash
# Start all services for development
npm run dev:all       # Start backend, web, and mobile in parallel

# Database management
npm run db:studio     # Open Prisma Studio
npm run db:reset      # Reset database with fresh schema

# Search index management
npm run search:sync   # Sync content to Meilisearch
npm run search:reset  # Reset search index

# Temporal workflows
npm run temporal:dev  # Start Temporal development server
npm run workflows:run # Execute content sync workflows
```

## Architecture

### Frontend Structure (Mobile)
- **app/**: File-based routing with Expo Router
  - **(tabs)/**: Tab navigation layout
  - **_layout.tsx**: Root and nested layouts
- **components/**: Reusable UI components
  - Theme-aware components (ThemedText, ThemedView)
  - UI primitives in components/ui/
- **hooks/**: Custom React hooks for theming and utilities
- **constants/**: App-wide constants including Colors
- **lib/**: tRPC client, utilities, and shared logic

### Backend Structure (Planned)
- **src/routers/**: tRPC router definitions
  - **auth.ts**: Authentication endpoints
  - **content.ts**: Content discovery and tracking
  - **social.ts**: Social features and sharing
- **src/services/**: Business logic services
- **src/lib/**: Utilities, database, and external API clients
- **src/workflows/**: Temporal workflow definitions
- **prisma/**: Database schema and migrations

### Key Features Architecture
1. **Authentication**: Supabase Auth with row-level security
2. **Content Discovery**: Meilisearch for instant search across platforms
3. **Data Sync**: Temporal workflows for reliable API integration
4. **Real-time Updates**: Supabase Realtime for social features
5. **Type Safety**: tRPC for end-to-end TypeScript contracts

### API Integrations
- **Primary**: Watchmode API (streaming availability)
- **Metadata**: TMDB API (content information)
- **Backup**: Reelgood + JustWatch APIs
- **Cable**: Gracenote API (TV listings)
- **Notifications**: Expo Push + Resend email

## Development Guidelines

### TypeScript Configuration
- Strict mode is enabled across all projects
- Use path alias `@/` for imports from project root
- Shared types via tRPC schema definitions
- All .ts and .tsx files are included in compilation

### Component Development
- Use themed components (ThemedText, ThemedView) for consistent styling
- Follow existing patterns in components/ directory
- Leverage Expo SDK features (haptics, blur, symbols)
- Implement responsive design for web and mobile

### API Development (Backend)
- All endpoints must be defined via tRPC routers
- Use Zod for input/output validation
- Implement proper error handling with typed errors
- Follow RESTful patterns where appropriate

### Database Guidelines
- Use Supabase row-level security for all user data
- Define relationships properly in Prisma schema
- Implement proper indexes for query performance
- Use JSONB for flexible data where needed

### Performance Considerations
- Implement Tanstack Query caching for all API calls
- Use Meilisearch for content search (not database full-text)
- Cache external API responses for 1-24 hours
- Implement proper database connection pooling

### Testing Strategy
- Unit tests for utility functions and services
- Integration tests for tRPC routers
- E2E tests for critical user flows
- Mock external APIs in test environment