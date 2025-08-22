# Authentication & Onboarding - Feature Design

---

title: Authentication & Onboarding Flow Design
description: Complete user experience design for account creation, platform connection, and app onboarding
feature: Authentication & Onboarding
last-updated: 2025-08-15
version: 1.0
related-files:

-   ../../design-system/style-guide.md
-   ../../design-system/components/README.md
    dependencies:
-   Supabase Auth integration
-   Third-party platform APIs
-   Onboarding component library
    status: approved

---

# Authentication & Onboarding Experience Design

## Feature Overview

The authentication and onboarding flow serves as the critical first impression and activation point for True Crime tracking app users. This feature transforms new visitors into engaged users by efficiently connecting them with their existing streaming platforms while demonstrating immediate value through personalized content discovery.

## User Experience Analysis

### Primary User Goal

New users want to quickly set up their account and connect their streaming services so they can immediately start discovering and tracking True Crime content relevant to their interests and platform subscriptions.

### Success Criteria

-   User completes full onboarding flow in under 3 minutes
-   90% of users successfully connect at least one streaming platform
-   Users see personalized recommendations within 24 hours of signup
-   75% of onboarded users track their first content within first session

### Key Pain Points Addressed

-   **Platform Fragmentation**: Eliminates need to remember what's been watched across multiple services
-   **Content Discovery**: Reduces time spent browsing multiple platforms for new True Crime content
-   **Setup Friction**: Streamlined connection process with clear value proposition at each step
-   **Trust Building**: Transparent privacy controls and platform permission explanations

### User Personas Served

-   **Primary**: Sarah (35, marketing professional, watches True Crime 4+ evenings/week across Netflix, Hulu, Discovery+)
-   **Secondary**: Mike (42, casual viewer, watches 2-3 shows monthly, primarily on cable networks)
-   **Tertiary**: Jessica (28, podcaster researching cases, needs comprehensive content tracking across all platforms)

## Information Architecture

### Content Hierarchy

1. **Welcome & Value Proposition** - Clear benefit statement and social proof
2. **Account Creation** - Minimal required information with social login options
3. **Platform Connection** - Progressive disclosure of supported services with clear benefits
4. **Interest Selection** - Content preferences that drive initial recommendations
5. **Privacy Configuration** - Transparent controls with privacy-first defaults
6. **Tutorial Introduction** - Quick orientation to core features

### Navigation Structure

Linear flow with strategic back navigation and skip options for non-critical steps:

-   **Required Steps**: Account creation, email verification
-   **Recommended Steps**: Platform connection (minimum 1), interest selection
-   **Optional Steps**: Additional platform connections, social feature setup, notification preferences

### Mental Model Alignment

Users approach this as "setting up my streaming tracker" similar to:

-   Netflix account setup with profile creation
-   TV guide configuration with channel/provider selection
-   Social media onboarding with interest selection

The flow mirrors familiar patterns while emphasizing the specialized True Crime focus and cross-platform benefits.

### Progressive Disclosure Strategy

1. **Level 1**: Core value prop and basic account creation
2. **Level 2**: Primary platform connection with immediate content preview
3. **Level 3**: Additional platforms and advanced preferences
4. **Level 4**: Social features and privacy controls
5. **Level 5**: Power user features and notification customization

## User Journey Mapping

### Core Experience Flow

#### Step 1: Landing & Welcome

**Trigger**: User discovers app via App Store, social media, or word of mouth

**Visual Design**:

-   **Layout**: Full-screen hero with app preview carousel and benefit highlights
-   **Typography**: H1 "Track True Crime Across Every Platform" with Body Large supporting benefits
-   **Color Application**: Dark theme primary with Primary accent CTAs
-   **Interactive Elements**: Primary "Get Started" button, secondary "Learn More" link
-   **Visual Hierarchy**: App preview (40%), headline (25%), benefits (25%), CTA (10%)
-   **Whitespace**: Generous 32px spacing between major sections for breathing room

**Available Actions**:

-   **Primary**: "Get Started" button leading to account creation
-   **Secondary**: "Learn More" expanding benefit details and platform coverage
-   **Tertiary**: Platform showcase carousel with swipe/tap interactions

**System Feedback**:

-   Subtle parallax scrolling on benefit showcase
-   Loading state for "Get Started" with 250ms delay
-   Preview carousel with smooth 400ms transitions

#### Step 2: Account Creation

**Task Flow**: Email entry → Password creation → Email verification

**State Changes**: Form validation in real-time, success confirmation, email sent notification

**Visual Design**:

-   **Layout**: Centered form (320px max width) with progress indicator (step 1 of 4)
-   **Form Design**: Clean inputs with floating labels, password strength indicator
-   **Typography**: H2 "Create Your Account" with Body text for input labels
-   **Validation**: Inline success/error states with semantic colors
-   **Social Login**: OAuth buttons for Google, Apple with consistent branding

**Interaction Specifications**:

-   **Form Validation**: Real-time validation with 300ms debounce
-   **Password Requirements**: Progressive disclosure of requirements as user types
-   **Social Login**: One-tap authentication with loading states
-   **Error Recovery**: Clear messaging with specific resolution steps

**Error Prevention**: Email format validation, password strength requirements, duplicate account detection with helpful messaging

#### Step 3: Platform Connection

**Task Flow**: Platform selection → Authentication → Permission grant → Success confirmation

**Progressive Disclosure**: Show top 5 platforms initially, expand to full list on user request

**Visual Design**:

-   **Layout**: Grid layout (2 columns mobile, 3 tablet, 4 desktop) with consistent platform cards
-   **Platform Cards**: Service logo, connection status, subscriber count for social proof
-   **Connected State**: Success indicator with content count preview
-   **Typography**: Platform names in H4, connection status in Body Small

**Interaction Specifications**:

-   **Connection Flow**: Modal overlay for OAuth without losing context
-   **Loading States**: Shimmer effect while verifying connection
-   **Success Animation**: Smooth checkmark animation with 400ms duration
-   **Skip Option**: Clear "I'll connect later" with explanation of limited functionality

**Error Recovery**: Clear error messages for failed connections with retry options and troubleshooting links

#### Step 4: Content Interest Selection

**Purpose**: Personalize initial recommendations and demonstrate app value

**Visual Design**:

-   **Layout**: Tag-style selection grid with visual hierarchy
-   **Interest Categories**: Popular cases, sub-genres, content types with consistent iconography
-   **Selection State**: Primary color background with white text, subtle scale animation
-   **Typography**: Category names in Label style (14px, 500, uppercase)

**Interaction Specifications**:

-   **Multi-Select**: Minimum 3, maximum 8 selections with live counter
-   **Quick Actions**: "Popular choices" preset with one-tap selection
-   **Preview**: Live content recommendations updating based on selections
-   **Micro-interactions**: Gentle bounce on selection with haptic feedback (mobile)

### Advanced Users & Edge Cases

#### Power User Shortcuts

-   **Bulk Platform Connection**: "Connect All" option for users with many subscriptions
-   **Import Existing Data**: Integration with TV Time, Letterboxd, or other tracking apps
-   **Advanced Filtering**: Detailed content preferences (sub-genres, production years, specific networks)

#### Empty States

-   **No Platform Connection**: Free content recommendations with clear upgrade path
-   **No Interests Selected**: Popular True Crime content showcase with gentle encouragement to personalize
-   **Email Verification Pending**: Clear status with resend option and timeline expectations

#### Error States

-   **Platform Connection Failed**: Specific troubleshooting based on platform and error type
-   **Email Verification Issues**: Alternative verification methods and support contact
-   **Network Connectivity**: Offline mode with sync when connection restored

#### Loading States

-   **Platform Verification**: Progressive loading with status updates ("Connecting...", "Verifying...", "Syncing content...")
-   **Content Loading**: Skeleton screens matching final content layout
-   **Account Creation**: Button loading state with spinner replacement

## Screen-by-Screen Specifications

### Screen: Welcome & Value Proposition

**Purpose**: Immediately communicate app value and encourage signup

**Layout Structure**:

-   Container: Full screen with safe area padding
-   Grid: Single column with hierarchical content sections
-   Responsive: Same layout across devices with font scaling

**Content Strategy**:

-   Hero headline emphasizing cross-platform benefit
-   Three key value propositions with supporting visuals
-   Social proof elements (user testimonials, platform coverage)
-   Clear call-to-action with friction-removing language

#### State: Default

**Visual Design Specifications**:

_Layout_:

-   Header section (40% screen height): App logo, headline, supporting text
-   Benefits section (35% screen height): Three-column benefit showcase with icons
-   Social proof (15% screen height): Platform logos and user testimonial
-   CTA section (10% screen height): Primary action button with secondary link

_Typography_:

-   Headline: H1 (28px/32px, 600) in primary text color
-   Supporting text: Body Large (18px/26px, 400) in secondary text color
-   Benefits: H3 (20px/24px, 500) for headings, Body (16px/24px, 400) for descriptions
-   CTA: Button typography (16px/20px, 600)

_Color Application_:

-   Background: Dark-50 (#1A1A1C) for primary surface
-   Headlines: Dark-700 (#CACAD4) for high contrast
-   Supporting text: Dark-500 (#8A8A94) for readability
-   CTAs: Primary (#8B4B7F) with hover state Primary Dark (#6B3760)

_Interactive Elements_:

-   Primary CTA: 48px height with 16px/24px padding, 8px border radius
-   Secondary link: Underline on hover with 250ms transition
-   Benefit icons: Subtle hover animation (scale 1.05, 250ms ease-out)

_Visual Hierarchy_:

-   Largest visual weight on headline with generous whitespace
-   Benefits section uses consistent icon/text pairing
-   CTA button prominently positioned with sufficient touch target

_Whitespace Usage_:

-   32px spacing between major sections
-   16px spacing within content groups
-   24px minimum spacing around interactive elements

**Interaction Design Specifications**:

_Primary Actions_:

-   "Get Started" button with full state treatment (default, hover, active, focus, loading)
-   Loading state shows spinner with "Setting up..." text
-   Success leads to account creation screen with smooth transition

_Secondary Actions_:

-   "Learn More" expands additional information inline
-   Platform showcase allows horizontal scrolling/swiping
-   Skip to tour option for users wanting to explore without signup

_Animation & Motion_:

-   Entry: Fade in with 400ms staggered timing for content sections
-   CTA hover: Gentle lift animation (translateY(-2px), 250ms ease-out)
-   Scroll: Subtle parallax effect on background elements
-   Exit: Slide up transition to account creation (400ms ease-out)

**Responsive Design Specifications**:

_Mobile (320-767px)_:

-   Single column layout with full-width elements
-   Stack benefits vertically with consistent spacing
-   Minimum 44px touch targets for all interactive elements

_Tablet (768-1023px)_:

-   Two-column layout for benefits section
-   Increased font sizes per responsive typography scale
-   Maintain aspect ratio for visual elements

_Desktop (1024px+)_:

-   Three-column benefits layout for optimal content scanning
-   Hover states active for all interactive elements
-   Keyboard navigation support with clear focus indicators

**Accessibility Specifications**:

_Screen Reader Support_:

-   Semantic heading structure (h1 for main headline, h2 for benefits)
-   Alt text for all decorative and informational images
-   ARIA labels for interactive elements not clearly described by visible text

_Keyboard Navigation_:

-   Tab order: Headline → Benefits → CTA → Secondary actions
-   Focus indicators: 2px Primary color outline with 2px offset
-   Skip link to main CTA for quick access

_Color Contrast_:

-   All text combinations verified to meet 4.5:1 minimum ratio
-   Interactive elements meet 3:1 ratio for non-text elements
-   Focus indicators provide sufficient contrast against all backgrounds

### Screen: Account Creation

**Purpose**: Efficiently collect required information while building trust

**Layout Structure**:

-   Centered form container (320px max width mobile, 400px desktop)
-   Progress indicator showing step 1 of 4
-   Clear hierarchy between form fields and actions

#### State: Default

**Visual Design Specifications**:

_Form Layout_:

-   Vertical field arrangement with consistent 16px spacing
-   Floating label inputs for space efficiency
-   Password field with visibility toggle and strength indicator
-   Social login options separated visually from email signup

_Typography Application_:

-   Form heading: H2 (24px/28px, 600)
-   Field labels: Label (14px/16px, 500, uppercase)
-   Input text: Body (16px/24px, 400)
-   Helper text: Body Small (14px/20px, 400)
-   Error messages: Body Small (14px/20px, 400) in Error color

_Input Field Specifications_:

-   Height: 48px with 12px/16px internal padding
-   Border radius: 8px with 1px border
-   Background: Dark-100 (#2C2C30) with Dark-300 (#4A4A52) border
-   Focus state: 2px Primary (#8B4B7F) border with removed outline
-   Error state: 2px Error (#D32F2F) border with tinted background

**Interaction Design Specifications**:

_Form Validation_:

-   Real-time validation with 300ms debounce on input changes
-   Visual feedback using semantic colors (success green, error red)
-   Password strength meter updates progressively as user types
-   Email format validation with specific error messages

_Social Authentication_:

-   Google/Apple login buttons with platform-consistent styling
-   Loading states for OAuth redirections
-   Error handling for cancelled or failed authentications
-   Clear explanation of data accessed through social login

_Progress Communication_:

-   Step indicator showing current position (1 of 4)
-   Estimated time remaining: "About 2 minutes left"
-   Clear exit options with saved progress indication

#### State: Loading (Account Creation)

**Visual Changes**:

-   Submit button transforms to loading spinner
-   Form fields become disabled with visual indicator
-   Loading message: "Creating your secure account..."
-   Background overlay prevents interaction with other elements

**Animation Specifications**:

-   Button width maintains consistency during loading transformation
-   Spinner animation: 1.5s rotation with cubic-bezier(0.4, 0, 0.6, 1)
-   Success checkmark animation replaces spinner on completion
-   Transition to next screen with 400ms slide animation

#### State: Error (Creation Failed)

**Error Handling**:

-   Inline error messages below relevant fields
-   General errors shown in alert component at top of form
-   Specific error types: duplicate email, weak password, network failure
-   Recovery actions: retry button, alternative signup methods, contact support

**Visual Treatment**:

-   Error color (#D32F2F) for text and border treatments
-   Error icon (⚠️) accompanying messages for quick visual recognition
-   Maintained form state to avoid user data loss
-   Clear path forward with actionable next steps

### Screen: Platform Connection

**Purpose**: Connect user's streaming services to unlock personalized content discovery

**Layout Structure**:

-   Grid of platform cards (2 columns mobile, 3 tablet, 4 desktop)
-   Progress indicator showing step 2 of 4
-   Clear connection status and content preview

#### State: Selection View

**Platform Card Specifications**:

_Visual Design_:

-   Card dimensions: Square aspect ratio with consistent sizing
-   Platform logo: Centered with service name below
-   Connection status: Visual indicator (connected/disconnected)
-   Subscriber count: Social proof element for popular platforms

_Card States_:

-   **Default**: Dark-100 background with subtle shadow
-   **Hover**: Dark-200 background with increased shadow
-   **Connected**: Success border with checkmark indicator
-   **Loading**: Shimmer effect with connecting status text
-   **Error**: Error border with retry option

**Interaction Flow**:

_Connection Process_:

1. User taps platform card
2. Modal overlay with connection explanation
3. Redirect to platform OAuth (external)
4. Return with success/failure status
5. Update card state with animation

_Success Animation_:

-   Checkmark appears with 400ms scale animation
-   Card background transitions to success state
-   Brief "Connected!" text confirmation
-   Content count updates with counting animation

#### State: Connected Platforms

**Connected State Visual Treatment**:

-   Success indicator: Green checkmark with platform logo
-   Content preview: "X shows available" with sample thumbnails
-   Manage connection: Subtle gear icon for disconnect/reconnect options
-   Status confirmation: "Last synced X minutes ago"

**Content Preview Integration**:

-   Mini content cards showing 2-3 relevant True Crime titles
-   Smooth carousel animation for multiple available shows
-   "View all X titles" link leading to full content discovery
-   Loading skeleton while content is being fetched

### Screen: Interest Selection

**Purpose**: Personalize content recommendations while demonstrating app intelligence

**Layout Structure**:

-   Tag-based selection interface with visual categories
-   Live preview of content matching selections
-   Progress indicator showing step 3 of 4

#### State: Category Selection

**Interest Categories**:

_Visual Organization_:

-   **Popular Cases**: Ted Bundy, Jeffrey Dahmer, JonBenét Ramsey, etc.
-   **Sub-genres**: Serial Killers, Missing Persons, Cold Cases, True Crime Comedy
-   **Content Types**: Documentaries, Docuseries, Dramatizations, Podcasts
-   **Time Periods**: Recent Cases, Historical Crimes, Ongoing Investigations

_Selection Interface_:

-   Tag-style buttons with consistent sizing and spacing
-   Multi-select with visual feedback (background color change)
-   Minimum 3 selections required, maximum 8 recommended
-   Selection counter: "3 of 8 interests selected"

**Live Preview Integration**:

-   Right-side panel (desktop) or bottom section (mobile) showing content matches
-   Updates in real-time as selections change
-   Content thumbnails with titles and platform availability
-   "Based on your interests" heading with recommendation count

**Interaction Specifications**:

_Selection Feedback_:

-   Tap/click: Immediate background color change to Primary
-   Deselection: Return to default state with 250ms transition
-   Maximum reached: Disabled state for unselected options with explanation
-   Selection complete: Continue button becomes enabled and prominent

_Content Preview_:

-   Auto-update with 500ms debounce after selection changes
-   Smooth crossfade between different content sets
-   Loading skeleton during content fetch
-   Empty state if selections yield no results (with suggestion to broaden)

## Technical Implementation Guidelines

### State Management Requirements

**Authentication State**:

-   User authentication status (unauthenticated, authenticating, authenticated, error)
-   Platform connection status for each service (disconnected, connecting, connected, error)
-   Onboarding progress tracking with ability to resume from interruption
-   Form data persistence across steps with automatic save

**Performance Targets**:

-   Screen transitions: Maximum 400ms with smooth animations
-   Platform connection: OAuth flow completion within 30 seconds
-   Form validation: Real-time feedback within 300ms of user input
-   Content preview updates: Maximum 1 second load time

### API Integration Points

**Supabase Auth Integration**:

-   Email/password authentication with email verification
-   Social login (Google, Apple) with proper scope management
-   Session management with automatic refresh
-   User profile creation with onboarding completion tracking

**Platform APIs**:

-   OAuth 2.0 implementation for supported streaming services
-   Token storage and refresh management
-   Connection verification and health checks
-   Graceful handling of API rate limits and downtime

### Browser/Platform Support

**Mobile Requirements**:

-   iOS Safari 14+ and Chrome Mobile 90+
-   Android Chrome 90+ and Samsung Internet 14+
-   Progressive Web App functionality for installation
-   Offline capability for form data and connection status

**Desktop Requirements**:

-   Modern browsers supporting ES2020 features
-   Keyboard navigation compliance
-   Screen reader compatibility with proper ARIA implementation
-   High contrast mode support

## Quality Assurance Checklist

### User Experience Validation

-   [ ] Complete onboarding flow achievable in under 3 minutes by average user
-   [ ] All user types (primary, secondary, tertiary personas) can successfully complete setup
-   [ ] Platform connection success rate above 90% in testing
-   [ ] Clear error recovery paths for all failure scenarios
-   [ ] Loading states provide appropriate feedback and don't feel excessive

### Design System Compliance

-   [ ] All colors, typography, and spacing match style guide specifications
-   [ ] Component states (hover, focus, active, disabled) implemented consistently
-   [ ] Animation timing and easing curves follow established motion system
-   [ ] Dark theme is primary with proper contrast ratios throughout
-   [ ] Light theme alternative available and properly implemented

### Accessibility Compliance

-   [ ] WCAG 2.1 AA compliance verified through automated and manual testing
-   [ ] Screen reader experience tested with actual assistive technology
-   [ ] Keyboard navigation complete with logical tab order
-   [ ] Color contrast verified for all text and interactive elements
-   [ ] Focus indicators visible and consistent throughout flow
-   [ ] Form labels and error messages properly associated with inputs

### Technical Integration

-   [ ] Supabase Auth integration working correctly for all authentication methods
-   [ ] Platform OAuth flows complete successfully with proper error handling
-   [ ] State persistence works across app backgrounding and network interruptions
-   [ ] Performance targets met on target devices and network conditions
-   [ ] Analytics tracking implemented for funnel analysis and optimization

### Security & Privacy

-   [ ] User data encrypted in transit and at rest
-   [ ] Platform credentials stored securely following OAuth best practices
-   [ ] Privacy policy clearly explains data collection and usage
-   [ ] User consent flows meet GDPR and CCPA requirements
-   [ ] No sensitive information logged or exposed in error messages

## Related Documentation

### Design Foundations
-   [User Personas](../../user-personas.md) - Target user profiles driving authentication design
-   [User Flows](../../user-flows.md) - Complete onboarding flow mapping
-   [User Stories](../../user-stories.md) - Authentication requirements and acceptance criteria
-   [Interaction Patterns](../../interaction-patterns.md) - Touch, keyboard, and accessibility patterns

### Design System
-   [Design System Style Guide](../../design-system/style-guide.md) - Foundation colors, typography, and spacing
-   [Component Specifications](../../design-system/components/README.md) - Button and form component implementations
-   [Form Components](../../design-system/components/forms.md) - Input field specifications
-   [Button Components](../../design-system/components/buttons.md) - CTA button patterns

### Related Features
-   [Content Discovery Flow](../content-discovery/README.md) - Post-onboarding content experience
-   [Social Features](../social-features/README.md) - Social setup during onboarding

## Implementation Notes

This authentication and onboarding flow serves as the foundation for user activation and retention. The design prioritizes reducing friction while building trust through transparency about data usage and platform permissions. Special attention has been paid to the unique requirements of True Crime content, including appropriate content warnings and privacy-first defaults for social features.

The progressive disclosure approach ensures users can get value from the app even with minimal setup, while providing clear paths to unlock additional functionality through platform connections and preference refinement.

## Last Updated

August 15, 2025 - Initial comprehensive design specification for authentication and onboarding user experience, including all states, interactions, and technical requirements.
