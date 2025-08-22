# True Crime App - Information Architecture

## Overview

This document defines the organizational structure of content and navigation for both mobile and web platforms, ensuring intuitive user experiences while accommodating the complexity of True Crime content discovery and tracking.

## Design Principles

### Content Organization Philosophy
- **User Mental Models**: Structure follows how users naturally think about True Crime content
- **Progressive Disclosure**: Simple entry points with increasing complexity as users dive deeper
- **Cross-Platform Consistency**: Core navigation remains consistent between mobile and web
- **Scalability**: Architecture supports growth from MVP to full feature set

### Navigation Hierarchy
1. **Primary Navigation**: Core app functions accessible at all times
2. **Secondary Navigation**: Feature-specific navigation within sections
3. **Contextual Navigation**: Content-specific actions and related items
4. **Utility Navigation**: Account, settings, and support functions

## Mobile Information Architecture

### Primary Navigation (Bottom Tab Bar)

#### 1. Home (Tab 1)
**Purpose**: Content discovery and quick access to personalized recommendations
**Icon**: Home symbol
**User Goals**: Find something to watch, see what's new, quick access to continue watching

**Screen Structure**:
```
Home/
├── Header (Search + Profile)
├── Continue Watching (if applicable)
├── Recommended for You
├── Trending Now
├── New This Week
├── Based on Your Interests
└── Browse by Category
```

**Secondary Navigation**:
- Pull-to-refresh for content updates
- Horizontal scrolling content carousels
- "See All" links to expanded category views

---

#### 2. Search (Tab 2)
**Purpose**: Universal content discovery through search and filtering
**Icon**: Magnifying glass
**User Goals**: Find specific content, explore by filters, discover related content

**Screen Structure**:
```
Search/
├── Search Bar (persistent)
├── Recent Searches
├── Trending Searches
├── Quick Filters (Documentary, Series, Podcast, etc.)
├── Advanced Filters (expandable)
├── Search Results/
│   ├── Content Grid View
│   ├── List View Toggle
│   ├── Sort Options
│   └── Filter Chips
└── Browse Categories/
    ├── By Case Type
    ├── By Time Period
    ├── By Location
    └── By Content Type
```

**Secondary Navigation**:
- Filter sidebar (slide-in)
- Sort dropdown menu
- View mode toggle (grid/list)
- Search history management

---

#### 3. My Lists (Tab 3)
**Purpose**: Personal content management and tracking
**Icon**: Bookmark or list symbol
**User Goals**: Manage watchlist, track progress, organize personal collections

**Screen Structure**:
```
My Lists/
├── Quick Stats (Total watched, hours, etc.)
├── Continue Watching
├── Watchlist
├── Recently Watched
├── Custom Lists/
│   ├── Create New List
│   ├── Favorites
│   ├── Want to Watch
│   └── Custom Collections
├── Completed
└── Statistics/
    ├── Viewing History
    ├── Monthly Stats
    └── Content Breakdown
```

**Secondary Navigation**:
- List management actions (edit, delete, share)
- Bulk selection mode
- Sort and filter within lists
- List settings and privacy controls

---

#### 4. Browse (Tab 4)
**Purpose**: Systematic content exploration and discovery
**Icon**: Grid or compass symbol
**User Goals**: Explore content systematically, discover new categories, browse by interest

**Screen Structure**:
```
Browse/
├── Featured Collections
├── Browse by Case/
│   ├── Famous Cases
│   ├── Unsolved Mysteries
│   ├── Serial Killers
│   └── Cold Cases
├── Browse by Content Type/
│   ├── Documentaries
│   ├── True Crime Series
│   ├── Podcasts
│   └── Dramatizations
├── Browse by Platform/
│   ├── Netflix
│   ├── Hulu
│   ├── HBO Max
│   └── [All Available Services]
└── Browse by Era/
    ├── Recent Cases (2020+)
    ├── Modern Era (2000-2019)
    ├── Classic Cases (1980-1999)
    └── Historical (Pre-1980)
```

**Secondary Navigation**:
- Category-specific filtering
- Platform availability filters
- Content type filters
- Sort options within categories

---

#### 5. Profile (Tab 5)
**Purpose**: Account management, settings, and social features
**Icon**: Person or avatar
**User Goals**: Manage account, adjust settings, view social activity, access help

**Screen Structure**:
```
Profile/
├── User Avatar & Stats
├── Quick Actions/
│   ├── Share Profile
│   ├── Edit Profile
│   └── Privacy Settings
├── My Activity/
│   ├── Recent Reviews
│   ├── Shared Content
│   └── Community Contributions
├── Social/
│   ├── Following
│   ├── Followers
│   └── Friend Recommendations
├── Settings/
│   ├── Account Settings
│   ├── Notification Preferences
│   ├── Privacy Controls
│   ├── Content Warnings
│   ├── Streaming Services
│   └── App Preferences
└── Support/
    ├── Help Center
    ├── Contact Support
    ├── Report Content
    └── About
```

**Secondary Navigation**:
- Settings categories and subcategories
- Social feature management
- Help and support sections

### Modal and Overlay Screens

#### Content Detail Screen
**Access**: Tap any content card
**Purpose**: Detailed content information and actions

**Screen Structure**:
```
Content Detail/
├── Hero Image/Video
├── Content Warnings (if applicable)
├── Title & Metadata
├── Quick Actions (Watch, Add to List, Share)
├── Description & Details
├── Cast & Crew (if applicable)
├── Streaming Availability
├── Related Content
├── Reviews & Ratings
├── Community Discussion
└── Case Information (if part of a case series)
```

#### Case Detail Screen
**Access**: Case grouping links
**Purpose**: Comprehensive case information and related content

**Screen Structure**:
```
Case Detail/
├── Case Summary
├── Timeline of Events
├── Key Figures
├── Related Content/
│   ├── Documentaries
│   ├── Series
│   ├── Podcasts
│   └── Books/Articles
├── Case Status
├── Community Discussion
└── External Resources
```

## Web Information Architecture

### Primary Navigation (Header + Sidebar)

#### Header Navigation
```
Header/
├── Logo/Home Link
├── Universal Search Bar
├── Primary Navigation Menu
├── Notifications Icon
└── User Account Menu
```

#### Sidebar Navigation (Persistent)
```
Main Navigation/
├── Home
├── Discover/
│   ├── Trending
│   ├── New Releases
│   ├── Recommendations
│   └── Categories
├── Search
├── My Content/
│   ├── Continue Watching
│   ├── Watchlist
│   ├── History
│   └── Custom Lists
├── Browse/
│   ├── By Case
│   ├── By Content Type
│   ├── By Platform
│   └── By Era
├── Community/
│   ├── Following
│   ├── Discussions
│   └── Reviews
└── Settings
```

### Page-Level Architecture

#### Home Page
**URL**: `/`
**Layout**: Two-column with sidebar
**Content Sections**:
- Hero section with featured content
- Continue watching carousel
- Personalized recommendation sections
- Trending content
- New releases
- Category-based content rows

#### Search & Discovery Page
**URL**: `/search` or `/discover`
**Layout**: Full-width with integrated filters
**Content Sections**:
- Advanced search interface
- Filter panels (collapsible)
- Search results grid with pagination
- Saved searches and recommendations

#### Content Detail Page
**URL**: `/content/[id]`
**Layout**: Full-width content focus
**Content Sections**:
- Hero section with video/images
- Content metadata and actions
- Related content and recommendations
- Community reviews and discussions
- Streaming availability and links

#### Case Detail Page
**URL**: `/case/[case-id]`
**Layout**: Two-column with content sidebar
**Content Sections**:
- Case overview and timeline
- Related content organized by type
- Case discussion and resources
- External links and references

#### User Profile Page
**URL**: `/profile/[user-id]` or `/profile`
**Layout**: Two-column with activity sidebar
**Content Sections**:
- User information and statistics
- Activity feed and recent content
- Public lists and reviews
- Social connections

### Responsive Breakpoints

#### Mobile (320px - 767px)
- Single column layout
- Bottom tab navigation
- Collapsible sections
- Touch-optimized spacing

#### Tablet (768px - 1023px)
- Two-column layout in landscape
- Tab navigation or sidebar toggle
- Grid layouts for content
- Increased touch targets

#### Desktop (1024px+)
- Full sidebar navigation
- Multi-column layouts
- Hover interactions
- Keyboard navigation support

## Content Organization Systems

### Taxonomies and Tagging

#### Primary Categories
```
Content Types/
├── Documentaries
├── True Crime Series
├── Podcasts
├── Dramatizations
├── News Programs
└── Educational Content
```

#### Case Classifications
```
Case Types/
├── Serial Killers
├── Murder Cases
├── Disappearances
├── Cold Cases
├── Solved Cases
├── Fraud & White Collar
├── Organized Crime
└── Historical Cases
```

#### Time Periods
```
Eras/
├── Current (2020-Present)
├── Modern (2000-2019)
├── Late 20th Century (1980-1999)
├── Mid 20th Century (1950-1979)
├── Early 20th Century (1900-1949)
└── Historical (Pre-1900)
```

#### Geographic Regions
```
Locations/
├── United States/
│   ├── By State
│   └── By Region
├── International/
│   ├── Europe
│   ├── Asia
│   ├── Australia
│   └── Other Regions
└── Multiple Locations
```

### Search and Filter Architecture

#### Search Functionality
- **Universal Search**: Searches across all content types and metadata
- **Scoped Search**: Search within specific categories or user lists
- **Advanced Search**: Complex queries with multiple filters
- **Natural Language**: Support for conversational search queries

#### Filter Categories
1. **Content Attributes**
   - Content type
   - Release date/year
   - Duration/length
   - Rating/score

2. **Case Attributes**
   - Case type
   - Time period
   - Location
   - Case status (solved/unsolved)

3. **Availability**
   - Streaming service
   - Free vs. paid
   - Subscription required
   - Geographic availability

4. **User Context**
   - Watch status
   - Personal rating
   - In user lists
   - Content warnings

### Navigation Patterns

#### Breadcrumb Navigation
```
Examples:
Home > Browse > Serial Killers > Ted Bundy > Netflix Series
Home > My Lists > Watchlist > True Crime Documentaries
Home > Search > "unsolved mysteries" > Filter: Documentaries
```

#### Cross-References
- Related content suggestions
- "More like this" recommendations
- Case-based content groupings
- User-generated connections

#### Quick Actions
- Add to watchlist (from any content view)
- Share content (native sharing capabilities)
- Mark as watched/unwatched
- Rate and review (quick rating)

## Accessibility Considerations

### Navigation Accessibility
- **Keyboard Navigation**: Full tab order and keyboard shortcuts
- **Screen Reader Support**: ARIA landmarks and descriptive labels
- **Focus Management**: Clear focus indicators and logical flow
- **Skip Links**: Quick navigation to main content areas

### Content Accessibility
- **Alternative Text**: Descriptive alt text for images and graphics
- **Semantic Markup**: Proper heading hierarchy and structure
- **Color Independence**: Information not conveyed by color alone
- **Responsive Text**: Support for user text scaling preferences

### Cognitive Accessibility
- **Clear Labels**: Descriptive and consistent navigation labels
- **Predictable Patterns**: Consistent interaction patterns throughout
- **Progress Indicators**: Clear indication of user location and progress
- **Error Recovery**: Clear error messages and recovery paths

## Performance Considerations

### Progressive Loading
- **Critical Path**: Essential navigation loads first
- **Progressive Enhancement**: Enhanced features load progressively
- **Image Optimization**: Lazy loading and responsive images
- **Code Splitting**: Feature-based code loading

### Caching Strategy
- **Navigation Structure**: Cache static navigation elements
- **Content Metadata**: Cache frequently accessed content information
- **User Preferences**: Cache user settings and customizations
- **Search Results**: Intelligent caching of search and filter results

## Success Metrics

### Navigation Effectiveness
- **Task Completion Rate**: 90%+ users complete primary tasks
- **Time to Content**: <3 seconds to reach desired content
- **Navigation Errors**: <5% of users experience navigation confusion
- **Search Success**: 80%+ of searches lead to content engagement

### Content Discovery
- **Browse vs. Search**: Balanced usage of both discovery methods
- **Category Utilization**: Even distribution across content categories
- **Depth of Exploration**: Users explore beyond first-level navigation
- **Return Behavior**: High return rates to discovered content

### User Satisfaction
- **Navigation Clarity**: 95%+ users understand navigation structure
- **Content Findability**: 85%+ users can find specific content
- **Mobile Usability**: 90%+ mobile user satisfaction
- **Accessibility Compliance**: 100% WCAG 2.1 AA compliance

---

*This information architecture serves as the blueprint for all navigation and content organization decisions, ensuring users can efficiently discover, access, and manage True Crime content across all platforms.*

*Last Updated: August 19, 2025*
*Next Review: November 19, 2025*