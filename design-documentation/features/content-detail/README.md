---
title: Content Detail Screen Design
description: Comprehensive design specification for the TrueCrime app content detail screen
feature: content-detail
last-updated: 2025-08-22
version: 1.0
related-files:
  - ../../design-system/style-guide.md
  - ../../design-system/components/cards.md
  - ../../design-system/components/buttons.md
dependencies:
  - Existing ContentDetailView component
  - TrueCrime design system
  - TMDB and Watchmode API data
status: draft
---

# Content Detail Screen Design

## Overview

The Content Detail Screen is the destination screen users reach when tapping on content cards from discovery, search, or browse screens. This screen provides comprehensive information about True Crime content and enables users to take key actions like adding to watchlist, marking as watched, and accessing streaming platforms.

## Table of Contents

- [Design Philosophy](#design-philosophy)
- [User Experience Analysis](#user-experience-analysis)
- [Information Architecture](#information-architecture)
- [User Journey Mapping](#user-journey-mapping)
- [Screen Components](#screen-components)
- [Visual Design Specifications](#visual-design-specifications)
- [Interaction Design](#interaction-design)
- [Responsive Design](#responsive-design)
- [Accessibility Specifications](#accessibility-specifications)
- [Implementation Guidelines](#implementation-guidelines)

## Design Philosophy

### Core Principles

- **Content-First Design**: Hero imagery and metadata take visual priority to create immediate context
- **Respectful Information Presentation**: Content warnings and case information presented with appropriate gravity
- **Action-Oriented Layout**: Primary user actions (watchlist, mark watched, streaming access) prominently displayed
- **Progressive Information Disclosure**: Essential information upfront, detailed information accessible through interaction
- **Platform Integration**: Seamless deep-linking to streaming services with clear availability indication

### Trauma-Informed Design Considerations

- **Content Warning System**: Clear, prominent warnings with user control over exposure
- **Respectful Imagery**: Appropriate use of official promotional materials, avoiding sensationalized content
- **Case Information Sensitivity**: Factual presentation of case details with respectful treatment of victims
- **User Control**: Granular control over content exposure and notification preferences

## User Experience Analysis

### Primary User Goals

1. **Understanding Content**: Get comprehensive information about the true crime content
2. **Availability Assessment**: Quickly understand where and how content can be accessed
3. **Action Completion**: Add to watchlist, mark as watched, or access streaming platform
4. **Case Context**: Understand the real-world case behind the content
5. **Content Appropriateness**: Assess content warnings and sensitivity levels

### Success Criteria

- Users can identify streaming availability within 3 seconds of screen load
- Primary actions (watchlist, watch) are completed in 2 taps maximum
- Content warnings are immediately visible without requiring scrolling
- Users can distinguish between documentary and dramatized content instantly
- Deep-linking to streaming platforms succeeds 95% of the time

### Key Pain Points Addressed

- **Streaming Fragmentation**: Consolidated view of all platform availability with pricing
- **Content Appropriateness**: Clear content warnings before user commitment
- **Information Overload**: Progressive disclosure of detailed information
- **Platform Access**: Direct deep-linking to reduce friction in content access
- **Context Understanding**: Clear distinction between factual and dramatized content

## Information Architecture

### Content Hierarchy

1. **Hero Section** (Primary)
   - Large backdrop image with overlay
   - Content poster thumbnail
   - Title, year, runtime, rating
   - Content type and case type indicators

2. **Action Controls** (Primary)
   - Add to Watchlist button
   - Mark as Watched button
   - Share functionality

3. **Platform Availability** (Secondary)
   - Streaming service buttons with pricing
   - Deep-link functionality
   - Availability type indicators (Free, Subscription, Purchase, Rental)

4. **Content Warnings** (Critical when present)
   - Sensitivity level indicator
   - Specific content warnings
   - User control options

5. **Synopsis** (Secondary)
   - Expandable content description
   - Read more/less functionality

6. **Case Information** (Tertiary)
   - Real-world case details
   - Timeline information
   - Location data

7. **Cast & Crew** (Tertiary)
   - Key personnel information
   - Roles and responsibilities

### Navigation Structure

**Entry Points**:
- Content cards from discovery screens
- Search results
- Recommendations
- External deep links

**Exit Points**:
- Back navigation to previous screen
- Streaming platform deep links
- Related content navigation
- Share sheet interactions

## User Journey Mapping

### Core Experience Flow

#### Step 1: Entry and Context Formation

**Trigger**: User taps content card from discovery screen

**Visual State**:
- Full-screen hero image with content backdrop
- Semi-transparent overlay with essential metadata
- Loading states for dynamic content (ratings, availability)
- Fixed header with back navigation and content title

**Available Actions**:
- Back navigation
- Content warnings acknowledgment (if required)
- Initial scroll to explore content

**System Feedback**:
- Smooth transition animation from card to full screen
- Progressive image loading with blur-to-sharp effect
- Loading spinners for API-dependent content
- Haptic feedback on iOS for navigation actions

#### Step 2: Information Assessment and Decision Making

**Task Flow**:
1. User assesses content through hero section
2. Reviews content warnings (if present)
3. Evaluates platform availability and pricing
4. Reads synopsis for interest validation
5. Reviews case information for context

**State Changes**:
- Expandable synopsis reveals full text
- Platform buttons show loading states during deep-link preparation
- Action buttons reflect current user state (in watchlist, watched)
- Content warnings can be acknowledged and minimized

**Error Prevention**:
- Clear pricing information prevents unexpected charges
- Content warnings prevent exposure to unsuitable content
- Platform availability validation before deep-linking
- Network state handling for offline scenarios

#### Step 3: Action Completion and Next Steps

**Success States**:
- **Watchlist Addition**: Button state changes, haptic confirmation, brief success message
- **Mark as Watched**: Visual confirmation, progress tracking update
- **Streaming Access**: Successful deep-link with return capability
- **Content Sharing**: Platform-specific share sheet with metadata

**Error Recovery**:
- Platform unavailable: Clear messaging with alternative options
- Network issues: Offline state with retry mechanisms
- Authentication required: Clear guidance for platform login
- Content restrictions: Age verification or subscription upgrade paths

### Advanced Users & Edge Cases

#### Power User Shortcuts

- **Quick Actions**: Swipe gestures on action buttons for immediate execution
- **Keyboard Shortcuts**: Space bar for primary action, arrow keys for navigation (web)
- **Batch Operations**: Multi-select capabilities when accessed from lists
- **Deep Context**: Advanced case information and related content networks

#### Empty States

- **No Streaming Availability**: Clear messaging with notification signup option
- **Limited Metadata**: Graceful degradation with available information highlighted
- **No Related Content**: Focus on standalone content value and similar recommendations
- **Offline Content**: Cached essential information with sync indicators

#### Error States

- **Content Removed**: Clear explanation with similar content recommendations
- **Age Restricted**: Appropriate verification flow with educational context
- **Geo-blocked**: Location-based messaging with VPN guidance if appropriate
- **Platform Errors**: Fallback options and manual search instructions

#### Loading States

- **Initial Load**: Hero skeleton with smooth transitions to actual content
- **Action Processing**: In-line loading states that don't block interface
- **Image Loading**: Progressive enhancement from blur to sharp
- **Platform Validation**: Real-time availability checking with status indicators

## Screen Components

### Hero Section

**Purpose**: Establish immediate visual context and key content identification

**Layout Structure**:
- Full-width backdrop image (16:9 aspect ratio)
- Overlay gradient (black 0% to 60% opacity bottom-up)
- Poster thumbnail (3:4 aspect ratio, 96x128px)
- Metadata overlay positioned in bottom-left
- Optional close button for modal presentations

**Visual Elements**:
- **Backdrop Image**: TMDB high-resolution backdrop with fallback
- **Poster Thumbnail**: Sharp poster image with subtle shadow
- **Title Treatment**: H1 typography (28px, bold, white)
- **Metadata Row**: Year, runtime, rating with separator dots
- **Type Indicators**: Colored badges for content and case types

### Action Bar

**Purpose**: Enable primary user actions with clear state indication

**Layout Structure**:
- Full-width container with 16px horizontal padding
- Flexible button layout adapting to button states
- Primary action emphasis through color and positioning

**Button States**:
- **Add to Watchlist**: Primary button → Secondary button when added
- **Mark as Watched**: Secondary button → Success state when completed  
- **Share Content**: Tertiary button with platform-specific options
- **Loading States**: In-button spinners with disabled interaction

### Platform Availability Section

**Purpose**: Display streaming options with pricing and access facilitation

**Card Design**:
- Individual platform cards with consistent layout
- Platform icon/logo with brand colors
- Service name and availability type
- Pricing information when applicable
- Deep-link affordance (chevron indicator)

**Availability Indicators**:
- **Free**: Green indicator with "Free" label
- **Subscription**: Blue indicator with "Included" label
- **Premium**: Purple indicator with "Premium" label
- **Purchase**: Orange indicator with price display
- **Rental**: Red indicator with rental price

### Content Warning System

**Purpose**: Provide trauma-informed content exposure control

**Visual Treatment**:
- Prominent card with colored left border
- Warning icon with level-appropriate color
- Clear sensitivity level labeling
- Expandable detailed warnings list
- User control options (hide, remind later, don't show again)

**Warning Levels**:
- **Low**: Green border, informational icon
- **Moderate**: Orange border, caution icon  
- **High**: Red border, warning icon
- **Extreme**: Purple border, alert icon

### Synopsis Section

**Purpose**: Provide expandable content description with reading control

**Layout Elements**:
- Section header with clear typography hierarchy
- Initial text truncation at 200 characters
- "Read More" expansion with smooth animation
- "Show Less" collapse functionality
- Proper line height for readability (1.6)

### Case Information Section

**Purpose**: Present factual case context with respectful treatment

**Information Layout**:
- Structured metadata presentation
- Key-value pairs with consistent alignment
- Timeline information with date formatting
- Location data with appropriate specificity
- Visual separation from entertainment content

### Cast & Crew Section

**Purpose**: Display key personnel with role clarity

**List Design**:
- Grouped by role type (Crew → Cast)
- Name and role alignment
- Limit to 5 most relevant people
- Expandable for full cast access
- Professional headshots when available

## Visual Design Specifications

### Color Application

**Hero Section**:
- Background: Dynamic based on backdrop image
- Overlay: Linear gradient `rgba(0,0,0,0)` to `rgba(0,0,0,0.6)`
- Text: Pure white (#FFFFFF) with shadow for legibility
- Accent: Primary purple (#8B4B7F) for interactive elements

**Content Cards**:
- Background: Card background from design system (#2C2C30 dark, #FFFFFF light)
- Border: Subtle border in dark theme (#3A3A40)
- Shadow: Elevated shadow for platform cards
- Text: Primary text color with proper contrast ratios

**Action Elements**:
- Primary Buttons: TrueCrime purple (#8B4B7F) with white text
- Secondary Buttons: Secondary grey (#4A4A5A) with white text
- Success States: Forest green (#388E3C) confirmation
- Warning Elements: Level-appropriate colors as defined in style guide

### Typography Implementation

**Hero Section**:
- Title: H1 (28px/32px, 600 weight, -0.02em tracking)
- Metadata: Body (16px/24px, 400 weight)
- Year/Runtime: Caption (12px/16px, 400 weight)

**Section Headers**:
- Main Sections: H2 (24px/28px, 600 weight)
- Subsections: H3 (20px/24px, 500 weight)

**Body Content**:
- Synopsis: Body Large (18px/26px, 400 weight)
- Metadata: Body (16px/24px, 400 weight)
- Secondary Info: Body Small (14px/20px, 400 weight)

**Interactive Elements**:
- Button Text: Button style (16px/20px, 600 weight)
- Links: Body with Primary color and medium weight
- Labels: Label style (14px/16px, 500 weight, uppercase)

### Spacing Implementation

**Screen-Level Spacing**:
- Section Separation: 24px (lg spacing)
- Screen Padding: 16px horizontal (md spacing)
- Header Height: 64px with safe area adaptation

**Component-Level Spacing**:
- Card Internal Padding: 16px (md spacing)
- Button Padding: 12px vertical, 24px horizontal
- List Item Spacing: 12px between items
- Icon-Text Spacing: 8px (sm spacing)

**Micro-Spacing**:
- Related Text Elements: 4px (xs spacing)
- Separator Elements: 8px margins (sm spacing)
- Touch Target Enhancement: 44px minimum interactive areas

## Interaction Design

### Touch Interactions

**Primary Actions**:
- **Tap**: Standard button press with haptic feedback
- **Long Press**: Context menu for additional options
- **Swipe**: Gesture-based quick actions on action buttons
- **Pull to Refresh**: Content update when available

**Navigation Gestures**:
- **Back Swipe**: iOS edge swipe gesture support
- **Scroll**: Smooth scrolling with momentum and bounce
- **Pinch to Zoom**: Image viewing enhancement
- **Double Tap**: Quick actions on platform cards

### State Transitions

**Button States**:
- **Hover** (web): Subtle scale (1.02x) and shadow enhancement
- **Active**: Scale down (0.98x) with pressed state color
- **Loading**: In-button spinner with maintained button size
- **Success**: Brief checkmark animation before state change

**Content Loading**:
- **Skeleton States**: Animated placeholders matching final layout
- **Progressive Enhancement**: Content appearance as data loads
- **Image Loading**: Blur-to-sharp transition with fallback handling
- **Error Recovery**: Smooth transition to error state with retry options

### Animation Specifications

**Screen Transitions**:
- **Entry**: Slide up from bottom with 400ms ease-out timing
- **Exit**: Slide down with 250ms ease-in timing
- **Modal**: Scale and fade with backdrop blur effect

**Micro-interactions**:
- **Button Press**: 150ms scale animation with spring easing
- **Content Expansion**: 250ms height animation with ease-in-out
- **Loading States**: 1.5s infinite rotation for spinners
- **Success Feedback**: 300ms scale pulse with color change

### Haptic Feedback (iOS)

**User Actions**:
- **Button Press**: Light impact for standard interactions
- **Success Actions**: Medium impact for confirmations
- **Error States**: Heavy impact for critical errors
- **Navigation**: Light impact for back gestures

**Content Interactions**:
- **Watchlist Toggle**: Light impact with audio feedback
- **Mark Watched**: Medium impact with success sound
- **Platform Selection**: Light impact before deep-link
- **Content Warnings**: Medium impact for safety acknowledgment

## Responsive Design

### Mobile Portrait (320px - 414px)

**Layout Adaptations**:
- Full-width hero section with optimized image crops
- Single-column action button layout
- Compressed metadata with priority-based visibility
- Touch-optimized button sizing (minimum 44px height)

**Content Adjustments**:
- Synopsis limited to 150 characters before expansion
- Platform list with full-width cards and clear touch targets
- Reduced cast/crew display (3 people maximum)
- Collapsible sections for information density management

### Mobile Landscape (568px - 812px)

**Layout Modifications**:
- Reduced hero height to accommodate keyboard if needed
- Side-by-side action button layout when space permits
- Horizontal scrolling for platform options
- Optimized modal presentations for landscape usage

### Tablet Portrait (768px - 1024px)

**Enhanced Layout**:
- Larger hero section with improved image quality
- Multi-column information layout for cast/crew
- Side-by-side synopsis and case information
- Enhanced touch targets with hover preview states

### Tablet Landscape & Desktop (1024px+)

**Desktop Optimizations**:
- Fixed hero height with sidebar information layout
- Hover states for all interactive elements
- Keyboard navigation support with focus indicators
- Multi-column detailed information presentation
- Enhanced typography scaling for reading comfort

### Platform-Specific Adaptations

**iOS Specific**:
- Dynamic Island awareness for iPhone 14+ models
- SF Symbols integration for system consistency
- Native context menus for secondary actions
- Haptic feedback integration throughout interface

**Android Specific**:
- Material Design elevation system for visual hierarchy
- Android-specific share sheet integration
- Edge-to-edge design with gesture navigation support
- Material ripple effects for touch feedback

**Web Specific**:
- Keyboard shortcuts for power users (space for primary action)
- Right-click context menus for additional options
- Browser back button integration
- SEO-friendly metadata for shared content

## Accessibility Specifications

### Screen Reader Support

**Semantic Structure**:
- Proper heading hierarchy (H1 for title, H2 for sections)
- Landmark regions for major content areas
- List semantics for cast/crew and platform information
- Button roles with clear action descriptions

**ARIA Implementation**:
```typescript
// Example ARIA patterns
<View 
  role="main" 
  accessibilityLabel="Content details for [content title]"
>
  <View role="banner" accessibilityLabel="Content information">
    <Text accessibilityRole="header" accessibilityLevel={1}>
      {content.title}
    </Text>
  </View>
  
  <View role="region" accessibilityLabel="Actions">
    <Pressable 
      accessibilityRole="button"
      accessibilityLabel={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
      accessibilityHint="Double tap to modify your watchlist"
    >
      {/* Button content */}
    </Pressable>
  </View>
</View>
```

**Live Regions**:
- Status updates for action completion
- Loading state announcements
- Error message communication
- Success confirmation announcements

### Keyboard Navigation

**Tab Order**:
1. Back navigation button
2. Primary action buttons (watchlist, mark watched)
3. Platform selection buttons
4. Expandable content controls
5. Related content navigation

**Keyboard Shortcuts**:
- **Escape**: Back navigation
- **Space**: Activate focused button
- **Enter**: Confirm action or expand content
- **Tab/Shift+Tab**: Navigate between elements

**Focus Management**:
- Visible focus indicators with 2px purple outline
- Focus retention during state changes
- Logical focus flow following visual hierarchy
- Skip links for major content sections

### Visual Accessibility

**Color Contrast**:
- All text meets WCAG AA standards (4.5:1 minimum)
- Interactive elements meet 3:1 contrast requirement
- Critical actions exceed 7:1 for enhanced visibility
- Color-blind friendly indicator systems

**Typography Accessibility**:
- Support for system font scaling (iOS Dynamic Type)
- Minimum 16px base font size for body text
- Clear visual hierarchy with size and weight variations
- High contrast text colors in both themes

**Motion Sensitivity**:
- Respect `prefers-reduced-motion` system setting
- Provide static alternatives for animated content
- Essential animations (loading) maintained but simplified
- User control over motion preferences within app

### Trauma-Informed Accessibility

**Content Control**:
- Content warnings accessible before main content
- User control over sensitive content exposure
- Clear labeling of content appropriateness levels
- Easy exit options from distressing content

**Cognitive Accessibility**:
- Clear information hierarchy and organization
- Consistent navigation patterns throughout app
- Plain language in warnings and instructions
- Progress indicators for multi-step actions

## Implementation Guidelines

### Component Architecture

```typescript
interface ContentDetailProps {
  contentId: string;
  onClose?: () => void;
  initialTab?: 'overview' | 'cast' | 'related';
  deepLinkSource?: string;
}

interface ContentDetailState {
  content: Content | null;
  isLoading: boolean;
  error: Error | null;
  expandedSynopsis: boolean;
  acknowledgedWarnings: boolean;
}
```

### API Integration

**Data Requirements**:
```typescript
interface ContentDetailData {
  // Core content information
  id: string;
  title: string;
  synopsis: string;
  posterUrl: string;
  backdropUrl: string;
  
  // Metadata
  releaseDate: Date;
  runtime: number;
  contentType: ContentType;
  caseType: CaseType;
  
  // Availability
  platforms: PlatformAvailability[];
  isAvailable: boolean;
  
  // Content safety
  sensitivityLevel: SensitivityLevel;
  contentWarnings: string[];
  
  // Case information
  caseName?: string;
  location?: string;
  timeframeStart?: Date;
  timeframeEnd?: Date;
  
  // People
  cast: Person[];
  crew: Person[];
  
  // User data
  userRating?: number;
  userRatingAvg: number;
  isInWatchlist: boolean;
  isWatched: boolean;
}
```

**Loading Strategy**:
1. **Critical Path**: Content metadata, poster, title
2. **Secondary**: Platform availability, user status
3. **Tertiary**: Cast/crew, case information, related content
4. **Progressive**: High-resolution images, detailed metadata

### Performance Considerations

**Image Optimization**:
- Responsive image sizes based on device capabilities
- WebP format support with JPEG fallbacks
- Progressive JPEG loading for large backdrops
- Lazy loading for non-critical images

**Data Loading**:
- Prioritized API calls for critical content
- Background refresh for user-specific data
- Caching strategy for frequently accessed content
- Offline support for basic content information

**Animation Performance**:
- GPU-accelerated transforms and opacity changes
- Avoid layout-triggering animations during scroll
- Frame rate targeting at 60fps minimum
- Reduced motion fallbacks for accessibility

### Error Handling

**Network Errors**:
```typescript
const handleContentLoad = async (contentId: string) => {
  try {
    const content = await api.content.getById(contentId);
    setContent(content);
  } catch (error) {
    if (error.code === 'NETWORK_ERROR') {
      // Show offline message with retry
      setError({ type: 'network', retry: true });
    } else if (error.code === 'NOT_FOUND') {
      // Show content not found with navigation
      setError({ type: 'not-found', retry: false });
    } else {
      // Generic error with retry option
      setError({ type: 'generic', retry: true });
    }
  }
};
```

**Platform Deep-linking**:
```typescript
const handlePlatformPress = async (platform: Platform) => {
  try {
    // Validate URL availability
    const canOpen = await Linking.canOpenURL(platform.deepLinkUrl);
    
    if (canOpen) {
      await Linking.openURL(platform.deepLinkUrl);
      // Track successful platform navigation
      analytics.track('platform_accessed', {
        contentId: content.id,
        platform: platform.name,
        availabilityType: platform.availabilityType
      });
    } else {
      // Fallback to platform-specific guidance
      showPlatformGuidance(platform);
    }
  } catch (error) {
    // Error handling with user guidance
    showPlatformError(platform, error);
  }
};
```

### Testing Considerations

**Unit Testing**:
- Component rendering with various data states
- User interaction handling and state updates
- Error state rendering and recovery flows
- Accessibility property verification

**Integration Testing**:
- API data loading and error handling
- Deep-linking functionality across platforms
- User action completion (watchlist, tracking)
- Cross-platform consistency verification

**Accessibility Testing**:
- Screen reader navigation and announcement
- Keyboard navigation flow validation
- Color contrast verification in both themes
- Content warning system effectiveness

### Performance Metrics

**Loading Performance**:
- **Time to First Contentful Paint**: < 1.5 seconds
- **Time to Interactive**: < 2.5 seconds
- **Image Loading**: Progressive enhancement strategy
- **API Response**: Background loading for secondary content

**User Interaction**:
- **Button Response Time**: < 100ms visual feedback
- **Deep-link Success Rate**: > 95% for supported platforms
- **Action Completion**: < 2 taps for primary actions
- **Error Recovery**: Clear paths for all error states

## Related Documentation

- [Design System Style Guide](../../design-system/style-guide.md) - Foundation colors, typography, spacing
- [Component Library](../../design-system/components/README.md) - Reusable UI components
- [Button Specifications](../../design-system/components/buttons.md) - Action button implementations
- [Card Components](../../design-system/components/cards.md) - Content card specifications
- [Accessibility Guidelines](../../accessibility/guidelines.md) - WCAG compliance and trauma-informed design

## Implementation Notes

### Developer Handoff

**Critical Requirements**:
1. **Hero Section**: Implement backdrop image with proper aspect ratio handling
2. **Content Warnings**: Ensure trauma-informed presentation with user control
3. **Platform Integration**: Robust deep-linking with comprehensive error handling
4. **Accessibility**: Full keyboard navigation and screen reader support
5. **Performance**: Progressive loading strategy for content-heavy screens

**Testing Priorities**:
1. Platform deep-linking across major streaming services
2. Content warning system effectiveness and user control
3. Accessibility compliance with assistive technologies
4. Network error handling and offline functionality
5. Cross-platform consistency (iOS, Android, Web)

**Success Metrics to Track**:
- Platform deep-link success rate (target: >95%)
- User action completion rate (watchlist, tracking)
- Content warning engagement and user control usage
- Screen loading performance on various network conditions
- Accessibility compliance audit scores

## Last Updated

August 22, 2025 - Initial comprehensive content detail screen design specification created

---

*This design specification provides the complete blueprint for implementing a user-centered, trauma-informed content detail screen that balances comprehensive information presentation with respect for the sensitive nature of True Crime content.*