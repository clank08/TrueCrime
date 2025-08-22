# Component Library - True Crime Tracking App

---

title: Component Library Overview
description: Comprehensive component specifications for React Native/Expo implementation
last-updated: 2025-08-15
version: 1.0
related-files:

-   design-documentation\design-system\style-guide.md
-   ../tokens/colors.md
-   ../tokens/typography.md
    dependencies:
-   NativeWind/Tailwind CSS integration
-   Expo SDK components
-   React Native accessibility APIs
    status: approved

---

# Component Library Overview

This component library provides the building blocks for the True Crime tracking app, designed specifically for React Native/Expo implementation with NativeWind styling. Each component balances the sophisticated visual requirements of True Crime content with the sensitivity needed for real-world tragedy documentation.

## Design Philosophy

### Component Principles

**Respectful Interface Elements**: Every component considers the sensitive nature of True Crime content, avoiding sensationalism while maintaining visual engagement.

**Accessibility-First Architecture**: Components are built with accessibility as a foundation, not an addition, ensuring screen reader compatibility and keyboard navigation support.

**Content-Aware Styling**: Interface elements adapt appropriately to different content types (documentaries vs. dramatizations, ongoing cases vs. historical content).

**Cross-Platform Consistency**: Components maintain visual and functional consistency across iOS, Android, and Web platforms while respecting platform conventions.

## Component Categories

### Foundation Components

-   **Button** - Primary, secondary, and tertiary actions with full state management
-   **Input** - Text fields, search bars, and form controls with validation
-   **Typography** - Text components with semantic meaning and proper hierarchy
-   **Container** - Layout containers with responsive behavior and safe area handling

### Content Components

-   **ContentCard** - Displays True Crime content with appropriate warnings and metadata
-   **ProgressIndicator** - Shows viewing progress for series and individual content
-   **RatingDisplay** - Star ratings and review summaries with user interaction
-   **ContentWarning** - Trauma-informed content warning system with user controls

### Navigation Components

-   **TabBar** - Primary navigation with platform-appropriate styling
-   **SearchBar** - Content discovery search with filtering and suggestions
-   **FilterChips** - Applied filter display with easy removal options
-   **Breadcrumbs** - Navigation history for deep content exploration

### Interaction Components

-   **Modal** - Overlay dialogs with proper focus management and accessibility
-   **Dropdown** - Selection controls with keyboard navigation support
-   **ActionSheet** - Context-sensitive action menus with platform conventions
-   **Toast** - Feedback messages with appropriate timing and dismissal options

### Social Components

-   **UserAvatar** - Profile images with privacy-conscious defaults
-   **ShareSheet** - Content sharing with granular privacy controls
-   **CommentCard** - Community discussions with moderation features
-   **PrivacyToggle** - User control over social feature visibility

## Component Structure

### Standard Component Interface

Each component follows a consistent structure for predictable implementation:

```typescript
interface ComponentProps {
    // Visual variants
    variant?: 'primary' | 'secondary' | 'tertiary';
    size?: 'sm' | 'md' | 'lg';

    // State management
    disabled?: boolean;
    loading?: boolean;
    error?: boolean;

    // Content
    children?: React.ReactNode;

    // Behavior
    onPress?: () => void;

    // Accessibility
    accessibilityLabel?: string;
    accessibilityHint?: string;
    accessibilityRole?: AccessibilityRole;

    // Styling
    style?: ViewStyle;
    testID?: string;
}
```

### Theme Integration

Components automatically adapt to light/dark themes with True Crime-specific considerations:

```typescript
const useThemeStyles = () => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    return {
        // Dark theme is primary for True Crime content
        background: isDark ? '#1A1A1C' : '#FFFFFF',
        surface: isDark ? '#2C2C30' : '#F5F5F5',
        text: isDark ? '#EAEAF4' : '#212121',
        // Content-specific adaptations
        contentWarning: isDark ? '#D32F2F' : '#C62828',
        factualContent: isDark ? '#388E3C' : '#2E7D32',
        dramatizedContent: isDark ? '#8B4B7F' : '#7B1FA2',
    };
};
```

## Core Component Specifications

### Button Component

**Purpose**: Primary interaction element for all user actions

**Variants and Usage**:

-   **Primary**: Main CTAs, content tracking actions
-   **Secondary**: Supporting actions, navigation elements
-   **Tertiary**: Subtle actions, less important options
-   **Ghost**: Text-only actions, destructive confirmations
-   **Danger**: Account deletion, content removal warnings

```typescript
interface ButtonProps extends ComponentProps {
    variant: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger';
    size: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
    icon?: React.ComponentType;
    iconPosition?: 'left' | 'right';
}

// Usage example
<Button
    variant="primary"
    size="md"
    onPress={handleAddToWatchlist}
    accessibilityLabel="Add Conversations with a Killer to your watchlist"
>
    Add to Watchlist
</Button>;
```

**Visual Specifications**:

_Primary Button_:

-   Height: 48px (mobile), 44px (desktop)
-   Padding: 16px horizontal, 12px vertical
-   Border radius: 8px
-   Background: Primary (#8B4B7F)
-   Text: White (#FFFFFF), Button typography (16px/20px, 600)
-   Shadow: 0px 2px 4px rgba(139, 75, 127, 0.2)

_State Variations_:

-   **Hover**: Background darkens to Primary Dark (#6B3760)
-   **Active**: Inset shadow with pressed visual feedback
-   **Focus**: 2px Primary Light (#A66B9E) outline with 2px offset
-   **Disabled**: Gray background (#E0E0E0) with disabled text color
-   **Loading**: Spinner overlay with maintained button dimensions

### ContentCard Component

**Purpose**: Display True Crime content with appropriate warnings and metadata

```typescript
interface ContentCardProps extends ComponentProps {
    content: {
        id: string;
        title: string;
        year: number;
        type: 'documentary' | 'series' | 'dramatization' | 'podcast';
        platform: string[];
        posterUrl: string;
        contentWarning?: 'mild' | 'moderate' | 'severe';
        userRating?: number;
        watchStatus?: 'not_started' | 'watching' | 'completed' | 'abandoned';
        progress?: number; // 0-100 for series
    };
    onPress?: () => void;
    onQuickAction?: (action: 'add' | 'rate' | 'share') => void;
    showQuickActions?: boolean;
}

// Usage example
<ContentCard
    content={bundyTapes}
    onPress={() => navigateToDetail(bundyTapes.id)}
    onQuickAction={handleQuickAction}
    showQuickActions={true}
    accessibilityLabel="Conversations with a Killer: The Ted Bundy Tapes, 2019 documentary series, rated 4.5 stars, currently watching episode 2 of 4"
/>;
```

**Visual Specifications**:

_Card Layout_:

-   Aspect ratio: 3:4 for poster-focused design
-   Border radius: 12px for card container, 8px for poster image
-   Padding: 12px internal padding below poster
-   Shadow: 0px 2px 8px rgba(0,0,0,0.15) with increased elevation on hover
-   Background: Dark-100 (#2C2C30) on dark theme, White (#FFFFFF) on light theme

_Content Warning Integration_:

-   Badge position: Top-right corner of poster with 4px margin
-   Warning levels: Color-coded badges (Yellow, Orange, Red) with consistent iconography
-   Badge size: 24px x 24px with warning level icon
-   Accessibility: Badge includes text description in accessibilityLabel

_Platform Indicators_:

-   Position: Bottom of poster with overlay gradient for readability
-   Display: Small platform logos (16px) with maximum 3 visible, +N more indicator
-   Spacing: 4px between logos with consistent alignment
-   Background: Semi-transparent overlay for contrast

### ProgressIndicator Component

**Purpose**: Visual representation of viewing progress for series and individual content

```typescript
interface ProgressIndicatorProps extends ComponentProps {
  progress: number; // 0-100
  type: 'circular' | 'linear' | 'episode-grid';
  episodes?: {
    id: string;
    title: string;
    watched: boolean;
    current?: boolean;
  }[];
  showPercentage?: boolean;
  showEpisodeCount?: boolean;
}

// Usage examples
<ProgressIndicator
  progress={75}
  type="circular"
  showPercentage={true}
  accessibilityLabel="75% complete, 3 of 4 episodes watched"
/>

<ProgressIndicator
  progress={50}
  type="episode-grid"
  episodes={episodeList}
  accessibilityLabel="Season 1 progress: Episodes 1-2 watched, currently on episode 3 of 6"
/>
```

**Visual Specifications**:

_Circular Progress_:

-   Diameter: 48px (large), 32px (medium), 24px (small)
-   Stroke width: 4px with 2px background track
-   Colors: Primary (#8B4B7F) for progress, Dark-300 (#4A4A52) for track
-   Animation: Smooth progress updates with 400ms ease-out timing
-   Center text: Percentage or fraction (e.g., "3/4") in Caption typography

_Linear Progress_:

-   Height: 6px with 2px border radius
-   Width: Full container width with 16px margins
-   Colors: Same as circular with smooth gradient fill
-   Background: Track color consistent with theme
-   Animation: Progress changes animate smoothly over 250ms

_Episode Grid_:

-   Grid layout: 2 columns (mobile), 3 (tablet), 4+ (desktop)
-   Episode indicators: 32px circles with episode number or checkmark
-   States: Watched (filled), Current (outlined), Unwatched (empty)
-   Spacing: 8px between indicators with consistent alignment
-   Accessibility: Each episode individually labeled for screen readers

### ContentWarning Component

**Purpose**: Trauma-informed content warnings with user control

```typescript
interface ContentWarningProps extends ComponentProps {
    level: 'mild' | 'moderate' | 'severe';
    description: string;
    specificWarnings?: string[];
    onAcknowledge?: () => void;
    onSkip?: () => void;
    showDetails?: boolean;
}

// Usage example
<ContentWarning
    level="severe"
    description="This content contains graphic discussions of violent crimes"
    specificWarnings={['Violence', 'Victim identification', 'Crime scene details']}
    onAcknowledge={proceedToContent}
    onSkip={skipContent}
    showDetails={true}
/>;
```

**Visual Specifications**:

_Warning Container_:

-   Background: Warning level color with 0.1 opacity overlay
-   Border: 2px solid warning level color
-   Border radius: 12px with generous internal padding (24px)
-   Position: Modal overlay or inline content warning
-   Typography: H4 for heading (18px/22px, 500), Body for description

_Warning Levels_:

-   **Mild**: Amber (#FF8F00) - Mature themes, brief violence mentions
-   **Moderate**: Orange (#F57C00) - Detailed crime discussion, victim identification
-   **Severe**: Red (#D32F2F) - Graphic violence, disturbing imagery, ongoing trauma

_User Controls_:

-   Button layout: Side-by-side with equal prominence
-   "I understand, continue": Primary button variant
-   "Skip this content": Secondary button variant
-   Details toggle: Tertiary button to expand specific warnings
-   Accessibility: Clear focus management and screen reader announcements

## Platform-Specific Adaptations

### iOS Implementation

**Native Element Integration**:

```typescript
// iOS-specific button with haptic feedback
const IOSButton: React.FC<ButtonProps> = ({ onPress, children, ...props }) => {
    const handlePress = () => {
        // Native haptic feedback for button presses
        HapticFeedback.impactAsync(HapticFeedback.ImpactFeedbackStyle.Light);
        onPress?.();
    };

    return (
        <Pressable
            onPress={handlePress}
            style={({ pressed }) => [
                styles.button,
                pressed && styles.pressed, // iOS pressed state
            ]}
            {...props}
        >
            {children}
        </Pressable>
    );
};
```

**iOS Design Considerations**:

-   Safe area handling for notched devices
-   Dynamic Type support for accessibility
-   SF Symbols integration where appropriate
-   Pull-to-refresh patterns for content lists
-   Swipe gesture support for common actions

### Android Implementation

**Material Design Integration**:

```typescript
// Android-specific card with Material elevation
const AndroidCard: React.FC<ContentCardProps> = ({ content, ...props }) => {
    return (
        <Pressable
            style={[
                styles.card,
                { elevation: 4 }, // Material Design elevation
            ]}
            android_ripple={{ color: 'rgba(139, 75, 127, 0.2)' }} // Material ripple
            {...props}
        >
            <ContentCardContent content={content} />
        </Pressable>
    );
};
```

**Android Design Considerations**:

-   Material Design elevation system
-   Ripple effects for touch feedback
-   FAB patterns for primary actions
-   Bottom sheet navigation patterns
-   Edge-to-edge display handling

### Web Implementation

**Web-Specific Enhancements**:

```typescript
// Web-specific hover states and keyboard navigation
const WebButton: React.FC<ButtonProps> = ({ onPress, ...props }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <Pressable
            onPress={onPress}
            onHoverIn={() => setIsHovered(true)}
            onHoverOut={() => setIsHovered(false)}
            style={[
                styles.button,
                isHovered && styles.hovered, // Web hover state
            ]}
            {...props}
        />
    );
};
```

**Web Design Considerations**:

-   Hover states for desktop interactions
-   Keyboard navigation with clear focus indicators
-   Responsive design across viewport sizes
-   Progressive enhancement for JavaScript-free functionality
-   SEO-friendly semantic HTML structure

## Accessibility Implementation

### Screen Reader Optimization

**Comprehensive Labels**:

```typescript
// Example of accessibility-optimized content card
<Pressable
    accessibilityRole="button"
    accessibilityLabel={`${content.title}, ${content.year} ${content.type}, rated ${content.userRating} out of 5 stars, ${watchStatusDescription}`}
    accessibilityHint="Double tap to view details and watch options"
    accessibilityActions={[
        { name: 'add_to_watchlist', label: 'Add to watchlist' },
        { name: 'rate_content', label: 'Rate this content' },
    ]}
    onAccessibilityAction={handleAccessibilityAction}
>
    <ContentCardVisual content={content} />
</Pressable>
```

### Keyboard Navigation

**Focus Management**:

```typescript
const Modal: React.FC<ModalProps> = ({ isVisible, onClose, children }) => {
    const firstFocusableRef = useRef<View>(null);

    useEffect(() => {
        if (isVisible) {
            // Focus first element when modal opens
            firstFocusableRef.current?.focus();
        }
    }, [isVisible]);

    const handleKeyPress = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            onClose();
        }
        // Handle tab cycling within modal
        handleTabCycling(event);
    };

    return (
        <Modal visible={isVisible} onKeyPress={handleKeyPress} accessibilityViewIsModal={true}>
            <View ref={firstFocusableRef} focusable>
                {children}
            </View>
        </Modal>
    );
};
```

## Testing and Quality Assurance

### Component Testing Strategy

**Automated Testing**:

```typescript
// Example component test with accessibility validation
describe('ContentCard Component', () => {
    it('renders with proper accessibility labels', () => {
        const content = mockContentData;
        const { getByLabelText } = render(<ContentCard content={content} onPress={jest.fn()} />);

        expect(getByLabelText(/Conversations with a Killer/)).toBeTruthy();
        expect(getByLabelText(/4.5 out of 5 stars/)).toBeTruthy();
        expect(getByLabelText(/currently watching/)).toBeTruthy();
    });

    it('handles keyboard navigation correctly', () => {
        // Test tab order and keyboard activation
    });

    it('provides appropriate haptic feedback on mobile', () => {
        // Test platform-specific interaction feedback
    });
});
```

**Visual Regression Testing**:

-   Automated screenshot comparison across platforms
-   Theme switching validation (light/dark)
-   Responsive behavior verification
-   Content warning display accuracy

### Manual Testing Checklist

**Accessibility Validation**:

-   [ ] Screen reader navigation logical and informative
-   [ ] Keyboard navigation reaches all interactive elements
-   [ ] Focus indicators visible and consistent
-   [ ] Color contrast meets WCAG AA standards across all themes
-   [ ] Touch targets meet minimum size requirements (44px)

**Cross-Platform Consistency**:

-   [ ] Visual consistency maintained across iOS, Android, Web
-   [ ] Platform-specific interactions work correctly
-   [ ] Performance acceptable across all target devices
-   [ ] Content warnings display appropriately on all platforms
-   [ ] Theme switching smooth and complete

**True Crime Content Sensitivity**:

-   [ ] Content warnings appropriate and respectful
-   [ ] Victim names and images treated with dignity
-   [ ] Fact vs. fiction distinctions clear and consistent
-   [ ] User controls for sensitive content work correctly
-   [ ] Community moderation features function properly

## Implementation Guidelines

### NativeWind Integration

**Tailwind Configuration**:

```javascript
// tailwind.config.js for True Crime app
module.exports = {
    content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
    presets: [require('nativewind/preset')],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#8B4B7F',
                    dark: '#6B3760',
                    light: '#A66B9E',
                },
                dark: {
                    50: '#1A1A1C',
                    100: '#2C2C30',
                    200: '#3A3A40',
                    300: '#4A4A52',
                },
                warning: {
                    mild: '#FF8F00',
                    moderate: '#F57C00',
                    severe: '#D32F2F',
                },
            },
            fontFamily: {
                inter: ['Inter'],
            },
        },
    },
    plugins: [],
};
```

**Component Styling Approach**:

```typescript
// Combining NativeWind with platform-specific styles
const Button: React.FC<ButtonProps> = ({ variant, size, children, ...props }) => {
    const baseClasses = 'rounded-lg font-semibold items-center justify-center';
    const variantClasses = {
        primary: 'bg-primary text-white',
        secondary: 'bg-dark-200 text-dark-700',
        tertiary: 'bg-transparent text-primary',
    };
    const sizeClasses = {
        sm: 'px-4 py-2 h-10',
        md: 'px-6 py-3 h-12',
        lg: 'px-8 py-4 h-14',
    };

    const className = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`;

    return (
        <Pressable className={className} {...props}>
            <Text className="font-semibold">{children}</Text>
        </Pressable>
    );
};
```

### Performance Optimization

**Component Optimization**:

```typescript
// Memoized content card for list performance
const ContentCard = React.memo<ContentCardProps>(
    ({ content, onPress }) => {
        const themeStyles = useThemeStyles();

        return (
            <Pressable
                style={[styles.card, themeStyles.cardBackground]}
                onPress={() => onPress(content.id)}
            >
                <Image
                    source={{ uri: content.posterUrl }}
                    style={styles.poster}
                    loadingIndicatorSource={require('../assets/placeholder.png')}
                />
                <Text style={[styles.title, themeStyles.text]}>{content.title}</Text>
            </Pressable>
        );
    },
    (prevProps, nextProps) => {
        // Optimize re-renders by comparing relevant props
        return (
            prevProps.content.id === nextProps.content.id &&
            prevProps.content.watchStatus === nextProps.content.watchStatus
        );
    }
);
```

**Image Loading Optimization**:

```typescript
// Optimized image loading for content posters
const ContentPoster: React.FC<{ uri: string; title: string }> = ({ uri, title }) => {
    return (
        <Image
            source={{ uri }}
            style={styles.poster}
            loadingIndicatorSource={require('../assets/loading-placeholder.png')}
            defaultSource={require('../assets/default-poster.png')}
            resizeMode="cover"
            accessibilityLabel={`${title} poster image`}
            // Optimize for performance
            fadeDuration={200}
            blurRadius={0}
        />
    );
};
```

## Future Enhancements

### Planned Component Additions

**Advanced Content Components**:

-   **CaseTimeline**: Interactive timeline for case-based content organization
-   **ContentComparison**: Side-by-side comparison of different treatments of same case
-   **FactCheck**: Community-driven fact verification for dramatized content
-   **VictimMemorial**: Respectful memorial components for victim remembrance

**Social Integration Components**:

-   **DiscussionThread**: Threaded discussions with moderation features
-   **PrivacyControls**: Granular privacy settings for social features
-   **ContentRecommendation**: Personalized recommendation cards with social proof
-   **CommunityChallenge**: Themed viewing challenges with progress tracking

**Accessibility Enhancements**:

-   **VoiceControl**: Voice-activated content discovery and tracking
-   **HighContrast**: Enhanced visual accessibility for users with visual impairments
-   **SimplifiedUI**: Reduced complexity mode for users with cognitive difficulties
-   **TraumaFilter**: Advanced content filtering for users with specific trigger sensitivities

This component library provides the foundation for building a respectful, accessible, and engaging True Crime tracking experience that serves both casual viewers and dedicated enthusiasts while maintaining sensitivity to the real-world impact of the content being tracked.
