# Rating Component System - True Crime App

---
title: Rating Component Specifications
description: Comprehensive rating system for content evaluation, user reviews, and community consensus with True Crime-appropriate considerations
last-updated: 2025-08-20
version: 1.0
related-files:
  - ../style-guide.md
  - ../tokens/colors.md
  - ../tokens/typography.md
  - forms.md
  - progress.md
dependencies:
  - React Native gesture handling
  - NativeWind styling system
  - Accessibility APIs
status: approved
---

# Rating Component System

## Overview

The rating component system provides thoughtful content evaluation tools for the True Crime tracking app, designed to facilitate meaningful user feedback while respecting the sensitive nature of the content. All rating components maintain appropriate tone and accessibility while enabling community-driven content curation.

## Design Philosophy

### Rating Design Principles

**Thoughtful Evaluation**: Rating systems encourage constructive feedback that helps other users make informed content decisions rather than sensationalized reactions.

**Respectful Community Input**: Rating interfaces acknowledge that True Crime content deals with real tragedies and should be evaluated with appropriate gravity.

**Accessible Interaction**: All rating components work excellently with assistive technologies and provide clear feedback for all interaction methods.

**Context-Aware Presentation**: Rating displays adapt based on content type, sensitivity level, and community guidelines.

## Component Specifications

### Base Star Rating Component

**Purpose**: Foundation rating input and display component with full accessibility support

```typescript
interface StarRatingProps {
    // Rating data
    rating: number; // 0-5, supports decimals
    maxRating?: number; // Default 5
    
    // Interaction
    onRatingChange?: (rating: number) => void;
    allowHalfStars?: boolean;
    disabled?: boolean;
    readOnly?: boolean;
    
    // Appearance
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    color?: 'default' | 'primary' | 'warning' | 'error';
    showValue?: boolean;
    showCount?: boolean;
    count?: number;
    
    // Accessibility
    accessibilityLabel?: string;
    accessibilityHint?: string;
    
    // Styling
    style?: ViewStyle;
    testID?: string;
}
```

#### Visual Specifications

**Star Sizing**:
- **XS**: 12px - Compact displays, metadata
- **SM**: 16px - Card ratings, secondary displays
- **MD**: 20px - Default interface rating
- **LG**: 24px - Primary rating displays
- **XL**: 32px - Hero sections, emphasis

**Star Colors**:
- **Filled**: Warning Orange (#FF8F00) for universal recognition
- **Empty**: Dark-400 (#6A6A74) for subtle unfilled state
- **Half-filled**: Gradient from filled to empty for partial ratings
- **Interactive**: Primary (#8B4B7F) on hover/focus for interactive states

```typescript
const StarRating: React.FC<StarRatingProps> = ({
    rating,
    maxRating = 5,
    onRatingChange,
    allowHalfStars = false,
    disabled = false,
    readOnly = false,
    size = 'md',
    color = 'default',
    showValue = false,
    showCount = false,
    count,
    accessibilityLabel,
    accessibilityHint,
    style,
    testID,
    ...props
}) => {
    const [hoverRating, setHoverRating] = useState<number | null>(null);
    const [pressPosition, setPressPosition] = useState<{ x: number; y: number } | null>(null);
    
    const starSize = {
        xs: 12,
        sm: 16,
        md: 20,
        lg: 24,
        xl: 32
    }[size];
    
    const isInteractive = !disabled && !readOnly && onRatingChange;
    const displayRating = hoverRating ?? rating;
    
    const handleStarPress = (starIndex: number, event: any) => {
        if (!isInteractive) return;
        
        let newRating = starIndex + 1;
        
        if (allowHalfStars && event?.nativeEvent?.locationX) {
            const starWidth = starSize + 4; // Including margin
            const position = event.nativeEvent.locationX;
            const relativePosition = position % starWidth;
            
            if (relativePosition < starWidth / 2) {
                newRating = starIndex + 0.5;
            }
        }
        
        onRatingChange?.(newRating);
        
        // Haptic feedback for mobile
        if (Platform.OS !== 'web') {
            HapticFeedback.impactAsync(HapticFeedback.ImpactFeedbackStyle.Light);
        }
    };
    
    const handleStarHover = (starIndex: number, isHovering: boolean) => {
        if (!isInteractive || Platform.OS !== 'web') return;
        setHoverRating(isHovering ? starIndex + 1 : null);
    };
    
    const getStarFillPercentage = (starIndex: number) => {
        const starValue = starIndex + 1;
        if (displayRating >= starValue) return 100;
        if (displayRating <= starIndex) return 0;
        return (displayRating - starIndex) * 100;
    };
    
    const getAccessibilityLabel = () => {
        if (accessibilityLabel) return accessibilityLabel;
        const ratingText = `${rating} out of ${maxRating} stars`;
        const countText = count ? ` from ${count} ratings` : '';
        return `Rating: ${ratingText}${countText}`;
    };
    
    const getAccessibilityHint = () => {
        if (accessibilityHint) return accessibilityHint;
        if (isInteractive) return allowHalfStars ? 
            'Double tap to rate, or swipe to select half-star ratings' : 
            'Double tap to rate this content';
        return undefined;
    };
    
    return (
        <View 
            style={[styles.starRatingContainer, style]}
            accessible={!isInteractive} // Only accessible as a group if not interactive
            accessibilityRole={isInteractive ? undefined : "text"}
            accessibilityLabel={isInteractive ? undefined : getAccessibilityLabel()}
            testID={testID}
        >
            <View 
                style={styles.starsContainer}
                accessibilityRole={isInteractive ? "adjustable" : undefined}
                accessibilityLabel={isInteractive ? getAccessibilityLabel() : undefined}
                accessibilityHint={isInteractive ? getAccessibilityHint() : undefined}
                accessibilityValue={isInteractive ? { min: 0, max: maxRating, now: rating } : undefined}
            >
                {Array.from({ length: maxRating }, (_, index) => {
                    const fillPercentage = getStarFillPercentage(index);
                    const isHovered = hoverRating !== null && index < hoverRating;
                    
                    return (
                        <Pressable
                            key={index}
                            onPress={(event) => handleStarPress(index, event)}
                            onHoverIn={() => handleStarHover(index, true)}
                            onHoverOut={() => handleStarHover(index, false)}
                            disabled={!isInteractive}
                            style={[
                                styles.starTouchArea,
                                { width: starSize + 4, height: starSize + 4 },
                                !isInteractive && { cursor: 'default' }
                            ]}
                            accessibilityRole={isInteractive ? "button" : undefined}
                            accessibilityLabel={isInteractive ? `Rate ${index + 1} stars` : undefined}
                        >
                            <View style={styles.starContainer}>
                                <Svg width={starSize} height={starSize} viewBox="0 0 24 24">
                                    <defs>
                                        <linearGradient id={`starGradient${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop 
                                                offset={`${fillPercentage}%`} 
                                                stopColor={isHovered ? "#8B4B7F" : "#FF8F00"} 
                                            />
                                            <stop 
                                                offset={`${fillPercentage}%`} 
                                                stopColor="#6A6A74" 
                                            />
                                        </linearGradient>
                                    </defs>
                                    
                                    <path
                                        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                                        fill={`url(#starGradient${index})`}
                                        stroke={isHovered ? "#8B4B7F" : "#FF8F00"}
                                        strokeWidth={fillPercentage === 0 ? 1.5 : 0}
                                    />
                                </Svg>
                            </View>
                        </Pressable>
                    );
                })}
            </View>
            
            {/* Rating value display */}
            {showValue && (
                <Text style={[styles.ratingValue, styles[`ratingValue${size}`]]}>
                    {allowHalfStars ? rating.toFixed(1) : Math.round(rating).toString()}
                </Text>
            )}
            
            {/* Rating count display */}
            {showCount && count !== undefined && (
                <Text style={[styles.ratingCount, styles[`ratingCount${size}`]]}>
                    ({count.toLocaleString()})
                </Text>
            )}
        </View>
    );
};
```

### Content Review Component

**Purpose**: Comprehensive content review with rating, text review, and content warnings

```typescript
interface ContentReviewProps {
    contentId: string;
    contentTitle: string;
    contentType: 'documentary' | 'series' | 'dramatization' | 'podcast' | 'book';
    
    // Review data
    initialReview?: {
        rating: number;
        reviewText?: string;
        contentWarnings: string[];
        wouldRecommend: boolean;
        factualAccuracy?: number; // 1-5 for documentaries
    };
    
    // Configuration
    allowTextReview?: boolean;
    requireContentWarnings?: boolean;
    showFactualAccuracy?: boolean;
    maxReviewLength?: number;
    
    // Callbacks
    onReviewSubmit: (review: ContentReview) => void;
    onReviewUpdate: (review: ContentReview) => void;
    onReviewDelete: () => void;
}

interface ContentReview {
    rating: number;
    reviewText?: string;
    contentWarnings: string[];
    wouldRecommend: boolean;
    factualAccuracy?: number;
    helpfulCount?: number;
    reportedCount?: number;
}
```

#### Visual Specifications

**Review Form Layout**:
- **Rating Section**: Star rating with clear labeling and help text
- **Text Review**: Optional multi-line input with character counter
- **Content Warnings**: Checkbox selection for appropriate warnings
- **Recommendation**: Binary recommendation toggle with explanation
- **Factual Accuracy**: Additional rating for documentary content

```typescript
const ContentReview: React.FC<ContentReviewProps> = ({
    contentId,
    contentTitle,
    contentType,
    initialReview,
    allowTextReview = true,
    requireContentWarnings = true,
    showFactualAccuracy = false,
    maxReviewLength = 500,
    onReviewSubmit,
    onReviewUpdate,
    onReviewDelete
}) => {
    const [review, setReview] = useState<ContentReview>({
        rating: initialReview?.rating || 0,
        reviewText: initialReview?.reviewText || '',
        contentWarnings: initialReview?.contentWarnings || [],
        wouldRecommend: initialReview?.wouldRecommend || false,
        factualAccuracy: initialReview?.factualAccuracy
    });
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showWarnings, setShowWarnings] = useState(false);
    
    const isEditing = !!initialReview;
    const canSubmit = review.rating > 0 && 
        (!requireContentWarnings || review.contentWarnings.length > 0);
    
    const contentWarningOptions = [
        { id: 'violence', label: 'Graphic Violence', description: 'Detailed descriptions or depictions of violence' },
        { id: 'death', label: 'Death/Dying', description: 'Explicit discussion of death or dying processes' },
        { id: 'mental_health', label: 'Mental Health', description: 'Mental illness, psychological trauma, or suicide' },
        { id: 'substance_abuse', label: 'Substance Use', description: 'Drug or alcohol abuse and addiction' },
        { id: 'sexual_content', label: 'Sexual Violence', description: 'Sexual assault, abuse, or explicit content' },
        { id: 'family_trauma', label: 'Family Issues', description: 'Child abuse, domestic violence, or family dysfunction' },
        { id: 'ongoing_case', label: 'Active Investigation', description: 'Ongoing legal proceedings or developing story' }
    ];
    
    const handleSubmit = async () => {
        if (!canSubmit) return;
        
        setIsSubmitting(true);
        try {
            if (isEditing) {
                await onReviewUpdate(review);
            } else {
                await onReviewSubmit(review);
            }
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <View style={styles.contentReview}>
            {/* Review Header */}
            <View style={styles.reviewHeader}>
                <Text style={styles.reviewTitle}>
                    {isEditing ? 'Edit Your Review' : 'Write a Review'}
                </Text>
                <Text style={styles.contentTitle}>
                    {contentTitle}
                </Text>
            </View>
            
            {/* Overall Rating */}
            <View style={styles.ratingSection}>
                <Text style={styles.sectionLabel}>
                    Overall Rating <Text style={styles.required}>*</Text>
                </Text>
                <StarRating
                    rating={review.rating}
                    onRatingChange={(rating) => setReview(prev => ({ ...prev, rating }))}
                    size="lg"
                    allowHalfStars={true}
                    accessibilityLabel="Rate this content from 1 to 5 stars"
                />
                <Text style={styles.ratingHelp}>
                    Consider the content quality, accuracy, and overall value
                </Text>
            </View>
            
            {/* Factual Accuracy (for documentaries) */}
            {showFactualAccuracy && contentType === 'documentary' && (
                <View style={styles.accuracySection}>
                    <Text style={styles.sectionLabel}>
                        Factual Accuracy
                    </Text>
                    <StarRating
                        rating={review.factualAccuracy || 0}
                        onRatingChange={(accuracy) => setReview(prev => ({ ...prev, factualAccuracy: accuracy }))}
                        size="md"
                        allowHalfStars={true}
                        accessibilityLabel="Rate factual accuracy from 1 to 5 stars"
                    />
                    <Text style={styles.accuracyHelp}>
                        How factually accurate is this documentary?
                    </Text>
                </View>
            )}
            
            {/* Text Review */}
            {allowTextReview && (
                <View style={styles.textReviewSection}>
                    <Text style={styles.sectionLabel}>
                        Your Review (Optional)
                    </Text>
                    <TextInput
                        value={review.reviewText}
                        onChangeText={(text) => setReview(prev => ({ ...prev, reviewText: text }))}
                        placeholder="Share your thoughts about this content..."
                        multiline
                        maxLength={maxReviewLength}
                        style={styles.reviewTextInput}
                        accessibilityLabel="Write your detailed review"
                        accessibilityHint="Optional text review with your thoughts about the content"
                    />
                    <View style={styles.textReviewFooter}>
                        <Text style={styles.characterCount}>
                            {review.reviewText?.length || 0}/{maxReviewLength}
                        </Text>
                        <Text style={styles.reviewGuidelines}>
                            Please keep reviews respectful and constructive
                        </Text>
                    </View>
                </View>
            )}
            
            {/* Content Warnings */}
            <View style={styles.warningsSection}>
                <View style={styles.warningSectionHeader}>
                    <Text style={styles.sectionLabel}>
                        Content Warnings {requireContentWarnings && <Text style={styles.required}>*</Text>}
                    </Text>
                    <Button
                        variant="tertiary"
                        size="sm"
                        onPress={() => setShowWarnings(!showWarnings)}
                    >
                        {showWarnings ? 'Hide' : 'Show'} Options
                    </Button>
                </View>
                
                <Text style={styles.warningsHelp}>
                    Help others prepare for sensitive content
                </Text>
                
                {showWarnings && (
                    <View style={styles.warningOptions}>
                        {contentWarningOptions.map((warning) => (
                            <Pressable
                                key={warning.id}
                                style={styles.warningOption}
                                onPress={() => {
                                    const warnings = review.contentWarnings.includes(warning.id)
                                        ? review.contentWarnings.filter(id => id !== warning.id)
                                        : [...review.contentWarnings, warning.id];
                                    setReview(prev => ({ ...prev, contentWarnings: warnings }));
                                }}
                                accessibilityRole="checkbox"
                                accessibilityState={{ checked: review.contentWarnings.includes(warning.id) }}
                                accessibilityLabel={`${warning.label}: ${warning.description}`}
                            >
                                <View style={[
                                    styles.checkbox,
                                    review.contentWarnings.includes(warning.id) && styles.checkboxSelected
                                ]}>
                                    {review.contentWarnings.includes(warning.id) && (
                                        <Icon name="check" size={12} color="#FFFFFF" />
                                    )}
                                </View>
                                
                                <View style={styles.warningText}>
                                    <Text style={styles.warningLabel}>
                                        {warning.label}
                                    </Text>
                                    <Text style={styles.warningDescription}>
                                        {warning.description}
                                    </Text>
                                </View>
                            </Pressable>
                        ))}
                    </View>
                )}
                
                {review.contentWarnings.length > 0 && (
                    <View style={styles.selectedWarnings}>
                        <Text style={styles.selectedWarningsLabel}>
                            Selected warnings:
                        </Text>
                        <View style={styles.warningTags}>
                            {review.contentWarnings.map((warningId) => {
                                const warning = contentWarningOptions.find(w => w.id === warningId);
                                return warning ? (
                                    <View key={warningId} style={styles.warningTag}>
                                        <Text style={styles.warningTagText}>
                                            {warning.label}
                                        </Text>
                                    </View>
                                ) : null;
                            })}
                        </View>
                    </View>
                )}
            </View>
            
            {/* Recommendation */}
            <View style={styles.recommendationSection}>
                <Text style={styles.sectionLabel}>
                    Would you recommend this to others?
                </Text>
                <View style={styles.recommendationOptions}>
                    <Pressable
                        style={[
                            styles.recommendationOption,
                            review.wouldRecommend && styles.recommendationSelected
                        ]}
                        onPress={() => setReview(prev => ({ ...prev, wouldRecommend: true }))}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: review.wouldRecommend }}
                    >
                        <Icon 
                            name="thumbs-up" 
                            size={16} 
                            color={review.wouldRecommend ? "#FFFFFF" : "#388E3C"} 
                        />
                        <Text style={[
                            styles.recommendationText,
                            review.wouldRecommend && styles.recommendationTextSelected
                        ]}>
                            Yes, recommend
                        </Text>
                    </Pressable>
                    
                    <Pressable
                        style={[
                            styles.recommendationOption,
                            !review.wouldRecommend && styles.recommendationSelected
                        ]}
                        onPress={() => setReview(prev => ({ ...prev, wouldRecommend: false }))}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: !review.wouldRecommend }}
                    >
                        <Icon 
                            name="thumbs-down" 
                            size={16} 
                            color={!review.wouldRecommend ? "#FFFFFF" : "#D32F2F"} 
                        />
                        <Text style={[
                            styles.recommendationText,
                            !review.wouldRecommend && styles.recommendationTextSelected
                        ]}>
                            No, don't recommend
                        </Text>
                    </Pressable>
                </View>
            </View>
            
            {/* Review Actions */}
            <View style={styles.reviewActions}>
                {isEditing && (
                    <Button
                        variant="danger"
                        size="sm"
                        onPress={onReviewDelete}
                        accessibilityLabel="Delete this review"
                    >
                        Delete Review
                    </Button>
                )}
                
                <View style={styles.primaryActions}>
                    <Button
                        variant="secondary"
                        size="md"
                        onPress={() => {/* Handle cancel/reset */}}
                    >
                        Cancel
                    </Button>
                    
                    <Button
                        variant="primary"
                        size="md"
                        loading={isSubmitting}
                        disabled={!canSubmit || isSubmitting}
                        onPress={handleSubmit}
                    >
                        {isEditing ? 'Update Review' : 'Submit Review'}
                    </Button>
                </View>
            </View>
        </View>
    );
};
```

### Rating Summary Component

**Purpose**: Display aggregated rating information with community consensus

```typescript
interface RatingSummaryProps {
    ratings: {
        average: number;
        totalCount: number;
        distribution: Record<number, number>; // star rating -> count
        factualAccuracy?: number; // For documentaries
        recommendationPercentage: number;
    };
    
    contentType: 'documentary' | 'series' | 'dramatization' | 'podcast' | 'book';
    showDistribution?: boolean;
    showFactualAccuracy?: boolean;
    compact?: boolean;
    
    onViewAllReviews?: () => void;
}

const RatingSummary: React.FC<RatingSummaryProps> = ({
    ratings,
    contentType,
    showDistribution = true,
    showFactualAccuracy = false,
    compact = false,
    onViewAllReviews
}) => {
    const maxRatingCount = Math.max(...Object.values(ratings.distribution));
    
    const renderRatingDistribution = () => {
        if (!showDistribution || compact) return null;
        
        return (
            <View style={styles.ratingDistribution}>
                <Text style={styles.distributionTitle}>Rating Breakdown</Text>
                
                {[5, 4, 3, 2, 1].map((stars) => {
                    const count = ratings.distribution[stars] || 0;
                    const percentage = ratings.totalCount > 0 ? (count / ratings.totalCount) * 100 : 0;
                    
                    return (
                        <View key={stars} style={styles.distributionRow}>
                            <View style={styles.distributionStars}>
                                <Text style={styles.distributionNumber}>{stars}</Text>
                                <Icon name="star" size={12} color="#FF8F00" />
                            </View>
                            
                            <View style={styles.distributionBar}>
                                <View style={styles.distributionTrack}>
                                    <View
                                        style={[
                                            styles.distributionFill,
                                            { width: `${percentage}%` }
                                        ]}
                                    />
                                </View>
                            </View>
                            
                            <Text style={styles.distributionCount}>
                                {count} ({percentage.toFixed(0)}%)
                            </Text>
                        </View>
                    );
                })}
            </View>
        );
    };
    
    return (
        <View style={[styles.ratingSummary, compact && styles.ratingSummaryCompact]}>
            {/* Overall Rating */}
            <View style={styles.overallRating}>
                <View style={styles.ratingScore}>
                    <Text style={styles.averageRating}>
                        {ratings.average.toFixed(1)}
                    </Text>
                    <StarRating
                        rating={ratings.average}
                        size={compact ? "sm" : "md"}
                        readOnly={true}
                        showValue={false}
                    />
                </View>
                
                <View style={styles.ratingMeta}>
                    <Text style={styles.totalRatings}>
                        {ratings.totalCount.toLocaleString()} ratings
                    </Text>
                    
                    {ratings.recommendationPercentage >= 0 && (
                        <Text style={styles.recommendationStat}>
                            {Math.round(ratings.recommendationPercentage)}% recommend
                        </Text>
                    )}
                </View>
            </View>
            
            {/* Factual Accuracy (for documentaries) */}
            {showFactualAccuracy && contentType === 'documentary' && ratings.factualAccuracy && (
                <View style={styles.factualAccuracy}>
                    <Text style={styles.accuracyLabel}>Factual Accuracy</Text>
                    <View style={styles.accuracyRating}>
                        <Text style={styles.accuracyScore}>
                            {ratings.factualAccuracy.toFixed(1)}
                        </Text>
                        <StarRating
                            rating={ratings.factualAccuracy}
                            size="sm"
                            readOnly={true}
                            color="warning"
                        />
                    </View>
                </View>
            )}
            
            {/* Rating Distribution */}
            {renderRatingDistribution()}
            
            {/* View All Reviews Link */}
            {onViewAllReviews && (
                <Button
                    variant="tertiary"
                    size="sm"
                    onPress={onViewAllReviews}
                    style={styles.viewAllButton}
                >
                    View All Reviews
                </Button>
            )}
        </View>
    );
};
```

### Quick Rating Component

**Purpose**: Simplified rating interface for fast content evaluation

```typescript
interface QuickRatingProps {
    contentId: string;
    currentRating?: number;
    allowQuickRating?: boolean;
    showAverageRating?: boolean;
    averageRating?: number;
    ratingCount?: number;
    
    onQuickRate: (rating: number) => void;
    onFullReview?: () => void;
}

const QuickRating: React.FC<QuickRatingProps> = ({
    contentId,
    currentRating = 0,
    allowQuickRating = true,
    showAverageRating = true,
    averageRating,
    ratingCount,
    onQuickRate,
    onFullReview
}) => {
    const [tempRating, setTempRating] = useState<number | null>(null);
    
    const displayRating = tempRating ?? currentRating;
    
    return (
        <View style={styles.quickRating}>
            {/* User Rating */}
            {allowQuickRating && (
                <View style={styles.userRating}>
                    <Text style={styles.quickRatingLabel}>Your Rating:</Text>
                    <StarRating
                        rating={displayRating}
                        onRatingChange={onQuickRate}
                        size="sm"
                        allowHalfStars={false}
                        accessibilityLabel="Quick rate this content"
                    />
                </View>
            )}
            
            {/* Average Rating */}
            {showAverageRating && averageRating !== undefined && (
                <View style={styles.averageRating}>
                    <StarRating
                        rating={averageRating}
                        size="sm"
                        readOnly={true}
                        showValue={true}
                        showCount={true}
                        count={ratingCount}
                    />
                </View>
            )}
            
            {/* Full Review Link */}
            {onFullReview && (
                <Button
                    variant="tertiary"
                    size="sm"
                    onPress={onFullReview}
                >
                    Write Review
                </Button>
            )}
        </View>
    );
};
```

## Platform-Specific Adaptations

### iOS Implementation

```typescript
const IOSStarRating: React.FC<StarRatingProps> = ({ onRatingChange, ...props }) => {
    const handleRatingChange = (rating: number) => {
        // iOS haptic feedback for rating changes
        HapticFeedback.impactAsync(HapticFeedback.ImpactFeedbackStyle.Light);
        onRatingChange?.(rating);
    };

    return (
        <StarRating
            {...props}
            onRatingChange={handleRatingChange}
        />
    );
};
```

### Android Implementation

```typescript
const AndroidStarRating: React.FC<StarRatingProps> = ({ style, ...props }) => {
    return (
        <StarRating
            {...props}
            style={[
                style,
                // Android Material Design elevation for interactive elements
                props.onRatingChange && { elevation: 1 }
            ]}
        />
    );
};
```

### Web Implementation

```typescript
const WebStarRating: React.FC<StarRatingProps> = ({ onRatingChange, ...props }) => {
    const [focusedStar, setFocusedStar] = useState<number | null>(null);

    const handleKeyDown = (event: KeyboardEvent, starIndex: number) => {
        switch (event.key) {
            case 'Enter':
            case ' ':
                event.preventDefault();
                onRatingChange?.(starIndex + 1);
                break;
            case 'ArrowRight':
            case 'ArrowUp':
                event.preventDefault();
                setFocusedStar(Math.min(4, starIndex + 1));
                break;
            case 'ArrowLeft':
            case 'ArrowDown':
                event.preventDefault();
                setFocusedStar(Math.max(0, starIndex - 1));
                break;
        }
    };

    return (
        <StarRating
            {...props}
            onRatingChange={onRatingChange}
            // Additional web-specific keyboard handling would be implemented here
        />
    );
};
```

## Accessibility Implementation

### Screen Reader Support

```typescript
const AccessibleRating: React.FC<StarRatingProps> = ({
    rating,
    maxRating = 5,
    count,
    accessibilityLabel,
    ...props
}) => {
    const getDetailedAccessibilityLabel = () => {
        const ratingText = `${rating} out of ${maxRating} stars`;
        const countText = count ? ` from ${count} ratings` : '';
        const description = accessibilityLabel || 'Content rating';
        return `${description}: ${ratingText}${countText}`;
    };

    return (
        <View
            accessible={true}
            accessibilityRole="text"
            accessibilityLabel={getDetailedAccessibilityLabel()}
            {...props}
        />
    );
};
```

### High Contrast Support

```typescript
const useRatingAccessibilityStyles = () => {
    const { isHighContrastEnabled } = useAccessibilityInfo();
    const colorScheme = useColorScheme();
    
    if (!isHighContrastEnabled) return {};
    
    return {
        filledStar: {
            color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
            stroke: colorScheme === 'dark' ? '#000000' : '#FFFFFF',
            strokeWidth: 1
        },
        emptyStar: {
            color: 'transparent',
            stroke: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
            strokeWidth: 2
        }
    };
};
```

## Testing and Quality Assurance

### Rating Component Testing

```typescript
describe('StarRating Component', () => {
    it('displays correct number of filled stars', () => {
        const { getAllByTestId } = render(
            <StarRating rating={3.5} testID="star-rating" />
        );
        
        const stars = getAllByTestId(/star-/);
        expect(stars).toHaveLength(5);
        // Verify 3 full stars, 1 half star, 1 empty star
    });
    
    it('handles user interaction correctly', () => {
        const onRatingChange = jest.fn();
        const { getByLabelText } = render(
            <StarRating
                rating={0}
                onRatingChange={onRatingChange}
                accessibilityLabel="Rate this content"
            />
        );
        
        const fourthStar = getByLabelText('Rate 4 stars');
        fireEvent.press(fourthStar);
        expect(onRatingChange).toHaveBeenCalledWith(4);
    });
    
    it('provides proper accessibility information', () => {
        const { getByLabelText } = render(
            <StarRating
                rating={4.2}
                count={156}
                accessibilityLabel="Community rating"
            />
        );
        
        expect(getByLabelText(/Community rating: 4\.2 out of 5 stars from 156 ratings/)).toBeTruthy();
    });
});
```

### Manual Testing Checklist

**Visual Appearance**:
- [ ] Stars display correctly at all sizes
- [ ] Half-star ratings render properly
- [ ] Colors appropriate for content sensitivity
- [ ] Hover and focus states clearly visible
- [ ] Rating counts and values legible

**Interaction Testing**:
- [ ] Star selection works across all input methods
- [ ] Half-star ratings function when enabled
- [ ] Keyboard navigation smooth and logical
- [ ] Touch targets appropriate size (minimum 44px)
- [ ] Haptic feedback works on mobile platforms

**Accessibility Validation**:
- [ ] Screen reader announces ratings clearly
- [ ] Keyboard navigation reaches all interactive elements
- [ ] Focus indicators visible and consistent
- [ ] High contrast mode supported
- [ ] Rating changes announced appropriately

**Content Sensitivity**:
- [ ] Review guidelines promote respectful discussion
- [ ] Content warnings comprehensive and clear
- [ ] Rating context appropriate for True Crime content
- [ ] Community moderation features effective

This comprehensive rating system enables thoughtful community evaluation while maintaining the respectful tone required for True Crime content and ensuring excellent accessibility for all users.