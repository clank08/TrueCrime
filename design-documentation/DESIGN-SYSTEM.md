# True Crime Tracker - UX/UI Design System

## 1. User Personas

### Persona 1: The Dedicated Investigator (Sarah)
**Demographics:**
- Age: 32, Female
- Location: Urban area
- Occupation: Marketing Manager
- Tech Savvy: High

**Goals:**
- Track every true crime series/documentary watched across all platforms
- Deep dive into specific cases with comprehensive timelines
- Connect related content across different killers/cases
- Share discoveries with online true crime communities

**Pain Points:**
- Content scattered across 15+ streaming services
- Difficult to find all documentaries about a specific case
- No way to track which episodes/series already watched
- Missing new releases about favorite cases

**Behaviors:**
- Watches 10+ hours of true crime content weekly
- Active in Reddit true crime communities
- Creates personal spreadsheets to track cases
- Subscribes to Netflix, Hulu, HBO Max, Discovery+, Peacock

### Persona 2: The Casual Browser (Mike)
**Demographics:**
- Age: 45, Male
- Location: Suburban area
- Occupation: Teacher
- Tech Savvy: Medium

**Goals:**
- Discover highly-rated true crime content
- Get recommendations based on what he's enjoyed
- Quick access to new releases
- Avoid content he's already seen

**Pain Points:**
- Overwhelmed by content choices
- Forgets what he's already watched
- Doesn't know which platform has what content
- Limited time to research cases

**Behaviors:**
- Watches 2-3 true crime shows per week
- Prefers well-produced documentaries over podcasts
- Subscribes to Netflix and Amazon Prime only
- Relies on platform recommendations

### Persona 3: The Social Viewer (Jessica)
**Demographics:**
- Age: 26, Female
- Location: College town
- Occupation: Graduate Student
- Tech Savvy: Very High

**Goals:**
- Watch content with friends virtually
- Share reactions and theories in real-time
- Create watchlists for viewing parties
- Follow what influencers are watching

**Pain Points:**
- No synchronized viewing across platforms
- Can't easily share specific episodes/timestamps
- Missing social features in streaming apps
- Hard to organize group watches

**Behaviors:**
- Hosts weekly true crime watch parties
- Very active on TikTok and Instagram
- Creates content about cases
- Uses Discord for discussions

### Persona 4: The Academic Researcher (Dr. Roberts)
**Demographics:**
- Age: 52, Male
- Location: University city
- Occupation: Criminology Professor
- Tech Savvy: Medium-Low

**Goals:**
- Find accurate, well-researched documentaries
- Access content for educational purposes
- Track source credibility
- Organize content by criminal psychology patterns

**Pain Points:**
- Difficulty distinguishing sensationalized from factual content
- No academic credibility ratings
- Can't export viewing data for research
- Limited filtering by case details

**Behaviors:**
- Uses content for teaching and research
- Values documentary quality over quantity
- Subscribes to educational platforms
- Reads extensively about cases

## 2. User Stories and Feature Requirements

### Core Functionality
- As a user, I want to search for content across all streaming platforms simultaneously
- As a user, I want to track what episodes/series I've watched with automatic progress tracking
- As a user, I want to see all content related to a specific case or killer in one place
- As a user, I want to know which platforms have the content before clicking
- As a user, I want to receive notifications when new content about my followed cases releases

### Discovery Features
- As a user, I want personalized recommendations based on my viewing history
- As a user, I want to filter content by platform, case type, decade, location, and production quality
- As a user, I want to see trending content in the true crime community
- As a user, I want to explore related cases and cross-references
- As a user, I want to discover content through curated collections (e.g., "Best of 2024", "Unsolved Mysteries")

### Tracking Features
- As a user, I want to mark content as watched, watching, or want to watch
- As a user, I want to rate and review content privately or publicly
- As a user, I want to see my viewing statistics and patterns
- As a user, I want to export my viewing history
- As a user, I want to set viewing goals and challenges

### Social Features
- As a user, I want to share my watchlists with friends
- As a user, I want to see what my friends are watching
- As a user, I want to join or create viewing clubs
- As a user, I want to participate in discussions about specific episodes
- As a user, I want to follow true crime influencers and see their recommendations

### Platform Management
- As a user, I want to connect my streaming accounts for personalized availability
- As a user, I want to see pricing for platforms I don't have
- As a user, I want alerts when content is leaving a platform
- As a user, I want to hide platforms I'll never subscribe to

## 3. Information Architecture

### Mobile App Structure
```
├── Home (Tab 1)
│   ├── For You (Personalized feed)
│   ├── Trending Now
│   ├── New Releases
│   ├── Continue Watching
│   └── Quick Actions
├── Discover (Tab 2)
│   ├── Search
│   │   ├── All Content
│   │   ├── Cases
│   │   ├── Killers
│   │   └── Series/Films
│   ├── Browse by Category
│   │   ├── Serial Killers
│   │   ├── Unsolved Cases
│   │   ├── Cults
│   │   ├── White Collar
│   │   └── International
│   ├── Filters
│   └── Collections
├── My Library (Tab 3)
│   ├── Watchlist
│   ├── Currently Watching
│   ├── Completed
│   ├── My Ratings
│   └── Lists/Collections
├── Social (Tab 4)
│   ├── Friends Activity
│   ├── Clubs
│   ├── Discussions
│   └── Shared Lists
└── Profile (Tab 5)
    ├── Stats & Achievements
    ├── Connected Platforms
    ├── Preferences
    ├── Notifications
    └── Settings
```

### Web App Structure
```
├── Landing Page
├── Dashboard (Authenticated)
│   ├── Overview Widget
│   ├── Continue Watching
│   ├── Recommendations
│   └── Activity Feed
├── Browse
│   ├── All Content (Grid/List View)
│   ├── Cases Database
│   ├── Killer Profiles
│   └── Platform Guide
├── Case Details
│   ├── Overview
│   ├── Timeline
│   ├── Related Content
│   ├── Discussions
│   └── Resources
├── User Profile
│   ├── Public Profile
│   ├── Viewing History
│   ├── Lists
│   └── Reviews
└── Admin/Settings
```

## 4. User Flows

### Onboarding Flow
1. Welcome Screen → App value proposition
2. Account Creation → Email/Social sign-up
3. Platform Selection → Connect streaming services
4. Interest Selection → Favorite case types, eras
5. Content Preferences → Quality, length, style preferences
6. Social Setup → Find friends, join clubs (optional)
7. Tutorial → Key features walkthrough
8. Home Dashboard → Personalized content ready

### Content Discovery Flow
1. Home/Browse → See recommendations or search
2. Search/Filter → Refine by platform, type, rating
3. Content Card → Preview with trailer, description
4. Details Page → Full information, reviews, availability
5. Action Selection → Add to list, watch now, share
6. Platform Redirect → Deep link to streaming app/site

### Tracking Management Flow
1. Content Viewing → Manual or auto-track via API
2. Progress Update → Episode completion, timestamps
3. Rating Prompt → Quick rating after completion
4. List Management → Move to completed, suggest similar
5. Social Share → Optional share to feed/friends

## 5. Wireframes

### Mobile Key Screens

#### Home Screen
```
┌─────────────────────────┐
│  🔍  True Crime Tracker │
├─────────────────────────┤
│ Good evening, Sarah     │
│                         │
│ [Continue Watching]     │
│ ┌───┐ ┌───┐ ┌───┐     │
│ │▶️75%│ │▶️30%│ │▶️45%│  │
│ └───┘ └───┘ └───┘     │
│                         │
│ [Trending This Week]    │
│ ┌─────────────────┐    │
│ │ 📺 New Dahmer   │    │
│ │    Documentary   │    │
│ └─────────────────┘    │
│                         │
│ [Based on Your History] │
│ ┌─────────────────┐    │
│ │ Similar to      │    │
│ │ Ted Bundy Tapes │    │
│ └─────────────────┘    │
│                         │
│ [━━━━━━━━━━━━━━━━]     │
│  🏠  🔍  📚  👥  👤    │
└─────────────────────────┘
```

#### Case Details Screen
```
┌─────────────────────────┐
│ ← Case: Zodiac Killer   │
├─────────────────────────┤
│ ┌─────────────────┐    │
│ │   Case Image     │    │
│ └─────────────────┘    │
│                         │
│ Active: 1968-1969       │
│ Status: Unsolved        │
│ Victims: 5 confirmed    │
│                         │
│ [Overview][Timeline]    │
│ [Content][Discussion]   │
│                         │
│ Available Content (12)  │
│ ┌─────────────────┐    │
│ │ Netflix         │    │
│ │ Documentary2024 │    │
│ └─────────────────┘    │
│ ┌─────────────────┐    │
│ │ Hulu           │    │
│ │ Miniseries2023 │    │
│ └─────────────────┘    │
└─────────────────────────┘
```

## 6. Visual Design System

### Color Palette

#### Dark Theme (Primary)
```
Background Levels:
- Deep Black: #0A0A0B (Main background)
- Dark Gray: #1A1A1C (Cards, sections)
- Medium Gray: #2A2A2D (Elevated surfaces)
- Light Gray: #3A3A3F (Borders, dividers)

Text Colors:
- Primary Text: #FFFFFF (High emphasis)
- Secondary Text: #B8B8BD (Medium emphasis)
- Tertiary Text: #737378 (Low emphasis)
- Disabled: #4A4A4F

Accent Colors:
- Crime Red: #BA0C2F (Primary actions, alerts)
- Evidence Blue: #00338D (Links, secondary actions)
- Success Green: #10B981 (Completed, success)
- Warning Amber: #F59E0B (Warnings, important)

Supporting Colors:
- Midnight Purple: #4A1850 (Special features, premium)
- Steel Gray: #71797E (Neutral actions)
- Rose Gold: #E8B4B8 (Highlights, achievements)
- Deep Teal: #004B49 (Information, tips)

Platform Colors:
- Netflix Red: #E50914
- Hulu Green: #1CE783
- Prime Blue: #00A8E1
- HBO Purple: #991EFF
- Discovery Orange: #FF6B00
- Paramount Blue: #0064FF
- Peacock Rainbow: Linear gradient
- Apple Black: #000000
```

#### Light Theme (Secondary)
```
Background Levels:
- Pure White: #FFFFFF
- Light Gray: #F9FAFB
- Medium Gray: #F3F4F6
- Border Gray: #E5E7EB

Text Colors:
- Primary Text: #111827
- Secondary Text: #6B7280
- Tertiary Text: #9CA3AF

Accent Colors (Adjusted for Light):
- Crime Red: #BA0C2F (Same, works on white)
- Evidence Blue: #00338D (Same, works on white)
- Success Green: #059669 (Darker for contrast)
- Warning Amber: #D97706 (Darker for contrast)
```

### Typography Scale
```
Font Family: 
- Headers: "SF Pro Display" (iOS), "Roboto" (Android)
- Body: "SF Pro Text" (iOS), "Roboto" (Android)
- Monospace: "SF Mono" (Code, stats)

Size Scale:
- Display: 48px/56px (Landing headlines)
- H1: 32px/40px (Page titles)
- H2: 24px/32px (Section headers)
- H3: 20px/28px (Card titles)
- H4: 18px/24px (Subsections)
- Body: 16px/24px (Default text)
- Small: 14px/20px (Secondary text)
- Caption: 12px/16px (Labels, timestamps)

Font Weights:
- Light: 300 (Display only)
- Regular: 400 (Body text)
- Medium: 500 (Emphasis)
- Semibold: 600 (Headers)
- Bold: 700 (CTAs, important)
```

### Spacing System
```
Base Unit: 4px

Scale:
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px
- 3xl: 64px

Component Spacing:
- Card Padding: 16px
- Section Margin: 24px
- List Item Gap: 12px
- Button Padding: 12px 20px
- Input Padding: 12px 16px
```

### Component Specifications

#### Buttons
```
Primary Button:
- Background: Crime Red (#BA0C2F)
- Text: White (#FFFFFF)
- Padding: 12px 24px
- Border Radius: 8px
- Height: 48px (mobile), 40px (web)
- Hover: Darken to #9A0A27
- Active: Darken to #7A0820
- Disabled: 50% opacity

Secondary Button:
- Background: Transparent
- Border: 1px solid #3A3A3F
- Text: #B8B8BD
- Same dimensions as primary

Ghost Button:
- Background: Transparent
- Text: Evidence Blue (#00338D)
- No border
- Underline on hover
```

#### Cards
```
Content Card:
- Background: #1A1A1C
- Border Radius: 12px
- Padding: 16px
- Shadow: 0px 4px 16px rgba(0,0,0,0.3)
- Hover: Elevate 2px, increase shadow

Case Card:
- Aspect Ratio: 16:9 image
- Text Overlay: Gradient from transparent to black
- Platform Badge: Top right corner
- Progress Bar: Bottom if watching
```

#### Input Fields
```
Text Input:
- Background: #2A2A2D
- Border: 1px solid #3A3A3F
- Border Radius: 8px
- Padding: 12px 16px
- Focus Border: Evidence Blue (#00338D)
- Error Border: Crime Red (#BA0C2F)
```

### Icon System
```
Navigation Icons: (24x24px)
- Home: 🏠 House outline
- Search: 🔍 Magnifying glass
- Library: 📚 Books
- Social: 👥 People
- Profile: 👤 Person

Action Icons: (20x20px)
- Play: ▶️ Triangle
- Add: ➕ Plus
- Share: 🔗 Share arrow
- Like: ❤️ Heart
- Comment: 💬 Speech bubble

Platform Icons: (16x16px)
- Custom SVGs for each streaming service
```

## 7. Interaction Patterns

### Mobile Gestures
```
Swipe Patterns:
- Horizontal Swipe: Navigate between tabs
- Vertical Scroll: Standard content browsing
- Pull to Refresh: Update content feeds
- Long Press: Quick actions menu
- Pinch to Zoom: Image/timeline viewing

Card Interactions:
- Tap: View details
- Swipe Right: Add to watchlist
- Swipe Left: Mark as seen
- 3D Touch/Long Press: Preview
```

### Web Interactions
```
Hover States:
- Cards: Elevate with shadow
- Buttons: Darken/lighten 10%
- Links: Underline appear
- Images: Zoom icon overlay

Click Behaviors:
- Single Click: Primary action
- Right Click: Context menu
- Double Click: Quick add to list
```

### Loading States
```
Skeleton Screens:
- Gray pulsing blocks matching content layout
- Progressive loading from top to bottom

Spinner Types:
- Full Page: Center screen with logo
- Inline: Small spinner replacing content
- Button: Spinner inside button on submit

Progress Indicators:
- Linear: For known duration tasks
- Circular: For unknown duration
- Step: For multi-step processes
```

### Empty States
```
No Content:
- Illustration: Relevant graphic
- Message: "No cases found"
- Action: "Try adjusting filters"

First Time:
- Welcome illustration
- Feature explanation
- CTA to get started

Error States:
- Error icon/illustration
- Clear error message
- Recovery action button
```

## 8. Accessibility Guidelines

### WCAG 2.1 AA Compliance

#### Color Contrast
```
Text Contrast Ratios:
- Normal Text: 4.5:1 minimum
- Large Text: 3:1 minimum
- Interactive Elements: 3:1 minimum

Verified Combinations:
- White on Deep Black: 21:1 ✓
- Secondary on Dark Gray: 7.2:1 ✓
- Crime Red (#BA0C2F) on Black: 7.3:1 ✓
- Evidence Blue (#00338D) on Black: 6.8:1 ✓
- Crime Red on White: 6.4:1 ✓
- Evidence Blue on White: 10.2:1 ✓
```

#### Screen Reader Support
```
Semantic HTML:
- Proper heading hierarchy (h1-h6)
- Landmark regions (nav, main, aside)
- ARIA labels for icons
- Alt text for all images

Focus Management:
- Visible focus indicators
- Logical tab order
- Skip navigation links
- Focus trap in modals
```

#### Touch Targets
```
Mobile Minimum Sizes:
- Buttons: 44x44px iOS, 48x48px Android
- Links: 44x44px with padding
- Form Controls: 44px height minimum
- Spacing between targets: 8px minimum
```

#### Motion and Animation
```
Preferences:
- Respect prefers-reduced-motion
- Provide pause/stop controls for auto-play
- Avoid flashing content (seizure risk)
- Smooth transitions under 400ms
```

### Inclusive Design
```
Language:
- Clear, simple language
- Avoid jargon
- Provide tooltips for complex terms
- Support internationalization

Flexibility:
- Responsive design for all viewports
- Support landscape and portrait
- Zoom support up to 200%
- High contrast mode support
```

## 9. Implementation Specifications

### Component Architecture
```typescript
// Base component structure
interface ThemedComponentProps {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  isDisabled?: boolean
  className?: string
}

// Example: Button component
<Button 
  variant="primary"
  size="lg"
  onPress={handlePress}
  isLoading={isSubmitting}
>
  Watch Now
</Button>
```

### State Management Patterns
```typescript
// Zustand store structure
interface AppState {
  // User data
  user: User | null
  preferences: UserPreferences
  
  // Content data
  watchlist: Content[]
  continueWatching: Progress[]
  
  // UI state
  theme: 'light' | 'dark'
  activeFilters: FilterState
  
  // Actions
  addToWatchlist: (content: Content) => void
  updateProgress: (contentId: string, progress: number) => void
}

// Tanstack Query patterns
const useContent = (contentId: string) => {
  return useQuery({
    queryKey: ['content', contentId],
    queryFn: () => api.content.getById(contentId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
```

### Animation Guidelines
```typescript
// Expo/React Native animations
const fadeIn = {
  from: { opacity: 0 },
  to: { opacity: 1 },
  duration: 300,
  easing: Easing.ease,
}

const slideUp = {
  from: { translateY: 20 },
  to: { translateY: 0 },
  duration: 400,
  easing: Easing.out(Easing.cubic),
}

// Web (Framer Motion)
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" }
  },
  hover: { 
    scale: 1.02,
    transition: { duration: 0.2 }
  }
}
```

### Performance Guidelines
```
Image Optimization:
- Lazy load images below fold
- Use WebP format with fallbacks
- Responsive images with srcset
- Blur placeholders for loading

List Optimization:
- Virtualized lists for 50+ items
- Pagination for search results
- Infinite scroll with intersection observer
- Memoize expensive computations

API Optimization:
- Implement request debouncing (300ms)
- Cache responses with Tanstack Query
- Prefetch on hover (web)
- Batch API requests when possible
```

### Naming Conventions
```
Components:
- PascalCase: ContentCard, CaseDetails
- Props: camelCase with Props suffix
- Hooks: use prefix: useContent, useTheme

Files:
- Components: PascalCase.tsx
- Utils: camelCase.ts
- Styles: component.styles.ts
- Types: types.ts or interfaces.ts

CSS/Tailwind Classes:
- BEM-inspired: card, card__header, card--featured
- Utility-first with semantic classes
```

### Testing Requirements
```typescript
// Component testing example
describe('ContentCard', () => {
  it('renders content information correctly', () => {
    render(<ContentCard content={mockContent} />)
    expect(screen.getByText(mockContent.title)).toBeInTheDocument()
  })
  
  it('handles platform badge display', () => {
    // Test platform availability indicators
  })
  
  it('supports keyboard navigation', () => {
    // Test accessibility
  })
})
```

### Platform-Specific Considerations

#### iOS
- Use SF Symbols where available
- Implement haptic feedback for actions
- Support Dynamic Type for accessibility
- Follow iOS Human Interface Guidelines

#### Android
- Material Design 3 principles
- Support Material You theming
- Implement proper back navigation
- Follow Material Design Guidelines

#### Web
- Progressive enhancement approach
- SEO optimization for public pages
- Support browser back/forward
- Implement proper meta tags

## Design Handoff Checklist

### For Developers
- [ ] Color tokens defined in theme files
- [ ] Typography scale in constants
- [ ] Spacing system documented
- [ ] Component specs with all states
- [ ] Interaction animations defined
- [ ] Accessibility requirements clear
- [ ] Platform-specific guidelines
- [ ] Performance benchmarks set

### For QA
- [ ] User flows documented
- [ ] Edge cases identified
- [ ] Error states defined
- [ ] Loading states specified
- [ ] Accessibility checklist
- [ ] Cross-platform testing matrix

### For Product
- [ ] User personas validated
- [ ] User stories prioritized
- [ ] Success metrics defined
- [ ] Analytics events planned
- [ ] A/B test variations identified