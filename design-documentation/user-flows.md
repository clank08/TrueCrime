# True Crime App - User Flows

## Overview

Comprehensive user flows for critical app experiences, designed to minimize friction while maintaining sensitivity to content nature and user safety. Each flow includes decision points, error states, and accessibility considerations.

## Flow 1: Onboarding & Setup

### Primary Flow: New User Registration

**Entry Point**: App launch (first time)
**User Goal**: Get set up to start discovering True Crime content
**Success Criteria**: User has account, selected streaming services, and configured content preferences

```
Start: App Launch (First Time)
↓
1. Welcome Screen
   - App introduction and value proposition
   - "Get Started" CTA button
   - Privacy policy and terms links
   ↓
2. Account Creation
   - Email/phone input
   - Password creation
   - Social sign-up options (Google, Apple)
   ↓
   [Branch: Email Verification Required]
   ├─ Send verification email
   ├─ User checks email
   ├─ Click verification link
   └─ Return to app
   ↓
3. Content Sensitivity Preferences
   - Content warning preferences
   - Graphic content filters
   - Age-appropriate content settings
   - "I understand the nature of True Crime content" acknowledgment
   ↓
4. Streaming Service Selection
   - List of 200+ supported services
   - "Select your subscriptions" instruction
   - Search/filter for services
   - Optional: "Skip for now" link
   ↓
5. Interest Selection
   - Case type preferences (serial killers, cold cases, etc.)
   - Content type preferences (documentaries, series, podcasts)
   - Era/time period interests
   - Geographic region interests
   ↓
6. Notification Preferences
   - New content alerts
   - Case updates
   - Social notifications
   - Email newsletter opt-in
   ↓
7. Privacy Settings
   - Profile visibility settings
   - Activity sharing preferences
   - Default list privacy
   - Social feature opt-ins
   ↓
8. Welcome Complete
   - Setup summary
   - "Start Exploring" CTA
   - Quick tour offer
   ↓
End: Home Screen (Personalized)
```

**Error Handling**:
- **Network Issues**: Offline mode with sync when reconnected
- **Verification Failures**: Resend options with alternative verification methods
- **Invalid Input**: Inline validation with helpful error messages
- **Setup Abandonment**: Progress saving with easy resume

**Accessibility Notes**:
- Screen reader announcements for each step
- Keyboard navigation throughout entire flow
- High contrast support for text and form inputs
- Large touch targets for mobile interaction

---

## Flow 2: Content Discovery

### Primary Flow: Finding Something to Watch

**Entry Point**: Home screen or Search tab
**User Goal**: Discover relevant True Crime content to watch
**Success Criteria**: User finds content and takes action (adds to watchlist or starts watching)

```
Start: Home Screen
↓
Decision Point: Discovery Method
├─ Browse Recommendations
│  ↓
│  1. View Personalized Recommendations
│     - "Recommended for You" section
│     - Algorithm-based suggestions
│     - "Why recommended?" explanations
│     ↓
│  2. Content Card Interaction
│     - Tap for details or quick actions
│     - Long press for context menu
│     ↓
│     [Branch: Quick Actions]
│     ├─ Add to Watchlist → Success confirmation
│     ├─ Share → Share sheet options
│     ├─ Not Interested → Remove from recommendations
│     └─ View Details → Continue to Content Detail
│
├─ Search for Specific Content
│  ↓
│  1. Search Entry
│     - Tap search bar
│     - Enter search terms or select suggested searches
│     - Auto-complete and search suggestions
│     ↓
│  2. Search Results
│     - Content grid/list view
│     - Filter and sort options
│     - "No results" state with suggestions
│     ↓
│  3. Refine Search (if needed)
│     - Apply filters (content type, streaming service, era)
│     - Modify search terms
│     - Browse suggested categories
│     ↓
│  4. Select Content → Continue to Content Detail
│
└─ Browse Categories
   ↓
   1. Category Selection
      - Featured categories on home
      - Full browse menu
      - Case-based browsing
      ↓
   2. Category Content Grid
      - Paginated results
      - Sort options (popularity, date, rating)
      - Filter refinements
      ↓
   3. Content Selection → Continue to Content Detail

Content Detail Screen:
↓
1. Content Information Review
   - Content warnings displayed prominently
   - Streaming availability status
   - Description, cast, ratings
   - Related content suggestions
   ↓
2. User Decision
   ├─ Add to Watchlist
   │  ├─ Quick add to default watchlist
   │  └─ Choose specific list (if user has custom lists)
   ├─ Watch Now
   │  ├─ Available on user's service → Deep link to app
   │  ├─ Available elsewhere → Show options (rent/buy)
   │  └─ Not available → Add to watchlist with notification setup
   ├─ Share Content
   │  └─ Share sheet with platform options
   └─ Not Interested
      └─ Remove from recommendations, improve algorithm
↓
End: Action completed with confirmation
```

**Advanced Discovery Flow: Case-Based Exploration**

```
Start: Case Detail Page (from search or recommendation)
↓
1. Case Overview
   - Timeline of events
   - Key figures and locations
   - Case status (solved/unsolved/ongoing)
   ↓
2. Related Content Exploration
   - Content organized by type (documentaries, series, podcasts)
   - Content organized by perspective (victim-focused, investigation-focused)
   - Content organized by credibility (journalistic vs. entertainment)
   ↓
3. Content Comparison
   - Side-by-side content comparison
   - Fact vs. dramatization indicators
   - User ratings and reviews specific to accuracy
   ↓
4. Multi-Content Selection
   - Add entire case collection to watchlist
   - Create custom "Case Study" list
   - Schedule watching order recommendations
   ↓
End: Case-based content queue created
```

---

## Flow 3: Content Tracking & Management

### Primary Flow: Managing Personal Content

**Entry Point**: My Lists tab or content detail screen
**User Goal**: Organize and track True Crime content consumption
**Success Criteria**: User successfully manages their content lists and viewing progress

```
Start: My Lists Screen
↓
1. Current State Review
   - Continue watching section
   - Watchlist overview
   - Recently completed content
   - Custom lists summary
   ↓
2. List Management Actions
   ├─ Continue Watching
   │  ↓
   │  1. Select Content to Resume
   │     - Progress indicator visible
   │     - Time remaining estimate
   │     - Quick episode selection (for series)
   │     ↓
   │  2. Resume Options
   │     ├─ Watch Now → Deep link to streaming service
   │     ├─ Mark as Completed → Update progress to 100%
   │     ├─ Remove from Continue Watching → Clear progress
   │     └─ Add Notes → Personal annotation feature
   │
   ├─ Watchlist Management
   │  ↓
   │  1. Watchlist Overview
   │     - Total items count
   │     - Sort options (date added, alphabetical, priority)
   │     - Bulk selection mode toggle
   │     ↓
   │  2. Individual Item Actions
   │     ├─ Watch Now → Check availability and deep link
   │     ├─ Move to Different List → Select destination list
   │     ├─ Remove from Watchlist → Confirmation dialog
   │     ├─ Add Priority → Set viewing priority (high/medium/low)
   │     └─ Share Item → Social sharing options
   │     ↓
   │  3. Bulk Actions (if enabled)
   │     ├─ Mark Multiple as Watched
   │     ├─ Move Multiple to Different List
   │     ├─ Remove Multiple Items
   │     └─ Create New List from Selection
   │
   └─ Custom Lists
      ↓
      1. List Selection
         - Existing custom lists
         - "Create New List" option
         - List privacy indicators
         ↓
      2. List Actions
         ├─ Create New List
         │  ├─ List name input
         │  ├─ Description (optional)
         │  ├─ Privacy settings (private/friends/public)
         │  ├─ Initial content addition
         │  └─ Save and create
         ├─ Edit Existing List
         │  ├─ Rename list
         │  ├─ Change description
         │  ├─ Modify privacy settings
         │  ├─ Reorder content
         │  └─ Delete list (with confirmation)
         └─ Share List
            ├─ Generate shareable link
            ├─ Social media sharing
            ├─ Direct user sharing
            └─ Export list data

Progress Tracking Flow:
↓
1. Manual Progress Update
   - Series: Episode-by-episode tracking
   - Movies/Documentaries: Percentage completion
   - Podcasts: Episode tracking with time stamps
   ↓
2. Automatic Progress Sync
   - Integration with streaming service APIs
   - Periodic sync and conflict resolution
   - Manual override options
   ↓
3. Completion Actions
   - Rate content (1-5 stars)
   - Write review (optional)
   - Add to "Completed" list
   - Recommend to friends
   - Find related content
   ↓
End: Updated tracking data and recommendations
```

### Secondary Flow: Content Rating & Review

```
Start: Content Completion or Manual Rating
↓
1. Rating Interface
   - 5-star rating system
   - Quick rating with tap interaction
   - Optional detailed review prompt
   ↓
2. Review Categories
   ├─ Overall Quality
   ├─ Factual Accuracy (for documentaries)
   ├─ Emotional Impact
   ├─ Production Value
   └─ Recommendation Level
   ↓
3. Private Notes
   - Personal thoughts and observations
   - Case-specific insights
   - Content warnings for personal reference
   ↓
4. Public Review (Optional)
   - Share review with community
   - Spoiler warning options
   - Review guidelines reminder
   ↓
5. Review Submission
   - Privacy level confirmation
   - Edit/delete options explanation
   - Community guidelines agreement
   ↓
End: Rating and review saved
```

---

## Flow 4: Social Features & Sharing

### Primary Flow: Sharing Content Recommendations

**Entry Point**: Content detail screen or list items
**User Goal**: Share True Crime content with friends or community
**Success Criteria**: Content is successfully shared with appropriate context and privacy

```
Start: Content Detail Screen
↓
1. Share Action Trigger
   - Share button tap
   - Context menu selection
   - Long press action
   ↓
2. Share Context Setup
   - Add personal message/recommendation
   - Include content warnings in share
   - Select sharing audience
   ↓
3. Sharing Method Selection
   ├─ Platform Sharing
   │  ├─ Text message with link
   │  ├─ Email with formatted content
   │  ├─ Social media platforms
   │  └─ Copy link to clipboard
   │
   ├─ In-App Social Sharing
   │  ├─ Share with specific app friends
   │  ├─ Post to personal activity feed
   │  ├─ Add to community discussion
   │  └─ Share with True Crime groups
   │
   └─ List Sharing
      ├─ Add to shared watchlist
      ├─ Create collaborative list
      ├─ Share entire custom list
      └─ Export list for external sharing
   ↓
4. Privacy & Content Verification
   - Confirm content warnings are included
   - Verify recipient appropriateness
   - Privacy level confirmation
   ↓
5. Share Execution
   - Platform-specific sharing format
   - Track share for analytics (privacy-respecting)
   - Confirmation of successful share
   ↓
End: Content shared with confirmation
```

### Community Interaction Flow

```
Start: Community/Social Section
↓
1. Community Entry Point
   ├─ Following Feed → See friends' activity
   ├─ Discussions → Content-based conversations
   ├─ Reviews → Community ratings and reviews
   └─ Groups → Interest-based communities
   ↓
2. Content Interaction
   ├─ Comment on Posts
   │  ├─ Reply to existing discussions
   │  ├─ Add thoughtful commentary
   │  ├─ Include spoiler warnings
   │  └─ Report inappropriate content
   │
   ├─ React to Content
   │  ├─ Upvote helpful comments
   │  ├─ Save interesting recommendations
   │  ├─ Follow interesting users
   │  └─ Share within community
   │
   └─ Create New Discussion
      ├─ Select topic/content focus
      ├─ Add discussion prompt
      ├─ Set community guidelines reminder
      ├─ Include relevant content warnings
      └─ Publish to appropriate community
   ↓
3. Community Moderation
   - Report inappropriate content
   - Block problematic users
   - Appeal moderation decisions
   - Request community support
   ↓
End: Positive community interaction
```

---

## Flow 5: Search & Filtering

### Primary Flow: Advanced Content Search

**Entry Point**: Search tab or search bar anywhere in app
**User Goal**: Find specific True Crime content using various criteria
**Success Criteria**: User finds relevant content that matches their search intent

```
Start: Search Interface
↓
1. Search Query Input
   ├─ Text Search
   │  ├─ Natural language queries
   │  ├─ Specific case names
   │  ├─ Criminal names
   │  └─ Location-based searches
   │
   ├─ Voice Search (if supported)
   │  ├─ Voice input recognition
   │  ├─ Query confirmation
   │  └─ Conversion to text search
   │
   └─ Visual Search
      ├─ Browse suggested categories
      ├─ Popular search terms
      └─ Trending searches
   ↓
2. Initial Search Results
   - Relevance-ranked results
   - Quick filter chips (content type, availability)
   - Search suggestions if few results
   ↓
3. Search Refinement
   ├─ Apply Filters
   │  ├─ Content Type (Documentary, Series, Podcast, etc.)
   │  ├─ Streaming Availability (User's services only)
   │  ├─ Release Date Range
   │  ├─ Case Era/Time Period
   │  ├─ Geographic Location
   │  ├─ Case Status (Solved/Unsolved)
   │  ├─ Content Rating/Quality
   │  └─ User Ratings
   │
   ├─ Sort Options
   │  ├─ Relevance (default)
   │  ├─ Most Recent
   │  ├─ Highest Rated
   │  ├─ Most Popular
   │  ├─ Alphabetical
   │  └─ Shortest/Longest
   │
   └─ View Options
      ├─ Grid view (visual content cards)
      ├─ List view (detailed information)
      ├─ Compact view (more items visible)
      └─ Detail view (extensive metadata)
   ↓
4. Search Results Interaction
   ├─ Content Selection → Go to Content Detail
   ├─ Quick Actions (Add to Watchlist, Share)
   ├─ Save Search → Create search alert
   ├─ Refine Search → Modify query or filters
   └─ Clear Search → Return to browse mode
   ↓
End: Relevant content discovered or search refined
```

### Advanced Search Flow: Case-Based Research

```
Start: Advanced Search Mode
↓
1. Research Intent Selection
   ├─ Specific Case Investigation
   ├─ Criminal Profile Research
   ├─ Geographic Crime Patterns
   ├─ Time Period Analysis
   └─ Content Type Comparison
   ↓
2. Multi-Criteria Search Setup
   - Primary search terms
   - Secondary filter criteria
   - Exclusion criteria (what NOT to include)
   - Quality/credibility requirements
   ↓
3. Search Execution & Results
   - Comprehensive results across all content types
   - Credibility indicators (journalistic vs. entertainment)
   - Cross-referencing with case databases
   - Related search suggestions
   ↓
4. Research Organization
   - Save search as research project
   - Create dedicated list for findings
   - Export results for external reference
   - Set up alerts for new matching content
   ↓
End: Comprehensive research results organized
```

---

## Error States & Recovery Flows

### Network Connectivity Issues

```
Network Error Detected
↓
1. Error Communication
   - Clear error message
   - Explanation of what's affected
   - Estimated resolution time (if known)
   ↓
2. Offline Mode Activation
   - Switch to cached content
   - Indicate offline status clearly
   - Show available offline features
   ↓
3. Background Recovery
   - Monitor connectivity
   - Auto-retry failed operations
   - Sync data when connection restored
   ↓
4. Recovery Notification
   - Inform user when connection restored
   - Resume interrupted operations
   - Sync any offline changes
   ↓
End: Normal operation resumed
```

### Content Unavailability

```
Content Not Available
↓
1. Availability Check
   - Verify current streaming status
   - Check user's service subscriptions
   - Identify alternative availability
   ↓
2. Alternative Options
   ├─ Available on Other Services → Show options
   ├─ Available for Rent/Purchase → Show pricing
   ├─ Coming Soon → Set availability alert
   └─ No Longer Available → Show similar content
   ↓
3. User Action
   - Add to watchlist with notification
   - Subscribe to new service (external)
   - Find alternative content
   - Request availability alert
   ↓
End: User has path forward despite unavailability
```

### Search No Results

```
No Search Results Found
↓
1. Search Analysis
   - Check for typos or spelling errors
   - Analyze search complexity
   - Determine if filters too restrictive
   ↓
2. Helpful Suggestions
   - "Did you mean..." suggestions
   - Broaden search recommendations
   - Remove some filters suggestion
   - Related search terms
   ↓
3. Alternative Discovery
   - Browse similar categories
   - Show trending content
   - Suggest popular searches
   - Offer to save search for future alerts
   ↓
End: User redirected to productive discovery path
```

## Accessibility Considerations

### Screen Reader Support
- Descriptive labels for all interactive elements
- Status announcements for state changes
- Logical reading order throughout flows
- Alternative text for visual content

### Keyboard Navigation
- Tab order follows logical flow progression
- Keyboard shortcuts for common actions
- Focus indicators clearly visible
- Skip links for efficient navigation

### Motor Accessibility
- Large touch targets (minimum 44x44px)
- Gesture alternatives for complex interactions
- Voice input support where applicable
- Reduced motion options for animations

### Cognitive Accessibility
- Clear progress indicators in multi-step flows
- Consistent navigation patterns
- Simple language and clear instructions
- Undo options for destructive actions

## Performance Considerations

### Critical Path Optimization
- Prioritize essential functionality loading
- Progressive enhancement for advanced features
- Lazy loading for secondary content
- Efficient state management

### Caching Strategy
- Cache user preferences and lists
- Intelligent content prefetching
- Offline mode for core functionality
- Sync optimization for cross-device usage

## Success Metrics

### Flow Completion Rates
- **Onboarding**: 85%+ complete full setup
- **Content Discovery**: 70%+ find and act on content
- **List Management**: 90%+ successfully manage lists
- **Search**: 80%+ successful search sessions
- **Sharing**: 95%+ successful share actions

### User Satisfaction
- **Task Efficiency**: Average 30% faster than alternatives
- **Error Recovery**: 95%+ successful error resolution
- **Accessibility**: 100% compliance with WCAG 2.1 AA
- **User Feedback**: 4.5+ star rating for core flows

---

## Related Documentation

### Design Foundations
- [User Personas](user-personas.md) - User profiles that drive these flow decisions
- [User Stories](user-stories.md) - Detailed requirements for each flow
- [Information Architecture](information-architecture.md) - Navigation structure supporting these flows
- [Interaction Patterns](interaction-patterns.md) - Detailed interaction specifications

### Feature Implementation
- [Authentication & Onboarding](features/authentication/README.md) - Onboarding flow implementation details
- [Content Discovery](features/content-discovery/README.md) - Discovery flow specifications
- [Content Tracking](features/content-tracking/README.md) - Tracking and management flow details
- [Social Features](features/social-features/README.md) - Social sharing flow implementation
- [Case Organization](features/case-organization/README.md) - Case-based flow patterns

### Component Specifications
- [Search Components](design-system/components/search.md) - Search interface patterns
- [Form Components](design-system/components/forms.md) - Form flow interactions
- [Progress Components](design-system/components/progress.md) - Progress tracking patterns
- [Card Components](design-system/components/cards.md) - Content card interactions

---

*These user flows serve as the blueprint for implementing intuitive, accessible, and efficient user experiences throughout the True Crime tracking app, ensuring users can accomplish their goals while respecting the sensitive nature of the content.*

*Last Updated: August 19, 2025*
*Next Review: November 19, 2025*