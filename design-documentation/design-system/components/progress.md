# Progress Component System - True Crime App

---
title: Progress Component Specifications
description: Comprehensive progress indicator library for content tracking, episode progress, and user achievements with accessibility support
last-updated: 2025-08-20
version: 1.0
related-files:
  - ../style-guide.md
  - ../tokens/colors.md
  - ../tokens/typography.md
  - cards.md
  - buttons.md
dependencies:
  - React Native Animated API
  - NativeWind styling system
  - Platform-specific accessibility APIs
status: approved
---

# Progress Component System

## Overview

The progress component system provides visual feedback for content consumption, tracking progress, and user achievements in the True Crime app. All progress indicators maintain clear visual hierarchy while respecting the sensitive nature of the content and providing excellent accessibility support.

## Design Philosophy

### Progress Design Principles

**Clear Progress Communication**: Progress indicators provide immediate understanding of completion status without overwhelming the user with unnecessary complexity.

**Respectful Content Tracking**: Progress visualization acknowledges the serious nature of True Crime content while maintaining functionality for user organization.

**Accessibility-First Visualization**: All progress indicators work excellently with screen readers and provide clear semantic information about completion status.

**Context-Aware Display**: Progress components adapt their presentation based on content type, sensitivity, and user tracking preferences.

## Component Specifications

### Base Progress Component

**Purpose**: Foundation component for all progress visualization with consistent styling and accessibility

```typescript
interface BaseProgressProps {
    // Progress data
    progress: number; // 0-100
    total?: number;
    current?: number;
    
    // Appearance
    variant?: 'linear' | 'circular' | 'stepped';
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    color?: 'primary' | 'success' | 'warning' | 'error';
    
    // Display options
    showPercentage?: boolean;
    showFraction?: boolean;
    showLabel?: boolean;
    label?: string;
    
    // Behavior
    animated?: boolean;
    indeterminate?: boolean;
    
    // Accessibility
    accessibilityLabel?: string;
    accessibilityHint?: string;
    
    // Styling
    style?: ViewStyle;
    testID?: string;
}
```

#### Visual Specifications

**Linear Progress Bar**:
- **Height**: XS (2px), SM (4px), MD (6px), LG (8px), XL (12px)
- **Border Radius**: Full radius (height/2) for smooth appearance
- **Background Track**: Dark-300 (#4A4A52) on dark theme, Light gray on light theme
- **Fill Color**: Primary (#8B4B7F) default, semantic colors for status
- **Animation**: Smooth fill animation over 400ms ease-out

```css
.progress-linear {
    width: 100%;
    background-color: #4A4A52;
    border-radius: 3px;
    overflow: hidden;
    position: relative;
}

.progress-linear-fill {
    height: 100%;
    background: linear-gradient(90deg, #8B4B7F 0%, #A66B9E 100%);
    border-radius: inherit;
    transition: width 400ms cubic-bezier(0.0, 0, 0.2, 1);
}

.progress-linear-sm { height: 4px; }
.progress-linear-md { height: 6px; }
.progress-linear-lg { height: 8px; }
.progress-linear-xl { height: 12px; }
```

**Circular Progress**:
- **Size**: SM (24px), MD (32px), LG (48px), XL (64px), XXL (96px)
- **Stroke Width**: 2px (SM), 3px (MD), 4px (LG), 6px (XL), 8px (XXL)
- **Background Ring**: Dark-300 (#4A4A52) with consistent opacity
- **Progress Ring**: Primary color with smooth animation
- **Center Content**: Progress percentage or fraction display

```typescript
const CircularProgress: React.FC<BaseProgressProps & { strokeWidth?: number }> = ({
    progress,
    size = 'md',
    color = 'primary',
    showPercentage = false,
    showFraction = false,
    animated = true,
    strokeWidth,
    ...props
}) => {
    const sizeConfig = {
        xs: { diameter: 16, stroke: 2 },
        sm: { diameter: 24, stroke: 2 },
        md: { diameter: 32, stroke: 3 },
        lg: { diameter: 48, stroke: 4 },
        xl: { diameter: 64, stroke: 6 },
        xxl: { diameter: 96, stroke: 8 }
    };
    
    const config = sizeConfig[size] || sizeConfig.md;
    const radius = (config.diameter - config.stroke) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (progress / 100) * circumference;
    
    const animatedProgress = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
        if (animated) {
            Animated.timing(animatedProgress, {
                toValue: progress,
                duration: 800,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false
            }).start();
        }
    }, [progress, animated]);
    
    return (
        <View 
            style={[
                styles.circularProgressContainer,
                { width: config.diameter, height: config.diameter }
            ]}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: progress }}
            accessibilityLabel={`${Math.round(progress)}% complete`}
        >
            <Svg width={config.diameter} height={config.diameter}>
                {/* Background circle */}
                <Circle
                    cx={config.diameter / 2}
                    cy={config.diameter / 2}
                    r={radius}
                    stroke="#4A4A52"
                    strokeWidth={config.stroke}
                    fill="none"
                />
                
                {/* Progress circle */}
                <Circle
                    cx={config.diameter / 2}
                    cy={config.diameter / 2}
                    r={radius}
                    stroke="#8B4B7F"
                    strokeWidth={config.stroke}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${config.diameter / 2} ${config.diameter / 2})`}
                />
            </Svg>
            
            {/* Center content */}
            {(showPercentage || showFraction) && (
                <View style={styles.circularProgressCenter}>
                    {showPercentage && (
                        <Text style={[styles.progressText, styles[`progressText${size}`]]}>
                            {Math.round(progress)}%
                        </Text>
                    )}
                    {showFraction && props.current !== undefined && props.total !== undefined && (
                        <Text style={[styles.progressFraction, styles[`progressFraction${size}`]]}>
                            {props.current}/{props.total}
                        </Text>
                    )}
                </View>
            )}
        </View>
    );
};
```

### Episode Progress Component

**Purpose**: Track viewing progress through TV series and documentary series with episode-level detail

```typescript
interface EpisodeProgressProps extends BaseProgressProps {
    episodes: Array<{
        id: string;
        title: string;
        season?: number;
        episode: number;
        duration?: number; // minutes
        watched: boolean;
        partialProgress?: number; // 0-100 for partially watched episodes
        current?: boolean; // currently watching indicator
    }>;
    
    layout?: 'grid' | 'linear' | 'compact';
    maxVisible?: number;
    showTitles?: boolean;
    showProgress?: boolean;
    
    onEpisodePress?: (episodeId: string) => void;
}
```

#### Visual Specifications

**Episode Grid Layout**:
- **Grid Structure**: 2 columns (mobile), 3 (tablet), 4+ (desktop)
- **Episode Indicators**: 32px circles (compact), 48px circles (default)
- **Episode States**: Watched (filled), Current (outlined + progress), Unwatched (empty)
- **Typography**: Episode number inside circle, title below if showTitles enabled
- **Spacing**: 8px between indicators, 16px between rows

```typescript
const EpisodeProgress: React.FC<EpisodeProgressProps> = ({
    episodes,
    layout = 'grid',
    maxVisible = 20,
    showTitles = false,
    showProgress = true,
    onEpisodePress,
    ...props
}) => {
    const visibleEpisodes = episodes.slice(0, maxVisible);
    const remainingCount = episodes.length - maxVisible;
    
    const getEpisodeColor = (episode: typeof episodes[0]) => {
        if (episode.watched) return '#388E3C'; // Success green
        if (episode.current) return '#8B4B7F'; // Primary purple
        return '#4A4A52'; // Neutral gray
    };
    
    const renderEpisodeIndicator = (episode: typeof episodes[0], index: number) => (
        <Pressable
            key={episode.id}
            style={styles.episodeIndicator}
            onPress={() => onEpisodePress?.(episode.id)}
            accessibilityRole="button"
            accessibilityLabel={`Episode ${episode.episode}${episode.title ? `: ${episode.title}` : ''}, ${
                episode.watched ? 'watched' : 
                episode.current ? `currently watching, ${episode.partialProgress || 0}% complete` : 
                'not watched'
            }`}
        >
            <View
                style={[
                    styles.episodeCircle,
                    { 
                        backgroundColor: episode.watched ? getEpisodeColor(episode) : 'transparent',
                        borderColor: getEpisodeColor(episode),
                        borderWidth: episode.watched ? 0 : 2
                    }
                ]}
            >
                {/* Episode number */}
                <Text 
                    style={[
                        styles.episodeNumber,
                        { color: episode.watched ? '#FFFFFF' : getEpisodeColor(episode) }
                    ]}
                >
                    {episode.episode}
                </Text>
                
                {/* Current episode progress indicator */}
                {episode.current && episode.partialProgress !== undefined && (
                    <View style={styles.currentEpisodeProgress}>
                        <CircularProgress
                            progress={episode.partialProgress}
                            size="sm"
                            color="primary"
                            strokeWidth={2}
                        />
                    </View>
                )}
                
                {/* Watched checkmark */}
                {episode.watched && (
                    <View style={styles.watchedCheckmark}>
                        <Icon name="check" size={12} color="#FFFFFF" />
                    </View>
                )}
            </View>
            
            {showTitles && (
                <Text style={styles.episodeTitle} numberOfLines={2}>
                    {episode.title}
                </Text>
            )}
        </Pressable>
    );
    
    if (layout === 'linear') {
        return (
            <View style={styles.episodeProgressLinear}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.episodeRow}>
                        {visibleEpisodes.map(renderEpisodeIndicator)}
                        {remainingCount > 0 && (
                            <View style={styles.remainingIndicator}>
                                <Text style={styles.remainingText}>+{remainingCount}</Text>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </View>
        );
    }
    
    return (
        <View style={styles.episodeProgressGrid}>
            <View style={styles.episodeGrid}>
                {visibleEpisodes.map(renderEpisodeIndicator)}
                {remainingCount > 0 && (
                    <View style={styles.remainingIndicator}>
                        <Text style={styles.remainingText}>+{remainingCount}</Text>
                    </View>
                )}
            </View>
        </View>
    );
};
```

### Content Rating Progress Component

**Purpose**: Display rating progress and community consensus with respectful True Crime context

```typescript
interface RatingProgressProps {
    ratings: {
        distribution: Record<number, number>; // star rating -> count
        average: number;
        totalCount: number;
    };
    userRating?: number;
    showDistribution?: boolean;
    allowRating?: boolean;
    
    onRatingChange?: (rating: number) => void;
}
```

#### Visual Specifications

**Rating Distribution Display**:
- **Star Rows**: 5 rows showing distribution for each star rating (5 to 1)
- **Progress Bars**: Linear progress showing percentage of votes for each rating
- **Color Coding**: Primary color for user's rating, neutral for others
- **Typography**: Star rating number + percentage, vote count

```typescript
const RatingProgress: React.FC<RatingProgressProps> = ({
    ratings,
    userRating,
    showDistribution = true,
    allowRating = true,
    onRatingChange
}) => {
    const maxCount = Math.max(...Object.values(ratings.distribution));
    
    const renderRatingRow = (stars: number) => {
        const count = ratings.distribution[stars] || 0;
        const percentage = ratings.totalCount > 0 ? (count / ratings.totalCount) * 100 : 0;
        const isUserRating = userRating === stars;
        
        return (
            <View key={stars} style={styles.ratingRow}>
                <View style={styles.ratingStars}>
                    <Text style={styles.ratingNumber}>{stars}</Text>
                    <Icon name="star" size={12} color="#FF8F00" />
                </View>
                
                <View style={styles.ratingProgressContainer}>
                    <View style={styles.ratingProgressTrack}>
                        <View
                            style={[
                                styles.ratingProgressFill,
                                {
                                    width: `${percentage}%`,
                                    backgroundColor: isUserRating ? '#8B4B7F' : '#4A4A52'
                                }
                            ]}
                        />
                    </View>
                </View>
                
                <Text style={styles.ratingCount}>
                    {count} ({percentage.toFixed(0)}%)
                </Text>
            </View>
        );
    };
    
    return (
        <View style={styles.ratingProgress}>
            {/* Overall rating display */}
            <View style={styles.overallRating}>
                <Text style={styles.averageRating}>
                    {ratings.average.toFixed(1)}
                </Text>
                <View style={styles.ratingStarsDisplay}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Icon
                            key={star}
                            name="star"
                            size={16}
                            color={star <= ratings.average ? '#FF8F00' : '#4A4A52'}
                        />
                    ))}
                </View>
                <Text style={styles.totalRatings}>
                    {ratings.totalCount} ratings
                </Text>
            </View>
            
            {/* Rating distribution */}
            {showDistribution && (
                <View style={styles.ratingDistribution}>
                    {[5, 4, 3, 2, 1].map(renderRatingRow)}
                </View>
            )}
            
            {/* User rating interface */}
            {allowRating && (
                <View style={styles.userRatingSection}>
                    <Text style={styles.userRatingLabel}>Your Rating:</Text>
                    <RatingInput
                        rating={userRating || 0}
                        onRatingChange={onRatingChange}
                        size="md"
                        showValue={false}
                    />
                </View>
            )}
        </View>
    );
};
```

### Case Progress Component

**Purpose**: Track user progress through case-related content with respectful presentation

```typescript
interface CaseProgressProps {
    caseName: string;
    contentItems: Array<{
        id: string;
        title: string;
        type: 'documentary' | 'series' | 'podcast' | 'book';
        status: 'not_started' | 'in_progress' | 'completed';
        progress?: number; // 0-100
        releaseDate: Date;
        importance?: 'essential' | 'recommended' | 'supplementary';
    }>;
    
    showImportance?: boolean;
    groupByType?: boolean;
    showTimeline?: boolean;
    
    onContentPress?: (contentId: string) => void;
}
```

#### Visual Specifications

**Case Content Timeline**:
- **Timeline Structure**: Vertical timeline with content items positioned by release date
- **Content Nodes**: Different shapes for different content types (circle for documentaries, square for series, etc.)
- **Progress Integration**: Node fill shows completion status, partial fill for in-progress
- **Importance Indicators**: Visual emphasis for essential content (larger nodes, bolder labels)

```typescript
const CaseProgress: React.FC<CaseProgressProps> = ({
    caseName,
    contentItems,
    showImportance = true,
    groupByType = false,
    showTimeline = true,
    onContentPress
}) => {
    const sortedContent = useMemo(() => {
        return [...contentItems].sort((a, b) => 
            a.releaseDate.getTime() - b.releaseDate.getTime()
        );
    }, [contentItems]);
    
    const getStatusColor = (status: string, progress?: number) => {
        switch (status) {
            case 'completed': return '#388E3C';
            case 'in_progress': return '#8B4B7F';
            case 'not_started': return '#4A4A52';
            default: return '#4A4A52';
        }
    };
    
    const getImportanceSize = (importance?: string) => {
        switch (importance) {
            case 'essential': return 16;
            case 'recommended': return 12;
            case 'supplementary': return 8;
            default: return 12;
        }
    };
    
    const renderContentItem = (item: typeof contentItems[0], index: number) => {
        const nodeSize = getImportanceSize(item.importance);
        const statusColor = getStatusColor(item.status, item.progress);
        
        return (
            <Pressable
                key={item.id}
                style={styles.caseContentItem}
                onPress={() => onContentPress?.(item.id)}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}, ${item.type}, ${
                    item.status === 'completed' ? 'completed' :
                    item.status === 'in_progress' ? `${item.progress || 0}% complete` :
                    'not started'
                }${item.importance === 'essential' ? ', essential content' : ''}`}
            >
                <View style={styles.contentNodeContainer}>
                    {/* Timeline connector */}
                    {index < sortedContent.length - 1 && (
                        <View style={styles.timelineConnector} />
                    )}
                    
                    {/* Content node */}
                    <View
                        style={[
                            styles.contentNode,
                            {
                                width: nodeSize * 2,
                                height: nodeSize * 2,
                                borderRadius: item.type === 'series' ? 4 : nodeSize,
                                backgroundColor: item.status === 'completed' ? statusColor : 'transparent',
                                borderColor: statusColor,
                                borderWidth: item.status === 'completed' ? 0 : 2
                            }
                        ]}
                    >
                        {/* Progress indicator for in-progress content */}
                        {item.status === 'in_progress' && item.progress !== undefined && (
                            <CircularProgress
                                progress={item.progress}
                                size="xs"
                                color="primary"
                                strokeWidth={2}
                            />
                        )}
                        
                        {/* Content type icon */}
                        <Icon
                            name={getContentTypeIcon(item.type)}
                            size={nodeSize}
                            color={item.status === 'completed' ? '#FFFFFF' : statusColor}
                        />
                    </View>
                    
                    {/* Importance indicator */}
                    {showImportance && item.importance === 'essential' && (
                        <View style={styles.importanceIndicator}>
                            <Text style={styles.importanceText}>!</Text>
                        </View>
                    )}
                </View>
                
                <View style={styles.contentInfo}>
                    <Text 
                        style={[
                            styles.contentTitle,
                            item.importance === 'essential' && styles.essentialContent
                        ]}
                        numberOfLines={2}
                    >
                        {item.title}
                    </Text>
                    
                    <View style={styles.contentMeta}>
                        <Text style={styles.contentType}>
                            {item.type.toUpperCase()}
                        </Text>
                        <Text style={styles.releaseDate}>
                            {item.releaseDate.getFullYear()}
                        </Text>
                    </View>
                    
                    {item.status === 'in_progress' && item.progress !== undefined && (
                        <View style={styles.contentProgressBar}>
                            <LinearProgress
                                progress={item.progress}
                                size="xs"
                                color="primary"
                                showPercentage={false}
                            />
                            <Text style={styles.progressText}>
                                {item.progress}% complete
                            </Text>
                        </View>
                    )}
                </View>
            </Pressable>
        );
    };
    
    const completedCount = contentItems.filter(item => item.status === 'completed').length;
    const totalCount = contentItems.length;
    const overallProgress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
    
    return (
        <View style={styles.caseProgress}>
            {/* Case header with overall progress */}
            <View style={styles.caseHeader}>
                <Text style={styles.caseName}>{caseName} Case</Text>
                <View style={styles.overallProgress}>
                    <CircularProgress
                        progress={overallProgress}
                        size="md"
                        color="primary"
                        showPercentage={true}
                    />
                    <Text style={styles.progressLabel}>
                        {completedCount} of {totalCount} content items completed
                    </Text>
                </View>
            </View>
            
            {/* Content timeline */}
            <View style={styles.contentTimeline}>
                {sortedContent.map(renderContentItem)}
            </View>
        </View>
    );
};
```

## Specialized Progress Components

### Loading Progress Component

**Purpose**: Indeterminate progress for system operations with appropriate messaging

```typescript
interface LoadingProgressProps {
    message?: string;
    variant?: 'spinner' | 'dots' | 'pulse' | 'skeleton';
    size?: 'sm' | 'md' | 'lg';
    fullScreen?: boolean;
}

const LoadingProgress: React.FC<LoadingProgressProps> = ({
    message = 'Loading...',
    variant = 'spinner',
    size = 'md',
    fullScreen = false
}) => {
    const animationValue = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
        const animation = Animated.loop(
            Animated.timing(animationValue, {
                toValue: 1,
                duration: variant === 'pulse' ? 1500 : 1000,
                useNativeDriver: true
            })
        );
        
        animation.start();
        return () => animation.stop();
    }, [variant]);
    
    const renderLoadingIndicator = () => {
        switch (variant) {
            case 'spinner':
                return (
                    <Animated.View
                        style={{
                            transform: [{
                                rotate: animationValue.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0deg', '360deg']
                                })
                            }]
                        }}
                    >
                        <Icon name="loader" size={size === 'sm' ? 16 : size === 'lg' ? 32 : 24} />
                    </Animated.View>
                );
                
            case 'dots':
                return (
                    <View style={styles.dotsContainer}>
                        {[0, 1, 2].map((index) => (
                            <Animated.View
                                key={index}
                                style={[
                                    styles.dot,
                                    {
                                        opacity: animationValue.interpolate({
                                            inputRange: [0, 0.33 * (index + 1), 1],
                                            outputRange: [0.3, 1, 0.3],
                                            extrapolate: 'clamp'
                                        })
                                    }
                                ]}
                            />
                        ))}
                    </View>
                );
                
            case 'pulse':
                return (
                    <Animated.View
                        style={[
                            styles.pulseContainer,
                            {
                                opacity: animationValue.interpolate({
                                    inputRange: [0, 0.5, 1],
                                    outputRange: [0.3, 1, 0.3]
                                }),
                                transform: [{
                                    scale: animationValue.interpolate({
                                        inputRange: [0, 0.5, 1],
                                        outputRange: [0.8, 1, 0.8]
                                    })
                                }]
                            }
                        ]}
                    >
                        <View style={styles.pulseRing} />
                    </Animated.View>
                );
                
            default:
                return null;
        }
    };
    
    const content = (
        <View style={styles.loadingContainer}>
            {renderLoadingIndicator()}
            {message && (
                <Text style={styles.loadingMessage}>{message}</Text>
            )}
        </View>
    );
    
    if (fullScreen) {
        return (
            <View style={styles.fullScreenLoading}>
                {content}
            </View>
        );
    }
    
    return content;
};
```

## Platform-Specific Adaptations

### iOS Implementation

```typescript
const IOSProgressBar: React.FC<BaseProgressProps> = ({ progress, ...props }) => {
    return (
        <View style={styles.progressContainer}>
            <ProgressViewIOS
                progress={progress / 100}
                progressTintColor="#8B4B7F"
                trackTintColor="#4A4A52"
                style={styles.iosProgressBar}
                {...props}
            />
        </View>
    );
};
```

### Android Implementation

```typescript
const AndroidProgressBar: React.FC<BaseProgressProps> = ({ progress, indeterminate, ...props }) => {
    return (
        <ProgressBarAndroid
            style={styles.androidProgressBar}
            styleAttr={indeterminate ? "Horizontal" : "Horizontal"}
            progress={progress / 100}
            indeterminate={indeterminate}
            color="#8B4B7F"
            {...props}
        />
    );
};
```

### Web Implementation

```typescript
const WebProgressBar: React.FC<BaseProgressProps> = ({ progress, accessibilityLabel, ...props }) => {
    return (
        <progress
            value={progress}
            max={100}
            style={styles.webProgressBar}
            aria-label={accessibilityLabel}
            {...props}
        />
    );
};
```

## Accessibility Implementation

### Screen Reader Support

```typescript
const AccessibleProgress: React.FC<BaseProgressProps> = ({
    progress,
    accessibilityLabel,
    current,
    total,
    ...props
}) => {
    const getProgressDescription = () => {
        if (current !== undefined && total !== undefined) {
            return `${current} of ${total} complete, ${Math.round(progress)}%`;
        }
        return `${Math.round(progress)}% complete`;
    };
    
    return (
        <View
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: progress }}
            accessibilityLabel={accessibilityLabel || getProgressDescription()}
            accessible={true}
            {...props}
        />
    );
};
```

### High Contrast Support

```typescript
const useProgressAccessibilityStyles = () => {
    const { isHighContrastEnabled } = useAccessibilityInfo();
    
    if (!isHighContrastEnabled) return {};
    
    return {
        progressBar: {
            borderWidth: 1,
            borderColor: '#FFFFFF'
        },
        progressFill: {
            backgroundColor: '#FFFFFF'
        },
        progressText: {
            color: '#FFFFFF',
            fontWeight: 'bold'
        }
    };
};
```

## Animation and Performance

### Smooth Progress Animation

```typescript
const useProgressAnimation = (targetProgress: number) => {
    const animatedValue = useRef(new Animated.Value(0)).current;
    const [currentProgress, setCurrentProgress] = useState(0);
    
    useEffect(() => {
        Animated.timing(animatedValue, {
            toValue: targetProgress,
            duration: 600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false
        }).start();
        
        const listener = animatedValue.addListener(({ value }) => {
            setCurrentProgress(value);
        });
        
        return () => animatedValue.removeListener(listener);
    }, [targetProgress]);
    
    return {
        animatedValue,
        currentProgress: Math.round(currentProgress)
    };
};
```

### Performance Optimization

```typescript
const OptimizedProgressBar = React.memo<BaseProgressProps>(
    ({ progress, ...props }) => {
        const memoizedStyle = useMemo(() => ({
            width: `${Math.min(100, Math.max(0, progress))}%`
        }), [Math.round(progress)]); // Only re-render when progress changes by 1%
        
        return (
            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, memoizedStyle]} />
            </View>
        );
    },
    (prevProps, nextProps) => {
        return Math.round(prevProps.progress) === Math.round(nextProps.progress);
    }
);
```

## Testing and Quality Assurance

### Progress Component Testing

```typescript
describe('CircularProgress Component', () => {
    it('displays correct progress percentage', () => {
        const { getByLabelText } = render(
            <CircularProgress progress={75} showPercentage={true} />
        );
        
        expect(getByLabelText('75% complete')).toBeTruthy();
    });
    
    it('handles accessibility correctly', () => {
        const { getByRole } = render(
            <CircularProgress
                progress={50}
                accessibilityLabel="Content viewing progress"
            />
        );
        
        const progressBar = getByRole('progressbar');
        expect(progressBar.props.accessibilityValue).toEqual({
            min: 0,
            max: 100,
            now: 50
        });
    });
    
    it('animates progress changes smoothly', async () => {
        const { rerender } = render(<CircularProgress progress={0} animated={true} />);
        
        rerender(<CircularProgress progress={100} animated={true} />);
        
        // Test that animation completes within expected timeframe
        await waitFor(() => {
            // Animation verification logic
        }, { timeout: 1000 });
    });
});
```

### Manual Testing Checklist

**Visual Appearance**:
- [ ] Progress indicators display correctly across all themes
- [ ] Animation smooth and performant on all devices
- [ ] Colors appropriate for content sensitivity
- [ ] Typography legible at all sizes
- [ ] Progress updates accurately reflect actual values

**Accessibility Validation**:
- [ ] Screen reader announces progress changes
- [ ] Progress values communicated clearly
- [ ] Keyboard navigation works for interactive progress elements
- [ ] High contrast mode supported
- [ ] Focus indicators visible on interactive elements

**Content Sensitivity**:
- [ ] Progress tracking respects content sensitivity
- [ ] Case progress presented with appropriate dignity
- [ ] Achievement progress motivating without being insensitive
- [ ] Episode tracking clear without spoiling content

This comprehensive progress system provides clear visual feedback for all user progress tracking while maintaining the respectful, accessible design standards required for True Crime content.