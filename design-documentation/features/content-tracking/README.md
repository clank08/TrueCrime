# Content Tracking - Feature Design

---
title: Personal Content Tracking Experience Design
description: Track viewing progress, ratings, and personal notes across all True Crime content
feature: Content Tracking
last-updated: 2025-08-15
version: 1.0
related-files:
  - ../../design-system/style-guide.md
  - ../../design-system/components/progress.md
  - ../../design-system/components/ratings.md
dependencies:
  - Supabase for user data storage
  - Real-time sync capabilities
  - Offline-first architecture
  - Content metadata integration
status: approved
---

# Personal Content Tracking Experience Design

## Feature Overview

The content tracking feature enables users to maintain a comprehensive personal database of their True Crime viewing history, progress, ratings, and notes. This system serves as both a memory aid and a recommendation engine foundation, helping users avoid rewatching content while discovering new material aligned with their interests.

## User Experience Analysis

### Primary User Goal
Users want to effortlessly track what they've watched, are currently watching, and want to watch across all platforms, with the ability to rate and annotate content for future reference and sharing.

### Success Criteria
- Users track average 15+ shows/documentaries in their personal library
- 90% of content additions happen during or immediately after viewing
- Status updates save within 1 second across all devices
- 75% of users add ratings to content they've completed
- Personal notes feature used by 40% of active users

### Key Pain Points Addressed
- **Memory Management**: Eliminates guessing about what's been watched across platforms
- **Progress Tracking**: Clear indication of partially watched series and where to resume
- **Quality Assessment**: Personal rating system helps remember standout content
- **Research Documentation**: Note-taking capability for case details and personal reactions
- **Recommendation Foundation**: Personal data drives intelligent content suggestions

### User Personas Served
- **Primary**: Sarah tracks her extensive True Crime viewing across 6 streaming services
- **Secondary**: Mike maintains simple watched/not watched status for his casual viewing
- **Tertiary**: Jessica documents detailed notes about cases for her research and podcast content

## Information Architecture

### Content Organization Hierarchy
1. **Personal Library** - All tracked content organized by status and recency
2. **Status Categories** - Currently Watching, Want to Watch, Completed, Abandoned
3. **Content Details** - Individual tracking data including progress, rating, notes, dates
4. **Collection Views** - Recently added, highly rated, platform-specific groupings

### Tracking Data Structure
- **Core Status**: Not Started, Watching, Completed, Abandoned
- **Progress Tracking**: Episode/season progress for series content
- **Personal Ratings**: 1-5 star system with optional half-star precision
- **Viewing Dates**: Start date, completion date, last watched timestamp
- **Personal Notes**: Free-form text for case details, reactions, research notes
- **Platform Source**: Original viewing platform with ability to track platform switching

### Mental Model Alignment
Users approach content tracking similarly to:
- **Goodreads for books** - status tracking with ratings and reviews
- **Netflix "My List"** - personal queue with progress indicators
- **Music streaming favorites** - personal collection with rating and organization
- **Journal keeping** - personal notes and reflection space

The interface should feel like a personal digital library with the organizational tools users expect from content management systems.

### Progressive Disclosure Strategy
1. **Level 1**: Basic status tracking (watching, watched, want to watch)
2. **Level 2**: Progress tracking for series with episode-level granularity
3. **Level 3**: Rating system with personal review notes
4. **Level 4**: Advanced organization with custom lists and tags
5. **Level 5**: Social sharing, export options, and advanced analytics

## User Journey Mapping

### Core Experience Flow

#### Step 1: Content Addition to Tracking

**Trigger**: User discovers content through search/browse and decides to track it

**Entry Points**:
- From search results via "Add to List" quick action
- From content detail view via prominent "Track" button  
- From platform deep-links via "Mark as Watched" quick action
- From social recommendations via "Add to My List" option

**Visual Design**:
- **Quick Add Interface**: Floating action menu with status options
- **Typography**: Status options in H4 (18px/22px, 500) with clear visual hierarchy
- **Color Application**: Primary accent for selected status, secondary for options
- **Interactive Elements**: Large touch targets (48px minimum) with immediate feedback
- **Visual Hierarchy**: Status selection (60%), quick rating (25%), advanced options (15%)

**Available Actions**:
- **Primary**: Select tracking status (Want to Watch, Currently Watching, Completed)
- **Secondary**: Quick rating (1-5 stars) for completed content
- **Tertiary**: Add to custom list, set priority, add initial notes

**System Feedback**:
- **Immediate Confirmation**: Visual checkmark with "Added to [Status]" message
- **Status Badge**: Content card updates with tracking indicator
- **Sync Confirmation**: Cloud sync indicator shows successful save

#### Step 2: Progress Management

**Task Flow**: View current content → Update progress → Save with automatic sync

**Progress Tracking Interface**:
- **Series Content**: Episode-by-episode progress with season navigation
- **Film Content**: Simple watched/unwatched with completion date
- **Multi-part Documentaries**: Chapter or part-based progress tracking
- **Podcast Integration**: Episode progress where applicable

**Visual Design**:
- **Progress Indicators**: Circular progress for overall completion, linear for episode progress
- **Episode Grid**: Visual grid showing watched (filled), current (partial), unwatched (empty)
- **Typography**: Episode titles in Body (16px/24px, 400), progress in Caption (12px/16px, 400)
- **Color Coding**: Completed (Success #388E3C), In Progress (Primary #8B4B7F), Unwatched (Neutral)

**Interaction Specifications**:
- **Quick Mark**: Tap/click episode to toggle watched status
- **Bulk Actions**: Select multiple episodes for batch status updates
- **Progress Slider**: Fine-grained progress for partially watched episodes
- **Auto-sync**: Changes save immediately with offline capability

#### Step 3: Rating and Review

**Purpose**: Capture personal assessment for future reference and recommendations

**Rating Interface Design**:
- **Star Rating**: 5-star system with half-star precision via tap/drag
- **Quick Rating**: Prominent stars displayed immediately after marking content complete
- **Rating Context**: Visual scale indicators (1=Poor, 3=Good, 5=Excellent)
- **Historical Ratings**: Personal rating history accessible for comparison

**Review and Notes System**:
- **Quick Reactions**: Predefined tags (Shocking, Well-researched, Biased, Respectful)
- **Personal Notes**: Free-form text area for detailed thoughts and case details
- **Character Limit**: 500 characters for structured feedback, unlimited for personal notes
- **Privacy Controls**: Clear indication of what's private vs. potentially shareable

**Visual Treatment**:
- **Rating Stars**: Large interactive stars with hover/touch states
- **Notes Interface**: Clean text area with character count and formatting options
- **Quick Tags**: Chip-style selection with consistent visual treatment
- **Save Confirmation**: Clear feedback when rating/review is saved successfully

### Advanced Features & Edge Cases

#### Bulk Management
- **Multi-select Mode**: Select multiple content items for batch status updates
- **Import Options**: Bulk import from other tracking services (TV Time, Letterboxd)
- **Export Functionality**: Export personal library as CSV or PDF for backup
- **Platform Migration**: Move content between platforms when availability changes

#### Offline Capability
- **Local Storage**: All tracking data cached locally for offline access
- **Sync Queue**: Changes queued for sync when connectivity restored
- **Conflict Resolution**: Intelligent merging of changes from multiple devices
- **Data Persistence**: Critical tracking data survives app updates and reinstalls

#### Error Recovery
- **Sync Failures**: Clear indication when changes haven't synced with retry options
- **Data Loss Prevention**: Automatic local backup before major operations
- **Merge Conflicts**: User-friendly interface for resolving conflicting changes
- **Platform Changes**: Graceful handling when content moves between platforms

#### Power User Features
- **Custom Lists**: Create themed collections (Bundy docs, Unsolved cases, etc.)
- **Advanced Filtering**: Filter personal library by rating, platform, date, case type
- **Analytics Dashboard**: Personal viewing statistics and patterns
- **Social Integration**: Share lists and recommendations with privacy controls

## Screen-by-Screen Specifications

### Screen: Personal Library Overview

**Purpose**: Provide comprehensive view of user's tracked content with organization options

**Layout Structure**:
- Header with user stats (total tracked, currently watching count)
- Status filter tabs (All, Watching, Want to Watch, Completed)
- Content grid with sorting and view options
- Quick access to recent additions and highly rated content

**Content Strategy**:
- Prioritize "Currently Watching" content for easy resume access
- Surface highly rated content for recommendation sharing
- Show recent additions to highlight tracking activity
- Provide clear paths to discover new content

#### State: Default Library View

**Visual Design Specifications**:

*Header Statistics*:
- Layout: Horizontal card layout with key metrics
- Typography: H3 (20px/24px, 500) for numbers, Body (16px/24px, 400) for labels
- Metrics: "X Total Tracked", "X Currently Watching", "X Completed This Month"
- Visual treatment: Cards with subtle elevation and consistent spacing

*Status Filter Tabs*:
- Position: Sticky header below main navigation
- Active state: Primary color background with white text
- Inactive state: Transparent background with secondary text color
- Typography: Label style (14px/16px, 500) with subtle letter spacing

*Content Grid Layout*:
- Grid columns: 2 (mobile), 3 (tablet), 4 (desktop) with consistent spacing
- Card aspect ratio: 3:4 for poster-focused design
- Spacing: 16px gap between cards with 16px margins
- Infinite scroll: Load additional content as user scrolls

*Content Card Specifications*:
- Poster image: Full aspect ratio with 8px border radius
- Status indicator: Colored border or badge indicating current status
- Progress bar: Linear progress indicator for partially watched content
- Rating display: Star rating with numerical value for completed content
- Quick actions: Overlay actions on hover/long press

**Interaction Design Specifications**:

*Status Filtering*:
- Tab switching: Smooth animation with 250ms transition
- Content update: Fade out/in transition for grid content changes
- Active tab indicator: Underline animation that follows selection
- Badge counts: Live updating counts for each status category

*Content Actions*:
- Card tap: Navigate to detailed tracking view
- Long press/hover: Reveal quick action menu (edit status, rate, remove)
- Quick rating: Star rating overlay for immediate rating without navigation
- Batch selection: Long press to enter multi-select mode with batch actions

*Sort and View Options*:
- Sort dropdown: Recently added, Rating (high-low), Title (A-Z), Release date
- View toggle: Grid view vs. list view with different information density
- Search within library: Filter personal content by title, case, or notes
- Advanced filters: Platform, rating range, date range, content type

#### State: Currently Watching Focus

**Visual Adaptations**:
- Larger card size for currently watching content
- Progress information more prominent with "Continue Watching" CTAs
- Last watched timestamp: "Watched 2 days ago" with platform indicator
- Next episode information: Clear indication of what to watch next

**Resume Functionality**:
- "Continue Watching" buttons with direct platform deep-links
- Progress visualization: "Episode 3 of 8" or "45 minutes remaining"
- Platform switching: Option to continue on different platform if available
- Episode guide: Quick access to episode list with progress indicators

#### State: Empty Library

**First-Time User Experience**:
- Welcome message: "Start building your True Crime library"
- Quick start actions: "Search for content" and "Browse recommendations"
- Visual guidance: Animated illustrations showing how tracking works
- Sample content: Suggested popular True Crime titles to get started

**Visual Design for Empty State**:
- Illustration: Clean, welcoming graphic representing content tracking
- Typography: H2 heading with encouraging message and Body supporting text
- Call-to-action: Primary button leading to content discovery
- Secondary actions: Links to import from other services or browse curated lists

### Screen: Content Detail Tracking View

**Purpose**: Comprehensive tracking management for individual content items

**Layout Structure**:
- Content header with poster, title, and current tracking status
- Detailed progress tracking interface (episodes, seasons, completion)
- Rating and review section with personal notes
- Platform and viewing history information

#### State: Series Progress Tracking

**Episode Management Interface**:

*Season Navigation*:
- Season selector: Horizontal tabs or dropdown for multi-season content
- Episode count: "Season 1 of 3 • 8 episodes" clear progress context
- Season progress: Overall completion percentage for current season
- Navigation: Previous/next season buttons with keyboard support

*Episode Grid Layout*:
- Grid structure: 2 columns (mobile), 3 (tablet), 4+ (desktop)
- Episode cards: Thumbnail, title, air date, watched status
- Status indicators: Green checkmark (watched), play icon (current), empty (unwatched)
- Quick actions: Tap to toggle watched, long press for episode details

*Progress Visualization*:
- Overall progress: Circular progress indicator showing total completion
- Season progress: Linear progress bar for current season
- Timeline view: Optional linear view showing viewing progression over time
- Statistics: Total watch time, completion percentage, viewing frequency

**Interaction Specifications**:

*Episode Status Management*:
- Single tap: Toggle episode watched status with immediate visual feedback
- Bulk selection: Multi-select mode for marking multiple episodes
- Auto-progression: Option to auto-mark episodes as watched after deep-link returns
- Completion detection: Automatic series completion when final episode marked

*Notes and Annotations*:
- Episode notes: Individual episode commentary and observations
- Series notes: Overall thoughts and case analysis
- Case connections: Link to related content about the same case
- Research integration: Export notes for external research tools

#### State: Film/Documentary Tracking

**Simplified Progress Interface**:
- Binary status: Watched/unwatched with completion date
- Watch time: Total runtime and estimated viewing time
- Platform history: Record of where and when content was watched
- Rewatch tracking: History of multiple viewings with dates

**Rating and Review Focus**:
- Prominent rating interface: Large star rating with immediate feedback
- Review prompts: Guided questions about content quality and accuracy
- Content warnings: User-contributed warnings for sensitive material
- Recommendation tags: Quick tags for recommending to specific friend groups

#### State: Loading and Sync Status

**Data Synchronization Feedback**:
- Sync indicators: Cloud icon showing sync status (syncing, synced, error)
- Loading states: Skeleton screens for episode data and progress information
- Offline indication: Clear messaging when changes are queued for sync
- Error recovery: Retry options and troubleshooting for sync failures

**Performance Optimization**:
- Progressive loading: Critical information (status, rating) loads first
- Image optimization: Lazy loading for episode thumbnails and poster images
- Background sync: Non-critical data updates happen in background
- Cache management: Intelligent caching of frequently accessed tracking data

## Technical Implementation Guidelines

### Data Storage Strategy

**Local Storage (Offline-First)**:
- SQLite database for comprehensive local tracking data
- Real-time sync with Supabase for cloud backup and multi-device access
- Intelligent conflict resolution for simultaneous edits across devices
- Automatic data migration for app updates and schema changes

**Data Structure Requirements**:
```typescript
interface TrackedContent {
  id: string;
  contentId: string; // External content identifier
  userId: string;
  status: 'want_to_watch' | 'watching' | 'completed' | 'abandoned';
  rating?: number; // 1-10 scale (supports half-star precision)
  progress: {
    currentSeason?: number;
    currentEpisode?: number;
    watchedEpisodes: string[]; // Episode IDs
    completionPercentage: number;
  };
  dates: {
    added: Date;
    started?: Date;
    completed?: Date;
    lastWatched?: Date;
  };
  personalNotes?: string;
  tags: string[]; // User-defined tags and categories
  platform: string; // Platform where content was watched
  isPrivate: boolean; // Social sharing control
}
```

### Real-Time Sync Implementation

**Conflict Resolution Strategy**:
- Last-write-wins for simple status changes
- User-prompted resolution for conflicting ratings/notes
- Automatic merging for non-conflicting episode progress updates
- Version tracking for data integrity and audit trails

**Sync Performance Targets**:
- Status changes: Sync within 1 second of user action
- Progress updates: Batch sync every 30 seconds or on app backgrounding
- Notes/ratings: Immediate sync with local backup until confirmed
- Full library sync: Complete within 5 seconds on app launch

### Offline Capability Requirements

**Essential Offline Functions**:
- View complete personal library with all tracking information
- Update status, progress, and ratings with local persistence
- Add new content to tracking queues for later sync
- Access personal notes and ratings for reference

**Sync Queue Management**:
- Prioritized sync queue (status changes > progress > notes > new additions)
- Automatic retry logic with exponential backoff for failed syncs
- Clear user feedback for sync status and queued changes
- Manual sync trigger for users in low-connectivity scenarios

## Quality Assurance Checklist

### Core Tracking Functionality
- [ ] Status changes save within 1 second and sync across all devices
- [ ] Progress tracking accurate for all content types (series, films, podcasts)
- [ ] Rating system supports both quick ratings and detailed reviews
- [ ] Personal notes save reliably with proper character limit enforcement
- [ ] Bulk operations complete successfully without data loss

### Data Integrity and Sync
- [ ] Offline changes sync properly when connectivity restored
- [ ] Conflict resolution works intuitively without data loss
- [ ] Multi-device sync maintains consistency across all platforms
- [ ] Data export/import functions preserve all user data accurately
- [ ] Privacy controls function correctly for all sharing scenarios

### User Experience
- [ ] Library organization intuitive with effective filtering and sorting
- [ ] Content addition from discovery flows works seamlessly
- [ ] Progress indicators accurate and update in real-time
- [ ] Search within personal library returns relevant results quickly
- [ ] Empty states and onboarding guide users effectively

### Performance
- [ ] Personal library loads within 2 seconds on all supported devices
- [ ] Infinite scroll performs smoothly with large content libraries
- [ ] Image loading optimized with appropriate placeholder states
- [ ] Offline functionality provides full tracking capability
- [ ] Memory usage remains stable during extended library browsing

### Accessibility
- [ ] All tracking controls accessible via keyboard navigation
- [ ] Screen readers can navigate library and update content status
- [ ] Color-blind users can distinguish status indicators and progress
- [ ] Touch targets meet minimum size requirements (44px) on mobile
- [ ] Focus management maintains context during status changes

## Related Documentation

### Design Foundations
- [User Personas](../../user-personas.md) - Tracking needs for completionists and casual users
- [User Flows](../../user-flows.md) - Content management flow mappings
- [User Stories](../../user-stories.md) - Tracking requirements and acceptance criteria
- [Interaction Patterns](../../interaction-patterns.md) - List management and progress tracking patterns

### Design System
- [Design System Style Guide](../../design-system/style-guide.md) - Foundation design elements
- [Component Specifications](../../design-system/components/README.md) - Progress and rating component implementations
- [Progress Components](../../design-system/components/progress.md) - Progress indicator patterns
- [Rating Components](../../design-system/components/ratings.md) - Rating system specifications

### Related Features
- [Content Discovery Flow](../content-discovery/README.md) - Integration with discovery experience
- [Social Features](../social-features/README.md) - Sharing tracked content

## Implementation Notes

The content tracking feature serves as the core retention driver for the True Crime app, transforming casual browsers into engaged users with valuable personal data. The design emphasizes effortless data capture while providing sophisticated organization and analysis tools for power users.

Special attention has been paid to the offline-first architecture, ensuring users can maintain their tracking habits regardless of connectivity. The real-time sync system balances immediate feedback with efficient data usage.

The rating and review system respects the sensitive nature of True Crime content while enabling users to share thoughtful recommendations within their social circles.

## Last Updated

August 15, 2025 - Initial comprehensive design specification for personal content tracking experience, including progress management, ratings, and social integration considerations.