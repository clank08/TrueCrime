# True Crime Tracking App - Product Documentation

### Executive Summary
- **Elevator Pitch**: A Netflix-style tracker that helps True Crime fans find and remember what they've watched across all streaming services and cable channels
- **Problem Statement**: True Crime enthusiasts struggle to track content across 200+ streaming platforms and cable networks, leading to rewatching, missing new content, and inability to discover related material about specific cases or killers
- **Target Audience**: 
  - Primary: True Crime enthusiasts aged 25-55, primarily female (75%), middle to upper-middle income, heavy streaming users
  - Secondary: Casual viewers who watch 2-3 True Crime shows monthly
  - Tertiary: Content creators and podcasters researching cases
- **Unique Selling Proposition**: First unified platform combining streaming APIs with cable network integration, featuring case-based content discovery and privacy-first social features
- **Success Metrics**: 
  - User engagement: 70% monthly active users, 4+ sessions per week
  - Content tracking: Average 15 shows/docs tracked per user
  - Platform coverage: Integration with 10+ major streaming services + 5 cable networks
  - Social engagement: 30% of users participate in social features
  - Retention: 60% 6-month retention rate

### Feature Specifications

- **Feature**: Authentication & Onboarding
- **User Story**: As a new True Crime fan, I want to quickly set up my account with my streaming services, so that I can immediately start discovering and tracking content
- **Acceptance Criteria**:
  - Given a new user visits the app, when they sign up via email/social, then they complete setup in under 3 minutes
  - Given platform selection, when user connects streaming accounts, then deep links work for 95% of supported content
  - Given interest setup, when user selects categories, then personalized recommendations appear within 24 hours
  - Edge case handling for users without any streaming subscriptions (free content recommendations)
- **Priority**: P0 (Critical path for user activation)
- **Dependencies**: Supabase Auth for authentication, tRPC for type-safe APIs, third-party aggregator APIs (Watchmode, Reelgood, JustWatch)
- **Technical Constraints**: Aggregator API rate limits (Watchmode: 1000/day free tier), Temporal workflows handle retry logic automatically
- **UX Considerations**: Progressive disclosure of platform connections, clear value proposition at each step

---

- **Feature**: Unified Content Discovery
- **User Story**: As a True Crime enthusiast, I want to search for content about specific cases or killers across all my platforms, so that I don't miss relevant documentaries or series
- **Acceptance Criteria**:
  - Given a search query like "Ted Bundy", when user searches, then results show content from all connected platforms ranked by relevance
  - Given content results, when user clicks a title, then they're deep-linked to the correct platform at the right episode
  - Given filtering options, when user selects "Investigation Discovery only", then results are appropriately filtered
  - Edge case handling for content unavailable in user's region or subscription tier
- **Priority**: P0 (Core value proposition)
- **Dependencies**: Meilisearch for instant search, Watchmode API for availability, TMDB for metadata, Temporal for sync workflows
- **Technical Constraints**: <100ms search via Meilisearch, data freshness managed by Temporal workflows with smart scheduling
- **UX Considerations**: Clear availability indicators, fallback for broken deep links, search suggestions

---

- **Feature**: Personal Content Tracking
- **User Story**: As a viewer who watches multiple True Crime series, I want to track my progress and rate content, so that I can remember what I've seen and share recommendations
- **Acceptance Criteria**:
  - Given content discovery, when user adds to tracking, then status updates are saved within 1 second
  - Given rating system, when user rates 1-5 stars, then rating is recorded with optional review notes
  - Given progress tracking, when user marks episodes watched, then recommendations adjust accordingly
  - Edge case handling for content removed from platforms, bulk import from platform watch history
- **Priority**: P0 (Essential for retention)
- **Dependencies**: Supabase for user data with row-level security, tRPC for type-safe mutations, Redis for session management
- **Technical Constraints**: Real-time sync via Supabase Realtime, offline-first with Tanstack Query v5 persistence
- **UX Considerations**: Quick-add functionality, intuitive progress indicators, easy status modification

---

- **Feature**: Case-Based Content Organization
- **User Story**: As a True Crime researcher, I want to organize content by specific cases or suspects, so that I can deep-dive into particular stories and find comprehensive coverage
- **Acceptance Criteria**:
  - Given content tagging, when user tags shows with cases/suspects, then related content suggestions appear
  - Given case exploration, when user browses a specific case, then all related documentaries, series, and podcasts are grouped
  - Given content gaps, when limited content exists for a case, then user is notified of new additions
  - Edge case handling for cases with multiple names/spellings, disputed facts, or sensitive content
- **Priority**: P1 (Differentiating feature)
- **Dependencies**: Meilisearch for case indexing, PostgreSQL for relational data, Temporal for metadata enrichment workflows
- **Technical Constraints**: Meilisearch facets for case filtering, Temporal workflows for automated case matching
- **UX Considerations**: Visual case timelines, content type indicators (documentary vs. dramatization), fact vs. fiction labels

---

- **Feature**: Privacy-First Social Features
- **User Story**: As a social True Crime fan, I want to share recommendations with friends while maintaining privacy control, so that I can engage with the community without oversharing
- **Acceptance Criteria**:
  - Given privacy settings, when user joins, then all sharing is disabled by default with explicit opt-in
  - Given friend connections, when user shares a list, then recipients see content with availability for their platforms
  - Given community challenges, when user participates, then progress is visible only to opted-in connections
  - Edge case handling for users who want complete privacy, content that's inappropriate for sharing
- **Priority**: P1 (Community building for retention)
- **Dependencies**: Supabase row-level security for privacy, Supabase Realtime for friend activity, tRPC subscriptions
- **Technical Constraints**: GDPR compliance via Supabase policies, built-in RLS for granular privacy, data export via tRPC endpoints
- **UX Considerations**: Clear privacy indicators, easy sharing controls, optional community participation

---

- **Feature**: Smart Notifications & Alerts
- **User Story**: As a busy True Crime fan, I want to be notified about new content for cases I follow, so that I never miss relevant releases without being overwhelmed
- **Acceptance Criteria**:
  - Given followed cases, when new content is released, then user receives notification within 24 hours
  - Given cable programming, when Investigation Discovery airs new episodes, then reminders are sent 1 hour before
  - Given notification preferences, when user customizes frequency, then delivery matches their settings
  - Edge case handling for users in different time zones, duplicate content across platforms, breaking news about cases
- **Priority**: P2 (Engagement driver)
- **Dependencies**: Temporal workflows for content monitoring, Expo Push Notifications, Resend for email, Gracenote API
- **Technical Constraints**: Temporal ensures 99.9% delivery, Resend for email fallback, rate limiting via Fastify
- **UX Considerations**: Notification batching, clear unsubscribe options, preview without spoilers

### Requirements Documentation Structure

1. **Functional Requirements**

   **User Flows with Decision Points:**
   - Registration Flow: Email verification → Platform connection → Interest selection → Tutorial completion
   - Content Discovery Flow: Search/browse → Filter → Select → Add to tracking → Rate/review
   - Social Interaction Flow: Friend request → List creation → Share → Privacy check → Notification
   - Content Consumption Flow: Platform deep-link → Progress update → Related content suggestion → Add to queue

   **State Management Needs:**
   - User authentication state (logged in/out, permissions)
   - Content tracking state (watching/completed/planned, progress, ratings)
   - Platform connection state (authorized/expired/disconnected)
   - Social state (friends, privacy settings, shared lists)
   - Notification state (preferences, delivery status, read/unread)

   **Data Validation Rules:**
   - Email format validation with domain verification
   - Rating values must be 1-5 stars with optional decimal precision
   - Content notes limited to 500 characters with profanity filtering
   - Platform credentials validated on connection and refreshed automatically
   - Friend requests require mutual confirmation

   **Integration Points:**
   - Core Infrastructure:
     * Supabase - Authentication, database, realtime, row-level security
     * tRPC - Type-safe API layer between frontend and backend
     * Meilisearch - Instant search with typo tolerance
     * Temporal - Workflow orchestration for API syncs
   - Third-party aggregator APIs:
     * Watchmode API - Primary streaming availability
     * Reelgood API - Backup availability and deep-linking
     * JustWatch API - International availability data
     * TMDB API - Comprehensive metadata and images
   - Cable provider APIs:
     * Gracenote API - TV listings and schedules
   - Authentication & Notifications:
     * Supabase Auth - Email/social authentication
     * Expo Push Notifications - Mobile push
     * Resend - Transactional email

2. **Non-Functional Requirements**

   **Performance Targets:**
   - App launch time: Under 2 seconds on modern devices
   - Search response time: Under 100ms via Meilisearch
   - Platform deep-link success rate: 95% or higher
   - Data sync time: Real-time via Supabase Realtime
   - Image loading: Progressive with 1-second initial display

   **Scalability Needs:**
   - Support 100,000 concurrent users during peak hours
   - Handle 1M+ content items in Meilisearch index
   - Process 10,000+ API calls per minute via Temporal workflows
   - Store 50M+ user interactions (ratings, progress, notes)
   - Scale notification delivery to 1M+ daily messages

   **Security Requirements:**
   - OAuth 2.0 implementation for all third-party integrations
   - End-to-end encryption for personal notes and private lists
   - HTTPS enforcement for all API communications
   - Regular security audits and penetration testing
   - GDPR and CCPA compliance for data handling
   - Secure storage of streaming platform credentials

   **Accessibility Standards:**
   - WCAG 2.1 AA compliance for all user interfaces
   - Screen reader compatibility for blind users
   - Keyboard navigation support for motor-impaired users
   - High contrast mode for visually impaired users
   - Closed captioning preferences sync across platforms

3. **User Experience Requirements**

   **Information Architecture:**
   - Primary navigation: Dashboard, Discover, My Library, Social, Settings
   - Secondary navigation: Filters, sorting, search refinements
   - Content hierarchy: Platform → Genre → Series → Episodes
   - Case-based organization: Cases → Related Content → Cross-references

   **Progressive Disclosure Strategy:**
   - Level 1: Basic tracking (watch status, rating)
   - Level 2: Detailed notes and tagging
   - Level 3: Social features and sharing
   - Level 4: Advanced filtering and automation
   - Level 5: Community challenges and gamification

   **Error Prevention Mechanisms:**
   - Confirmation dialogs for irreversible actions (deleting lists, removing friends)
   - Auto-save for content notes and ratings
   - Offline mode for basic tracking functions
   - Graceful degradation when platforms are unavailable
   - Clear error messages with suggested solutions

   **Feedback Patterns:**
   - Immediate visual feedback for all user actions
   - Progress indicators for long-running operations
   - Success confirmations for completed actions
   - Loading states with estimated completion times
   - Empty states with clear next actions

### Critical Questions Checklist

- [x] **Are there existing solutions we're improving upon?**
  - Current solutions: TV Time, JustWatch, Letterboxd (for movies)
  - Our improvement: First to focus specifically on True Crime with case-based organization and cable integration
  - Competitive advantage: Deep domain expertise in True Crime content categorization

- [x] **What's the minimum viable version?**
  - MVP: User registration, 5 streaming platform integrations, basic content search, personal tracking (watch status, ratings), Netflix-style recommendations
  - Must exclude: Social features, cable integration, advanced case tagging, notifications
  - Success criteria: 1,000 active users tracking average of 10 shows each within 3 months

- [x] **What are the potential risks or unintended consequences?**
  - Content sensitivity: True Crime content may trigger trauma responses - implement content warnings
  - API dependency: Third-party aggregators may change pricing or restrict access - maintain multiple aggregator relationships (Watchmode + Reelgood + JustWatch)
  - Data accuracy: Aggregators may have stale data - implement cache invalidation and user reporting for incorrect availability
  - Platform blocking: Streaming services may block deep links - provide fallback search instructions
  - User safety: Private information sharing in social features - implement robust privacy controls
  - Content accuracy: Misinformation about ongoing cases - clearly label dramatizations vs. documentaries

- [x] **Have we considered platform-specific requirements?**
  - iOS: App Store content guidelines for True Crime content, TestFlight beta testing requirements
  - Android: Google Play content policies, variable device capabilities
  - Web: Browser compatibility, accessibility requirements, CORS handling for API integrations
  - Streaming platforms: Individual API rate limits, authentication requirements, content availability regions
  - Cable providers: Regional availability, authentication complexity, programming schedule accuracy

**Additional Considerations:**
- **Legal Requirements**: Content licensing compliance, user data protection laws, platform terms of service adherence
- **Content Moderation**: Community guidelines for social features, reporting mechanisms, automated content filtering
- **Monetization Strategy**: Freemium model considerations, premium feature definitions, advertising policy for sensitive content
- **International Expansion**: Content availability varies by region, platform presence differs globally, localization needs for UI and content metadata