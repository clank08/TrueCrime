# Card Component System - True Crime App

---
title: Card Component Specifications
description: Comprehensive card component library for content display, case information, and interactive layouts with True Crime-specific considerations
last-updated: 2025-08-20
version: 1.0
related-files:
  - ../style-guide.md
  - ../tokens/colors.md
  - ../tokens/typography.md
  - buttons.md
  - progress.md
dependencies:
  - React Native Image component
  - NativeWind styling system
  - Platform-specific shadow APIs
  - Accessibility APIs
status: approved
---

# Card Component System

## Overview

The card component system provides structured content display containers for the True Crime tracking app, designed to present sensitive information with dignity while maintaining visual engagement. All card variants respect the serious nature of True Crime content while ensuring excellent usability and clear information hierarchy.

## Design Philosophy

### Card Design Principles

**Respectful Information Display**: Cards present True Crime content with appropriate gravity and sensitivity, avoiding sensationalism while maintaining user engagement.

**Clear Content Hierarchy**: Visual organization helps users quickly understand content type, relevance, and available actions without overwhelming complexity.

**Context-Aware Interaction**: Cards adapt their presentation based on content sensitivity, user progress, and community safety considerations.

**Accessible Information Architecture**: Card layouts work excellently with screen readers and provide clear navigation paths through complex content relationships.

## Component Specifications

### Base Card Component

**Purpose**: Foundation container for all card variants with consistent spacing, shadows, and accessibility

```typescript
interface BaseCardProps {
    children: React.ReactNode;
    
    // Appearance
    variant?: 'default' | 'elevated' | 'outlined' | 'ghost';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    
    // Interaction
    onPress?: () => void;
    disabled?: boolean;
    
    // Layout
    fullWidth?: boolean;
    aspectRatio?: number;
    
    // Accessibility
    accessibilityLabel?: string;
    accessibilityHint?: string;
    accessibilityRole?: 'button' | 'article' | 'region';
    
    // Styling
    style?: ViewStyle;
    testID?: string;
}
```

#### Visual Specifications

**Default Card**:
- **Background**: Dark-100 (#2C2C30) on dark theme, White (#FFFFFF) on light theme
- **Border Radius**: 12px for modern, approachable feel
- **Border**: 1px solid Dark-300 (#4A4A52) on dark theme for subtle definition
- **Shadow**: 0px 2px 8px rgba(0, 0, 0, 0.1) on light theme, 0px 2px 8px rgba(0, 0, 0, 0.3) on dark theme
- **Padding**: 16px default internal spacing

```css
.card-default {
    background-color: #2C2C30;
    border: 1px solid #4A4A52;
    border-radius: 12px;
    box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.3);
    padding: 16px;
    transition: all 250ms cubic-bezier(0.0, 0, 0.2, 1);
}

.card-default:hover {
    transform: translateY(-2px);
    box-shadow: 0px 4px 16px rgba(0, 0, 0, 0.4);
}

.card-elevated {
    background-color: #2C2C30;
    border: none;
    border-radius: 12px;
    box-shadow: 0px 4px 16px rgba(0, 0, 0, 0.4);
}

.card-outlined {
    background-color: transparent;
    border: 2px solid #4A4A52;
    border-radius: 12px;
    box-shadow: none;
}

.card-ghost {
    background-color: transparent;
    border: none;
    border-radius: 12px;
    box-shadow: none;
}
```

### Content Card Component

**Purpose**: Display True Crime content with appropriate warnings, metadata, and tracking integration

```typescript
interface ContentCardProps extends BaseCardProps {
    content: {
        id: string;
        title: string;
        year: number;
        type: 'documentary' | 'series' | 'dramatization' | 'podcast' | 'book';
        platform: string[];
        posterUrl?: string;
        description?: string;
        
        // Content classification
        contentWarning?: 'mild' | 'moderate' | 'severe';
        factualAccuracy?: 'factual' | 'mixed' | 'dramatized';
        
        // User interaction
        userRating?: number;
        watchStatus?: 'not_started' | 'watching' | 'completed' | 'abandoned';
        progress?: number; // 0-100 for series
        
        // Case context
        caseName?: string;
        participants?: string[];
        timeframe?: string;
    };
    
    // Layout options
    layout?: 'poster' | 'landscape' | 'compact' | 'detailed';
    showQuickActions?: boolean;
    showProgress?: boolean;
    showCaseContext?: boolean;
    
    // Callbacks
    onPress?: () => void;
    onQuickAction?: (action: 'track' | 'rate' | 'share' | 'platform') => void;
}
```

#### Visual Specifications

**Poster Layout (Default)**:
- **Aspect Ratio**: 3:4 for poster-focused design (matches streaming service cards)
- **Image Treatment**: 8px border radius, smooth loading with placeholder
- **Content Organization**: Poster (70%), metadata and actions (30%)
- **Typography**: H4 title (18px/22px, 500), Body Small metadata (14px/20px, 400)

**Content Warning Integration**:
- **Badge Position**: Top-right corner of poster with 8px margin from edges
- **Warning Levels**: Color-coded badges with appropriate iconography
  - Mild: Amber (#FF8F00) with caution icon
  - Moderate: Orange (#F57C00) with warning triangle
  - Severe: Red (#D32F2F) with alert icon
- **Badge Size**: 24px circular badge with 12px icon
- **Accessibility**: Warning level included in card accessibility label

**Platform Indicators**:
- **Position**: Bottom overlay on poster with gradient background for readability
- **Display**: Platform logos (16px) with maximum 3 visible, "+N more" for additional
- **Background**: Linear gradient overlay (transparent to rgba(0,0,0,0.7))
- **Spacing**: 4px between logos, 8px from bottom edge

```typescript
const ContentCard: React.FC<ContentCardProps> = ({
    content,
    layout = 'poster',
    showQuickActions = true,
    showProgress = true,
    showCaseContext = false,
    onPress,
    onQuickAction,
    ...props
}) => {
    const getContentWarningColor = (level?: string) => {
        switch (level) {
            case 'mild': return '#FF8F00';
            case 'moderate': return '#F57C00';
            case 'severe': return '#D32F2F';
            default: return 'transparent';
        }
    };
    
    const getFactualAccuracyBadge = (accuracy?: string) => {
        switch (accuracy) {
            case 'factual': return { color: '#388E3C', label: 'FACTUAL' };
            case 'mixed': return { color: '#FF8F00', label: 'MIXED' };
            case 'dramatized': return { color: '#8B4B7F', label: 'DRAMA' };
            default: return null;
        }
    };
    
    const accessibilityLabel = useMemo(() => {
        const parts = [
            content.title,
            content.year.toString(),
            content.type,
            content.userRating ? `rated ${content.userRating} out of 5 stars` : '',
            content.watchStatus === 'completed' ? 'completed' : 
            content.watchStatus === 'watching' ? `currently watching, ${content.progress}% complete` :
            content.watchStatus === 'abandoned' ? 'abandoned' : 'not started',
            content.contentWarning ? `${content.contentWarning} content warning` : '',
            content.caseName ? `about the ${content.caseName} case` : ''
        ].filter(Boolean);
        
        return parts.join(', ');
    }, [content]);
    
    return (
        <BaseCard
            onPress={onPress}
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="button"
            accessibilityHint="Double tap to view content details and watch options"
            {...props}
        >
            <View style={styles.contentCardContainer}>
                {/* Poster Section */}
                <View style={styles.posterContainer}>
                    <Image
                        source={{ uri: content.posterUrl }}
                        style={styles.posterImage}
                        loadingIndicatorSource={require('../assets/content-placeholder.png')}
                        defaultSource={require('../assets/content-placeholder.png')}
                        resizeMode="cover"
                        accessibilityLabel={`${content.title} poster`}
                    />
                    
                    {/* Content Warning Badge */}
                    {content.contentWarning && (
                        <View 
                            style={[
                                styles.warningBadge,
                                { backgroundColor: getContentWarningColor(content.contentWarning) }
                            ]}
                            accessibilityLabel={`${content.contentWarning} content warning`}
                        >
                            <Icon 
                                name="alert-triangle" 
                                size={12} 
                                color="#FFFFFF" 
                            />
                        </View>
                    )}
                    
                    {/* Factual Accuracy Badge */}
                    {content.factualAccuracy && (
                        <View style={[
                            styles.accuracyBadge,
                            { backgroundColor: getFactualAccuracyBadge(content.factualAccuracy)?.color }
                        ]}>
                            <Text style={styles.accuracyBadgeText}>
                                {getFactualAccuracyBadge(content.factualAccuracy)?.label}
                            </Text>
                        </View>
                    )}
                    
                    {/* Platform Overlay */}
                    <View style={styles.platformOverlay}>
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.7)']}
                            style={styles.platformGradient}
                        >
                            <View style={styles.platformLogos}>
                                {content.platform.slice(0, 3).map((platform, index) => (
                                    <Image
                                        key={platform}
                                        source={{ uri: getPlatformLogo(platform) }}
                                        style={styles.platformLogo}
                                        accessibilityLabel={`Available on ${platform}`}
                                    />
                                ))}
                                {content.platform.length > 3 && (
                                    <Text style={styles.platformMore}>
                                        +{content.platform.length - 3}
                                    </Text>
                                )}
                            </View>
                        </LinearGradient>
                    </View>
                    
                    {/* Progress Indicator */}
                    {showProgress && content.progress !== undefined && (
                        <View style={styles.progressContainer}>
                            <ProgressBar 
                                progress={content.progress} 
                                variant="linear"
                                size="sm"
                            />
                        </View>
                    )}
                </View>
                
                {/* Content Information */}
                <View style={styles.contentInfo}>
                    <Text style={styles.contentTitle} numberOfLines={2}>
                        {content.title}
                    </Text>
                    
                    <View style={styles.contentMeta}>
                        <Text style={styles.contentYear}>{content.year}</Text>
                        <Text style={styles.contentType}>{content.type.toUpperCase()}</Text>
                        {content.userRating && (
                            <View style={styles.ratingContainer}>
                                <StarIcon size={12} filled />
                                <Text style={styles.ratingText}>{content.userRating}</Text>
                            </View>
                        )}
                    </View>
                    
                    {showCaseContext && content.caseName && (
                        <Text style={styles.caseContext} numberOfLines={1}>
                            {content.caseName} Case
                        </Text>
                    )}
                    
                    {content.description && layout === 'detailed' && (
                        <Text style={styles.contentDescription} numberOfLines={3}>
                            {content.description}
                        </Text>
                    )}
                </View>
                
                {/* Quick Actions */}
                {showQuickActions && (
                    <View style={styles.quickActions}>
                        <IconButton
                            icon={content.watchStatus === 'not_started' ? AddIcon : CheckIcon}
                            size="sm"
                            variant="ghost"
                            onPress={() => onQuickAction?.('track')}
                            accessibilityLabel={
                                content.watchStatus === 'not_started' 
                                    ? 'Add to watchlist' 
                                    : 'Update watch status'
                            }
                        />
                        
                        <IconButton
                            icon={StarIcon}
                            size="sm"
                            variant="ghost"
                            onPress={() => onQuickAction?.('rate')}
                            accessibilityLabel="Rate this content"
                        />
                        
                        <IconButton
                            icon={ShareIcon}
                            size="sm"
                            variant="ghost"
                            onPress={() => onQuickAction?.('share')}
                            accessibilityLabel="Share with friends"
                        />
                        
                        <IconButton
                            icon={ExternalLinkIcon}
                            size="sm"
                            variant="ghost"
                            onPress={() => onQuickAction?.('platform')}
                            accessibilityLabel="View on streaming platform"
                        />
                    </View>
                )}
            </View>
        </BaseCard>
    );
};
```

### Case Profile Card Component

**Purpose**: Display case information with respectful presentation and comprehensive context

```typescript
interface CaseCardProps extends BaseCardProps {
    case: {
        id: string;
        name: string;
        location: string;
        timeframe: string;
        status: 'solved' | 'unsolved' | 'ongoing';
        
        // Participants (handled with sensitivity)
        victims?: number; // Count rather than names for privacy
        suspects?: number;
        
        // Content availability
        contentCount: number;
        availableTypes: ('documentary' | 'series' | 'podcast' | 'book')[];
        
        // User interaction
        isFollowing?: boolean;
        lastUpdated?: Date;
        
        // Visual assets
        imageUrl?: string; // Location or archival image, never victim photos
        summary?: string;
    };
    
    layout?: 'compact' | 'detailed' | 'hero';
    showFollowButton?: boolean;
    showContentPreview?: boolean;
    
    onPress?: () => void;
    onFollow?: (following: boolean) => void;
}
```

#### Visual Specifications

**Case Card Respectful Design**:
- **Image Treatment**: Location-based imagery or archival photos, never victim photographs
- **Color Coding**: Status indicators using appropriate semantic colors
  - Solved: Success green (#388E3C) with subtle background
  - Unsolved: Warning amber (#FF8F00) with respectful treatment
  - Ongoing: Info blue (#1976D2) with active investigation indication
- **Typography**: Respectful case name presentation without sensationalism
- **Content Context**: Focus on available content rather than graphic details

```typescript
const CaseCard: React.FC<CaseCardProps> = ({
    case: caseData,
    layout = 'compact',
    showFollowButton = true,
    showContentPreview = true,
    onPress,
    onFollow,
    ...props
}) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'solved': return '#388E3C';
            case 'unsolved': return '#FF8F00';
            case 'ongoing': return '#1976D2';
            default: return '#6A6A74';
        }
    };
    
    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'solved': return 'RESOLVED';
            case 'unsolved': return 'COLD CASE';
            case 'ongoing': return 'ACTIVE';
            default: return 'UNKNOWN';
        }
    };
    
    return (
        <BaseCard
            onPress={onPress}
            accessibilityLabel={`${caseData.name} case, ${caseData.location}, ${caseData.timeframe}, ${getStatusLabel(caseData.status).toLowerCase()}, ${caseData.contentCount} content items available`}
            accessibilityRole="button"
            {...props}
        >
            <View style={styles.caseCardContainer}>
                {/* Case Header */}
                <View style={styles.caseHeader}>
                    {caseData.imageUrl && (
                        <Image
                            source={{ uri: caseData.imageUrl }}
                            style={styles.caseImage}
                            accessibilityLabel={`${caseData.location} location image`}
                        />
                    )}
                    
                    <View style={styles.caseInfo}>
                        <View style={styles.caseTitleRow}>
                            <Text style={styles.caseName} numberOfLines={2}>
                                {caseData.name}
                            </Text>
                            
                            <View style={[
                                styles.statusBadge,
                                { backgroundColor: getStatusColor(caseData.status) }
                            ]}>
                                <Text style={styles.statusText}>
                                    {getStatusLabel(caseData.status)}
                                </Text>
                            </View>
                        </View>
                        
                        <View style={styles.caseMeta}>
                            <Text style={styles.caseLocation}>{caseData.location}</Text>
                            <Text style={styles.caseTimeframe}>{caseData.timeframe}</Text>
                        </View>
                        
                        {layout === 'detailed' && caseData.summary && (
                            <Text style={styles.caseSummary} numberOfLines={3}>
                                {caseData.summary}
                            </Text>
                        )}
                    </View>
                    
                    {showFollowButton && (
                        <Button
                            variant={caseData.isFollowing ? 'secondary' : 'primary'}
                            size="sm"
                            onPress={() => onFollow?.(!caseData.isFollowing)}
                            accessibilityLabel={
                                caseData.isFollowing 
                                    ? 'Unfollow this case' 
                                    : 'Follow this case for updates'
                            }
                        >
                            {caseData.isFollowing ? 'Following' : 'Follow'}
                        </Button>
                    )}
                </View>
                
                {/* Content Availability */}
                {showContentPreview && (
                    <View style={styles.contentAvailability}>
                        <View style={styles.contentStats}>
                            <Text style={styles.contentCount}>
                                {caseData.contentCount} content items available
                            </Text>
                            
                            <View style={styles.contentTypes}>
                                {caseData.availableTypes.map((type) => (
                                    <View 
                                        key={type}
                                        style={[styles.contentTypeBadge, styles[`${type}Badge`]]}
                                    >
                                        <Text style={styles.contentTypeBadgeText}>
                                            {type.toUpperCase()}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                        
                        {caseData.lastUpdated && (
                            <Text style={styles.lastUpdated}>
                                Updated {formatRelativeTime(caseData.lastUpdated)}
                            </Text>
                        )}
                    </View>
                )}
            </View>
        </BaseCard>
    );
};
```

### User Profile Card Component

**Purpose**: Display user information with privacy controls and community context

```typescript
interface UserProfileCardProps extends BaseCardProps {
    user: {
        id: string;
        displayName: string;
        avatar?: string;
        joinDate: Date;
        
        // Stats (privacy-controlled)
        contentTracked?: number;
        casesFollowed?: number;
        friendsCount?: number;
        
        // Community participation
        contributionScore?: number;
        badges?: UserBadge[];
        
        // Privacy settings
        profileVisibility: 'public' | 'friends' | 'private';
        allowFriendRequests: boolean;
    };
    
    currentUserRelation?: 'self' | 'friend' | 'stranger' | 'blocked';
    showActions?: boolean;
    compact?: boolean;
    
    onPress?: () => void;
    onFriendRequest?: () => void;
    onMessage?: () => void;
}
```

### Activity Card Component

**Purpose**: Display social activity and updates with privacy respect

```typescript
interface ActivityCardProps extends BaseCardProps {
    activity: {
        id: string;
        type: 'content_shared' | 'case_followed' | 'review_posted' | 'milestone_reached';
        timestamp: Date;
        user: {
            displayName: string;
            avatar?: string;
        };
        
        // Content context
        content?: {
            title: string;
            type: string;
            poster?: string;
        };
        
        // Privacy context
        visibility: 'public' | 'friends' | 'private';
        allowInteraction: boolean;
    };
    
    showUserInfo?: boolean;
    allowInteraction?: boolean;
    
    onUserPress?: () => void;
    onContentPress?: () => void;
    onReact?: (reaction: string) => void;
}
```

## Specialized Card Components

### Warning Card Component

**Purpose**: Display content warnings and user safety information

```typescript
interface WarningCardProps extends BaseCardProps {
    level: 'info' | 'warning' | 'error';
    title: string;
    message: string;
    actions?: Array<{
        label: string;
        onPress: () => void;
        variant?: 'primary' | 'secondary';
    }>;
    dismissible?: boolean;
    onDismiss?: () => void;
}

const WarningCard: React.FC<WarningCardProps> = ({
    level,
    title,
    message,
    actions,
    dismissible = false,
    onDismiss,
    ...props
}) => {
    const getWarningStyle = (level: string) => {
        switch (level) {
            case 'info': return { color: '#1976D2', backgroundColor: 'rgba(25, 118, 210, 0.1)' };
            case 'warning': return { color: '#FF8F00', backgroundColor: 'rgba(255, 143, 0, 0.1)' };
            case 'error': return { color: '#D32F2F', backgroundColor: 'rgba(211, 47, 47, 0.1)' };
            default: return { color: '#6A6A74', backgroundColor: 'transparent' };
        }
    };
    
    const warningStyle = getWarningStyle(level);
    
    return (
        <BaseCard
            variant="outlined"
            style={[{ borderColor: warningStyle.color, backgroundColor: warningStyle.backgroundColor }]}
            {...props}
        >
            <View style={styles.warningCardContent}>
                <View style={styles.warningHeader}>
                    <Icon 
                        name={level === 'error' ? 'alert-circle' : level === 'warning' ? 'alert-triangle' : 'info'} 
                        size={20} 
                        color={warningStyle.color} 
                    />
                    <Text style={[styles.warningTitle, { color: warningStyle.color }]}>
                        {title}
                    </Text>
                    
                    {dismissible && (
                        <IconButton
                            icon={XIcon}
                            size="sm"
                            variant="ghost"
                            onPress={onDismiss}
                            accessibilityLabel="Dismiss warning"
                        />
                    )}
                </View>
                
                <Text style={styles.warningMessage}>{message}</Text>
                
                {actions && actions.length > 0 && (
                    <View style={styles.warningActions}>
                        {actions.map((action, index) => (
                            <Button
                                key={index}
                                variant={action.variant || 'secondary'}
                                size="sm"
                                onPress={action.onPress}
                                style={styles.warningActionButton}
                            >
                                {action.label}
                            </Button>
                        ))}
                    </View>
                )}
            </View>
        </BaseCard>
    );
};
```

## Platform-Specific Adaptations

### iOS Card Implementation

```typescript
const IOSCard: React.FC<BaseCardProps> = ({ children, onPress, ...props }) => {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.card,
                // iOS-specific shadow and pressed state
                {
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: pressed ? 0.4 : 0.2,
                    shadowRadius: pressed ? 8 : 4,
                },
                pressed && { transform: [{ scale: 0.98 }] }
            ]}
            {...props}
        >
            {children}
        </Pressable>
    );
};
```

### Android Card Implementation

```typescript
const AndroidCard: React.FC<BaseCardProps> = ({ children, onPress, ...props }) => {
    return (
        <Pressable
            onPress={onPress}
            style={[
                styles.card,
                // Material Design elevation
                { elevation: 2 }
            ]}
            android_ripple={{ color: 'rgba(139, 75, 127, 0.1)' }}
            {...props}
        >
            {children}
        </Pressable>
    );
};
```

### Web Card Implementation

```typescript
const WebCard: React.FC<BaseCardProps> = ({ children, onPress, ...props }) => {
    const [isHovered, setIsHovered] = useState(false);
    
    return (
        <Pressable
            onPress={onPress}
            onHoverIn={() => setIsHovered(true)}
            onHoverOut={() => setIsHovered(false)}
            style={[
                styles.card,
                isHovered && styles.cardHovered,
                // CSS box-shadow for web
                {
                    boxShadow: isHovered 
                        ? '0px 8px 24px rgba(0, 0, 0, 0.3)' 
                        : '0px 2px 8px rgba(0, 0, 0, 0.2)'
                }
            ]}
            {...props}
        >
            {children}
        </Pressable>
    );
};
```

## Accessibility Implementation

### Screen Reader Support

```typescript
const AccessibleCard: React.FC<BaseCardProps> = ({
    children,
    accessibilityLabel,
    accessibilityHint,
    accessibilityRole = 'button',
    ...props
}) => {
    return (
        <View
            accessibilityRole={accessibilityRole}
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={accessibilityHint}
            accessible={!!accessibilityLabel}
            {...props}
        >
            {children}
        </View>
    );
};
```

### High Contrast Support

```typescript
const useCardAccessibilityStyles = () => {
    const { isHighContrastEnabled } = useAccessibilityInfo();
    const colorScheme = useColorScheme();
    
    if (!isHighContrastEnabled) return {};
    
    return {
        card: {
            borderWidth: 2,
            borderColor: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
            backgroundColor: colorScheme === 'dark' ? '#000000' : '#FFFFFF'
        },
        text: {
            color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
            fontWeight: '600'
        }
    };
};
```

## Animation and Interactions

### Card Hover Animation

```typescript
const useCardAnimation = () => {
    const translateY = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(1)).current;
    
    const animateHover = (isHovering: boolean) => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: isHovering ? -2 : 0,
                duration: 200,
                useNativeDriver: true
            }),
            Animated.timing(scale, {
                toValue: isHovering ? 1.02 : 1,
                duration: 200,
                useNativeDriver: true
            })
        ]).start();
    };
    
    return {
        animatedStyle: {
            transform: [
                { translateY },
                { scale }
            ]
        },
        animateHover
    };
};
```

## Testing and Quality Assurance

### Card Component Testing

```typescript
describe('ContentCard Component', () => {
    const mockContent = {
        id: '1',
        title: 'Conversations with a Killer: The Ted Bundy Tapes',
        year: 2019,
        type: 'series' as const,
        platform: ['Netflix'],
        contentWarning: 'severe' as const,
        userRating: 4.5,
        watchStatus: 'watching' as const,
        progress: 50
    };
    
    it('renders content information correctly', () => {
        const { getByText } = render(
            <ContentCard content={mockContent} onPress={jest.fn()} />
        );
        
        expect(getByText('Conversations with a Killer: The Ted Bundy Tapes')).toBeTruthy();
        expect(getByText('2019')).toBeTruthy();
        expect(getByText('SERIES')).toBeTruthy();
    });
    
    it('displays content warnings appropriately', () => {
        const { getByLabelText } = render(
            <ContentCard content={mockContent} onPress={jest.fn()} />
        );
        
        expect(getByLabelText(/severe content warning/)).toBeTruthy();
    });
    
    it('handles accessibility correctly', () => {
        const { getByRole } = render(
            <ContentCard content={mockContent} onPress={jest.fn()} />
        );
        
        const card = getByRole('button');
        expect(card.props.accessibilityLabel).toContain('Conversations with a Killer');
        expect(card.props.accessibilityLabel).toContain('severe content warning');
    });
});
```

### Manual Testing Checklist

**Visual Appearance**:
- [ ] Cards display correctly across all themes and platforms
- [ ] Content warnings are clearly visible and appropriately colored
- [ ] Platform indicators show correctly with proper logos
- [ ] Progress indicators display accurately for series content
- [ ] Typography hierarchy is clear and readable

**Interaction Testing**:
- [ ] Card press events work correctly across platforms
- [ ] Quick action buttons respond appropriately
- [ ] Hover states work on web platform
- [ ] Loading states display correctly during content updates

**Accessibility Validation**:
- [ ] Screen reader announces card content comprehensively
- [ ] Focus indicators are visible and consistent
- [ ] Card navigation works with keyboard
- [ ] High contrast mode supported
- [ ] Content warnings announced appropriately

**Content Sensitivity**:
- [ ] Case information presented respectfully
- [ ] Victim privacy maintained in all displays
- [ ] Content warnings clearly visible and accessible
- [ ] Factual vs. dramatized content clearly distinguished

This comprehensive card system provides the foundation for displaying all content and information in the True Crime app while maintaining sensitivity, accessibility, and visual consistency.