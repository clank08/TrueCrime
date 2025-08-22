# Search Component System - True Crime App

---
title: Search Component Specifications
description: Comprehensive search interface library including input patterns, auto-complete, suggestions, filters, and results layouts with True Crime-specific considerations
last-updated: 2025-08-20
version: 1.0
related-files:
  - ../style-guide.md
  - ../tokens/colors.md
  - ../tokens/typography.md
  - forms.md
  - cards.md
dependencies:
  - React Native gesture handling
  - NativeWind styling system
  - Meilisearch integration
  - Accessibility APIs
status: approved
---

# Search Component System

## Overview

The search component system provides intelligent content discovery interfaces for the True Crime tracking app, designed to help users find relevant content across platforms while maintaining sensitivity to the serious nature of the subject matter. All search components prioritize user intent understanding and respectful result presentation.

## Design Philosophy

### Search Design Principles

**Intent-Driven Discovery**: Search interfaces understand user goals whether seeking specific cases, content types, or general exploration, providing contextually relevant results.

**Respectful Result Presentation**: Search results maintain dignity when presenting information about real cases and victims, avoiding sensationalized previews or inappropriate imagery.

**Intelligent Suggestion Systems**: Auto-complete and suggestions help users discover content without requiring knowledge of exact titles or case names.

**Accessibility-First Navigation**: All search interactions work excellently with screen readers and keyboard navigation, ensuring universal content discovery.

## Component Specifications

### Base Search Input Component

**Purpose**: Foundation search input with intelligent suggestions and filtering capabilities

```typescript
interface SearchInputProps {
    // Search data
    value: string;
    onChangeText: (text: string) => void;
    onSubmit: (query: string) => void;
    
    // Suggestions
    suggestions?: SearchSuggestion[];
    onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
    showSuggestions?: boolean;
    recentSearches?: string[];
    
    // Appearance
    placeholder?: string;
    variant?: 'default' | 'hero' | 'compact' | 'modal';
    showFilters?: boolean;
    
    // Behavior
    autoFocus?: boolean;
    clearable?: boolean;
    loading?: boolean;
    debounceMs?: number;
    
    // Accessibility
    accessibilityLabel?: string;
    accessibilityHint?: string;
    
    // Styling
    style?: ViewStyle;
    testID?: string;
}

interface SearchSuggestion {
    id: string;
    text: string;
    type: 'content' | 'case' | 'person' | 'location' | 'query';
    subtitle?: string;
    imageUrl?: string;
    metadata?: {
        year?: number;
        platform?: string[];
        contentType?: string;
        caseStatus?: 'solved' | 'unsolved' | 'ongoing';
    };
    relevanceScore?: number;
}
```

#### Visual Specifications

**Search Input Styling**:
- **Height**: 48px for comfortable interaction across devices
- **Padding**: 16px horizontal for search icon and text, 12px vertical
- **Border Radius**: 24px for modern search aesthetic (pill shape)
- **Background**: Dark-200 (#3A3A40) on dark theme with subtle transparency
- **Border**: 1px solid Dark-300 (#4A4A52) with focus state enhancement
- **Typography**: Body (16px/24px, 400) for input text

**Search Icon Integration**:
- **Position**: 12px from left edge, vertically centered
- **Size**: 16px for appropriate visual weight
- **Color**: Dark-500 (#8A8A94) in default state, Primary (#8B4B7F) when focused
- **Animation**: Subtle scale on focus for feedback

```typescript
const SearchInput: React.FC<SearchInputProps> = ({
    value,
    onChangeText,
    onSubmit,
    suggestions = [],
    onSuggestionSelect,
    showSuggestions = true,
    recentSearches = [],
    placeholder = "Search content, cases, or people...",
    variant = 'default',
    showFilters = false,
    autoFocus = false,
    clearable = true,
    loading = false,
    debounceMs = 300,
    accessibilityLabel,
    accessibilityHint,
    style,
    testID,
    ...props
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showSuggestionPanel, setShowSuggestionPanel] = useState(false);
    const [debouncedValue, setDebouncedValue] = useState(value);
    const inputRef = useRef<TextInput>(null);
    
    // Debounce search input for performance
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, debounceMs);
        
        return () => clearTimeout(timer);
    }, [value, debounceMs]);
    
    // Filter suggestions based on current input
    const filteredSuggestions = useMemo(() => {
        if (!debouncedValue.trim()) {
            return recentSearches.slice(0, 5).map(query => ({
                id: `recent-${query}`,
                text: query,
                type: 'query' as const,
                subtitle: 'Recent search'
            }));
        }
        
        return suggestions
            .filter(suggestion => 
                suggestion.text.toLowerCase().includes(debouncedValue.toLowerCase())
            )
            .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
            .slice(0, 8);
    }, [debouncedValue, suggestions, recentSearches]);
    
    const handleFocus = () => {
        setIsFocused(true);
        setShowSuggestionPanel(true);
    };
    
    const handleBlur = () => {
        setIsFocused(false);
        // Delay hiding suggestions to allow for selection
        setTimeout(() => setShowSuggestionPanel(false), 150);
    };
    
    const handleSubmit = () => {
        onSubmit(value);
        setShowSuggestionPanel(false);
        inputRef.current?.blur();
    };
    
    const handleSuggestionPress = (suggestion: SearchSuggestion) => {
        onSuggestionSelect?.(suggestion);
        setShowSuggestionPanel(false);
        inputRef.current?.blur();
    };
    
    const handleClear = () => {
        onChangeText('');
        inputRef.current?.focus();
    };
    
    return (
        <View style={[styles.searchContainer, styles[`search${variant}`], style]}>
            {/* Search Input */}
            <View style={[
                styles.searchInputContainer,
                isFocused && styles.searchInputFocused,
                loading && styles.searchInputLoading
            ]}>
                <Icon
                    name="search"
                    size={16}
                    color={isFocused ? "#8B4B7F" : "#8A8A94"}
                    style={styles.searchIcon}
                />
                
                <TextInput
                    ref={inputRef}
                    value={value}
                    onChangeText={onChangeText}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onSubmitEditing={handleSubmit}
                    placeholder={placeholder}
                    placeholderTextColor="#6A6A74"
                    autoFocus={autoFocus}
                    returnKeyType="search"
                    style={styles.searchInput}
                    accessibilityRole="searchbox"
                    accessibilityLabel={accessibilityLabel || "Search for True Crime content"}
                    accessibilityHint={accessibilityHint || "Enter keywords to search for content, cases, or people"}
                    testID={testID}
                    {...props}
                />
                
                {/* Loading Spinner */}
                {loading && (
                    <ActivityIndicator
                        size="small"
                        color="#8B4B7F"
                        style={styles.searchLoading}
                    />
                )}
                
                {/* Clear Button */}
                {clearable && value.length > 0 && !loading && (
                    <Pressable
                        onPress={handleClear}
                        style={styles.clearButton}
                        accessibilityRole="button"
                        accessibilityLabel="Clear search"
                        hitSlop={8}
                    >
                        <Icon name="x" size={16} color="#6A6A74" />
                    </Pressable>
                )}
                
                {/* Filter Toggle */}
                {showFilters && (
                    <Pressable
                        style={styles.filterButton}
                        accessibilityRole="button"
                        accessibilityLabel="Show search filters"
                    >
                        <Icon name="filter" size={16} color="#8A8A94" />
                    </Pressable>
                )}
            </View>
            
            {/* Suggestions Panel */}
            {showSuggestions && showSuggestionPanel && filteredSuggestions.length > 0 && (
                <View style={styles.suggestionsPanel}>
                    <ScrollView
                        style={styles.suggestionsList}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {filteredSuggestions.map((suggestion) => (
                            <SearchSuggestionItem
                                key={suggestion.id}
                                suggestion={suggestion}
                                onPress={handleSuggestionPress}
                                searchQuery={debouncedValue}
                            />
                        ))}
                    </ScrollView>
                </View>
            )}
        </View>
    );
};
```

### Search Suggestion Item Component

**Purpose**: Individual suggestion display with appropriate True Crime context

```typescript
interface SearchSuggestionItemProps {
    suggestion: SearchSuggestion;
    searchQuery: string;
    onPress: (suggestion: SearchSuggestion) => void;
}

const SearchSuggestionItem: React.FC<SearchSuggestionItemProps> = ({
    suggestion,
    searchQuery,
    onPress
}) => {
    const getSuggestionIcon = (type: string) => {
        switch (type) {
            case 'content': return 'play-circle';
            case 'case': return 'file-text';
            case 'person': return 'user';
            case 'location': return 'map-pin';
            case 'query': return 'clock';
            default: return 'search';
        }
    };
    
    const getSuggestionColor = (type: string) => {
        switch (type) {
            case 'content': return '#8B4B7F';
            case 'case': return '#1976D2';
            case 'person': return '#388E3C';
            case 'location': return '#FF8F00';
            case 'query': return '#6A6A74';
            default: return '#8A8A94';
        }
    };
    
    const highlightMatch = (text: string, query: string) => {
        if (!query.trim()) return text;
        
        const regex = new RegExp(`(${query})`, 'gi');
        const parts = text.split(regex);
        
        return parts.map((part, index) => (
            regex.test(part) ? (
                <Text key={index} style={styles.highlightedText}>
                    {part}
                </Text>
            ) : (
                <Text key={index}>{part}</Text>
            )
        ));
    };
    
    const getAccessibilityLabel = () => {
        const typeText = suggestion.type === 'content' ? 'content' :
                        suggestion.type === 'case' ? 'case' :
                        suggestion.type === 'person' ? 'person' :
                        suggestion.type === 'location' ? 'location' :
                        'recent search';
        
        const metaText = suggestion.metadata ? 
            `${suggestion.metadata.year || ''} ${suggestion.metadata.contentType || ''}`.trim() : '';
        
        return `${suggestion.text} ${typeText}${metaText ? `, ${metaText}` : ''}${
            suggestion.subtitle ? `, ${suggestion.subtitle}` : ''
        }`;
    };
    
    return (
        <Pressable
            style={styles.suggestionItem}
            onPress={() => onPress(suggestion)}
            accessibilityRole="button"
            accessibilityLabel={getAccessibilityLabel()}
            accessibilityHint="Double tap to search for this item"
        >
            {/* Suggestion Icon/Image */}
            <View style={styles.suggestionIcon}>
                {suggestion.imageUrl ? (
                    <Image
                        source={{ uri: suggestion.imageUrl }}
                        style={styles.suggestionImage}
                        defaultSource={require('../assets/placeholder-small.png')}
                    />
                ) : (
                    <Icon
                        name={getSuggestionIcon(suggestion.type)}
                        size={16}
                        color={getSuggestionColor(suggestion.type)}
                    />
                )}
            </View>
            
            {/* Suggestion Content */}
            <View style={styles.suggestionContent}>
                <View style={styles.suggestionMain}>
                    <Text style={styles.suggestionText} numberOfLines={1}>
                        {highlightMatch(suggestion.text, searchQuery)}
                    </Text>
                    
                    {suggestion.type !== 'query' && (
                        <View style={[
                            styles.suggestionTypeBadge,
                            { backgroundColor: getSuggestionColor(suggestion.type) }
                        ]}>
                            <Text style={styles.suggestionTypeText}>
                                {suggestion.type.toUpperCase()}
                            </Text>
                        </View>
                    )}
                </View>
                
                {suggestion.subtitle && (
                    <Text style={styles.suggestionSubtitle} numberOfLines={1}>
                        {suggestion.subtitle}
                    </Text>
                )}
                
                {/* Metadata Display */}
                {suggestion.metadata && (
                    <View style={styles.suggestionMeta}>
                        {suggestion.metadata.year && (
                            <Text style={styles.suggestionMetaText}>
                                {suggestion.metadata.year}
                            </Text>
                        )}
                        
                        {suggestion.metadata.platform && suggestion.metadata.platform.length > 0 && (
                            <View style={styles.platformTags}>
                                {suggestion.metadata.platform.slice(0, 2).map((platform) => (
                                    <Text key={platform} style={styles.platformTag}>
                                        {platform}
                                    </Text>
                                ))}
                                {suggestion.metadata.platform.length > 2 && (
                                    <Text style={styles.platformTag}>
                                        +{suggestion.metadata.platform.length - 2}
                                    </Text>
                                )}
                            </View>
                        )}
                        
                        {suggestion.metadata.caseStatus && (
                            <View style={[
                                styles.statusBadge,
                                styles[`status${suggestion.metadata.caseStatus}`]
                            ]}>
                                <Text style={styles.statusText}>
                                    {suggestion.metadata.caseStatus.toUpperCase()}
                                </Text>
                            </View>
                        )}
                    </View>
                )}
            </View>
            
            {/* Suggestion Action */}
            <Icon
                name="arrow-up-right"
                size={12}
                color="#6A6A74"
                style={styles.suggestionAction}
            />
        </Pressable>
    );
};
```

### Search Filter Component

**Purpose**: Advanced filtering interface for refined content discovery

```typescript
interface SearchFilterProps {
    filters: SearchFilters;
    onFiltersChange: (filters: SearchFilters) => void;
    availableFilters?: FilterOptions;
    variant?: 'sheet' | 'sidebar' | 'inline';
    onClose?: () => void;
}

interface SearchFilters {
    contentTypes: string[];
    platforms: string[];
    years: {
        min?: number;
        max?: number;
    };
    caseStatus: string[];
    contentWarnings: string[];
    ratings: {
        min?: number;
        max?: number;
    };
    factualAccuracy: {
        min?: number;
        max?: number;
    };
    sortBy: 'relevance' | 'rating' | 'year' | 'title' | 'recent';
    sortOrder: 'asc' | 'desc';
}

interface FilterOptions {
    contentTypes: Array<{ id: string; label: string; icon: string }>;
    platforms: Array<{ id: string; label: string; logo: string }>;
    yearRange: { min: number; max: number };
    caseStatuses: Array<{ id: string; label: string; color: string }>;
    contentWarnings: Array<{ id: string; label: string; description: string }>;
}
```

#### Visual Specifications

**Filter Panel Layout**:
- **Section Grouping**: Logical filter categories with clear visual separation
- **Interactive Controls**: Checkboxes, sliders, and toggles with appropriate touch targets
- **Applied Filter Display**: Clear indication of active filters with easy removal
- **Results Preview**: Live count of results matching current filter criteria

```typescript
const SearchFilter: React.FC<SearchFilterProps> = ({
    filters,
    onFiltersChange,
    availableFilters,
    variant = 'sheet',
    onClose
}) => {
    const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);
    const [resultCount, setResultCount] = useState<number | null>(null);
    
    const updateFilter = <K extends keyof SearchFilters>(
        key: K,
        value: SearchFilters[K]
    ) => {
        const newFilters = { ...localFilters, [key]: value };
        setLocalFilters(newFilters);
        onFiltersChange(newFilters);
    };
    
    const toggleArrayFilter = <K extends keyof SearchFilters>(
        key: K,
        value: string,
        currentArray: string[]
    ) => {
        const newArray = currentArray.includes(value)
            ? currentArray.filter(item => item !== value)
            : [...currentArray, value];
        updateFilter(key, newArray as SearchFilters[K]);
    };
    
    const clearAllFilters = () => {
        const clearedFilters: SearchFilters = {
            contentTypes: [],
            platforms: [],
            years: {},
            caseStatus: [],
            contentWarnings: [],
            ratings: {},
            factualAccuracy: {},
            sortBy: 'relevance',
            sortOrder: 'desc'
        };
        setLocalFilters(clearedFilters);
        onFiltersChange(clearedFilters);
    };
    
    const hasActiveFilters = useMemo(() => {
        return localFilters.contentTypes.length > 0 ||
               localFilters.platforms.length > 0 ||
               localFilters.years.min !== undefined ||
               localFilters.years.max !== undefined ||
               localFilters.caseStatus.length > 0 ||
               localFilters.contentWarnings.length > 0 ||
               localFilters.ratings.min !== undefined ||
               localFilters.ratings.max !== undefined ||
               localFilters.factualAccuracy.min !== undefined ||
               localFilters.factualAccuracy.max !== undefined;
    }, [localFilters]);
    
    return (
        <View style={[styles.searchFilter, styles[`filter${variant}`]]}>
            {/* Filter Header */}
            <View style={styles.filterHeader}>
                <Text style={styles.filterTitle}>Filter Results</Text>
                
                <View style={styles.filterHeaderActions}>
                    {hasActiveFilters && (
                        <Button
                            variant="tertiary"
                            size="sm"
                            onPress={clearAllFilters}
                        >
                            Clear All
                        </Button>
                    )}
                    
                    {onClose && (
                        <IconButton
                            icon={XIcon}
                            size="sm"
                            variant="ghost"
                            onPress={onClose}
                            accessibilityLabel="Close filters"
                        />
                    )}
                </View>
            </View>
            
            <ScrollView style={styles.filterContent} showsVerticalScrollIndicator={false}>
                {/* Content Types */}
                {availableFilters?.contentTypes && (
                    <View style={styles.filterSection}>
                        <Text style={styles.filterSectionTitle}>Content Type</Text>
                        <View style={styles.filterGrid}>
                            {availableFilters.contentTypes.map((type) => (
                                <Pressable
                                    key={type.id}
                                    style={[
                                        styles.filterChip,
                                        localFilters.contentTypes.includes(type.id) && styles.filterChipActive
                                    ]}
                                    onPress={() => toggleArrayFilter('contentTypes', type.id, localFilters.contentTypes)}
                                    accessibilityRole="checkbox"
                                    accessibilityState={{ checked: localFilters.contentTypes.includes(type.id) }}
                                >
                                    <Icon
                                        name={type.icon}
                                        size={16}
                                        color={localFilters.contentTypes.includes(type.id) ? "#FFFFFF" : "#8A8A94"}
                                    />
                                    <Text style={[
                                        styles.filterChipText,
                                        localFilters.contentTypes.includes(type.id) && styles.filterChipTextActive
                                    ]}>
                                        {type.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                )}
                
                {/* Platforms */}
                {availableFilters?.platforms && (
                    <View style={styles.filterSection}>
                        <Text style={styles.filterSectionTitle}>Streaming Platforms</Text>
                        <View style={styles.filterList}>
                            {availableFilters.platforms.map((platform) => (
                                <Pressable
                                    key={platform.id}
                                    style={styles.filterListItem}
                                    onPress={() => toggleArrayFilter('platforms', platform.id, localFilters.platforms)}
                                    accessibilityRole="checkbox"
                                    accessibilityState={{ checked: localFilters.platforms.includes(platform.id) }}
                                >
                                    <View style={styles.filterCheckbox}>
                                        <View style={[
                                            styles.checkbox,
                                            localFilters.platforms.includes(platform.id) && styles.checkboxActive
                                        ]}>
                                            {localFilters.platforms.includes(platform.id) && (
                                                <Icon name="check" size={12} color="#FFFFFF" />
                                            )}
                                        </View>
                                        
                                        <Image
                                            source={{ uri: platform.logo }}
                                            style={styles.platformLogo}
                                            defaultSource={require('../assets/platform-placeholder.png')}
                                        />
                                        
                                        <Text style={styles.filterListItemText}>
                                            {platform.label}
                                        </Text>
                                    </View>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                )}
                
                {/* Year Range */}
                {availableFilters?.yearRange && (
                    <View style={styles.filterSection}>
                        <Text style={styles.filterSectionTitle}>Release Year</Text>
                        <RangeSlider
                            min={availableFilters.yearRange.min}
                            max={availableFilters.yearRange.max}
                            minValue={localFilters.years.min}
                            maxValue={localFilters.years.max}
                            onValuesChange={(min, max) => updateFilter('years', { min, max })}
                            showValues={true}
                            accessibilityLabel="Filter by release year range"
                        />
                    </View>
                )}
                
                {/* Case Status */}
                {availableFilters?.caseStatuses && (
                    <View style={styles.filterSection}>
                        <Text style={styles.filterSectionTitle}>Case Status</Text>
                        <View style={styles.filterGrid}>
                            {availableFilters.caseStatuses.map((status) => (
                                <Pressable
                                    key={status.id}
                                    style={[
                                        styles.filterChip,
                                        localFilters.caseStatus.includes(status.id) && [
                                            styles.filterChipActive,
                                            { backgroundColor: status.color }
                                        ]
                                    ]}
                                    onPress={() => toggleArrayFilter('caseStatus', status.id, localFilters.caseStatus)}
                                    accessibilityRole="checkbox"
                                    accessibilityState={{ checked: localFilters.caseStatus.includes(status.id) }}
                                >
                                    <Text style={[
                                        styles.filterChipText,
                                        localFilters.caseStatus.includes(status.id) && styles.filterChipTextActive
                                    ]}>
                                        {status.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                )}
                
                {/* Rating Range */}
                <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>Minimum Rating</Text>
                    <StarRating
                        rating={localFilters.ratings.min || 0}
                        onRatingChange={(rating) => updateFilter('ratings', { 
                            ...localFilters.ratings, 
                            min: rating 
                        })}
                        size="md"
                        allowHalfStars={false}
                        accessibilityLabel="Set minimum rating filter"
                    />
                </View>
                
                {/* Content Warnings */}
                {availableFilters?.contentWarnings && (
                    <View style={styles.filterSection}>
                        <Text style={styles.filterSectionTitle}>Content Warnings</Text>
                        <Text style={styles.filterSectionSubtitle}>
                            Hide content with these warnings
                        </Text>
                        <View style={styles.filterList}>
                            {availableFilters.contentWarnings.map((warning) => (
                                <Pressable
                                    key={warning.id}
                                    style={styles.filterListItem}
                                    onPress={() => toggleArrayFilter('contentWarnings', warning.id, localFilters.contentWarnings)}
                                    accessibilityRole="checkbox"
                                    accessibilityState={{ checked: localFilters.contentWarnings.includes(warning.id) }}
                                    accessibilityLabel={`${warning.label}: ${warning.description}`}
                                >
                                    <View style={styles.filterCheckbox}>
                                        <View style={[
                                            styles.checkbox,
                                            localFilters.contentWarnings.includes(warning.id) && styles.checkboxActive
                                        ]}>
                                            {localFilters.contentWarnings.includes(warning.id) && (
                                                <Icon name="check" size={12} color="#FFFFFF" />
                                            )}
                                        </View>
                                        
                                        <View style={styles.warningContent}>
                                            <Text style={styles.filterListItemText}>
                                                {warning.label}
                                            </Text>
                                            <Text style={styles.warningDescription}>
                                                {warning.description}
                                            </Text>
                                        </View>
                                    </View>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                )}
                
                {/* Sort Options */}
                <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>Sort By</Text>
                    <View style={styles.sortOptions}>
                        {[
                            { value: 'relevance', label: 'Relevance' },
                            { value: 'rating', label: 'Rating' },
                            { value: 'year', label: 'Release Year' },
                            { value: 'title', label: 'Title' },
                            { value: 'recent', label: 'Recently Added' }
                        ].map((option) => (
                            <Pressable
                                key={option.value}
                                style={[
                                    styles.sortOption,
                                    localFilters.sortBy === option.value && styles.sortOptionActive
                                ]}
                                onPress={() => updateFilter('sortBy', option.value as any)}
                                accessibilityRole="radio"
                                accessibilityState={{ checked: localFilters.sortBy === option.value }}
                            >
                                <Text style={[
                                    styles.sortOptionText,
                                    localFilters.sortBy === option.value && styles.sortOptionTextActive
                                ]}>
                                    {option.label}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </View>
            </ScrollView>
            
            {/* Filter Footer */}
            <View style={styles.filterFooter}>
                {resultCount !== null && (
                    <Text style={styles.resultCount}>
                        {resultCount.toLocaleString()} results
                    </Text>
                )}
                
                <Button
                    variant="primary"
                    size="md"
                    onPress={onClose}
                    style={styles.applyFiltersButton}
                >
                    Apply Filters
                </Button>
            </View>
        </View>
    );
};
```

### Search Results Component

**Purpose**: Display search results with appropriate True Crime content presentation

```typescript
interface SearchResultsProps {
    query: string;
    results: SearchResult[];
    totalCount: number;
    loading: boolean;
    filters: SearchFilters;
    layout?: 'grid' | 'list' | 'detailed';
    
    onResultPress: (result: SearchResult) => void;
    onLoadMore?: () => void;
    onQueryRefine?: (newQuery: string) => void;
}

interface SearchResult {
    id: string;
    type: 'content' | 'case' | 'person' | 'collection';
    title: string;
    subtitle?: string;
    description?: string;
    imageUrl?: string;
    relevanceScore: number;
    
    // Content-specific fields
    year?: number;
    platforms?: string[];
    contentWarning?: string;
    rating?: number;
    ratingCount?: number;
    
    // Case-specific fields
    location?: string;
    timeframe?: string;
    status?: 'solved' | 'unsolved' | 'ongoing';
    contentCount?: number;
}
```

#### Visual Specifications

**Results Layout Options**:
- **Grid Layout**: Card-based display optimized for visual browsing
- **List Layout**: Dense information display for detailed comparison
- **Detailed Layout**: Comprehensive result information with previews

```typescript
const SearchResults: React.FC<SearchResultsProps> = ({
    query,
    results,
    totalCount,
    loading,
    filters,
    layout = 'grid',
    onResultPress,
    onLoadMore,
    onQueryRefine
}) => {
    const [loadingMore, setLoadingMore] = useState(false);
    
    const renderResult = (result: SearchResult, index: number) => {
        switch (layout) {
            case 'list':
                return (
                    <SearchResultListItem
                        key={result.id}
                        result={result}
                        query={query}
                        onPress={() => onResultPress(result)}
                    />
                );
                
            case 'detailed':
                return (
                    <SearchResultDetailedItem
                        key={result.id}
                        result={result}
                        query={query}
                        onPress={() => onResultPress(result)}
                    />
                );
                
            default: // grid
                return (
                    <SearchResultCard
                        key={result.id}
                        result={result}
                        onPress={() => onResultPress(result)}
                    />
                );
        }
    };
    
    const handleLoadMore = async () => {
        if (loadingMore || !onLoadMore) return;
        
        setLoadingMore(true);
        try {
            await onLoadMore();
        } finally {
            setLoadingMore(false);
        }
    };
    
    if (loading && results.length === 0) {
        return (
            <View style={styles.searchLoading}>
                <LoadingProgress message="Searching content..." />
            </View>
        );
    }
    
    if (results.length === 0) {
        return (
            <SearchEmptyState
                query={query}
                onQueryRefine={onQueryRefine}
                suggestions={[
                    'Try broader keywords',
                    'Check spelling',
                    'Remove some filters',
                    'Search for specific cases or documentaries'
                ]}
            />
        );
    }
    
    return (
        <View style={styles.searchResults}>
            {/* Results Header */}
            <View style={styles.resultsHeader}>
                <Text style={styles.resultsCount}>
                    {totalCount.toLocaleString()} results for "{query}"
                </Text>
                
                <View style={styles.resultsControls}>
                    <SearchLayoutToggle
                        currentLayout={layout}
                        onLayoutChange={() => {/* Handle layout change */}}
                    />
                </View>
            </View>
            
            {/* Results Grid/List */}
            <FlatList
                data={results}
                renderItem={({ item, index }) => renderResult(item, index)}
                numColumns={layout === 'grid' ? 2 : 1}
                key={layout} // Force re-render when layout changes
                contentContainerStyle={styles.resultsList}
                showsVerticalScrollIndicator={false}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={() => (
                    loadingMore ? (
                        <View style={styles.loadMoreIndicator}>
                            <ActivityIndicator size="small" color="#8B4B7F" />
                            <Text style={styles.loadMoreText}>Loading more results...</Text>
                        </View>
                    ) : null
                )}
            />
        </View>
    );
};
```

## Specialized Search Components

### Voice Search Component

**Purpose**: Voice input for hands-free content discovery

```typescript
interface VoiceSearchProps {
    onVoiceResult: (transcript: string) => void;
    onVoiceError: (error: string) => void;
    variant?: 'button' | 'floating' | 'integrated';
    disabled?: boolean;
}

const VoiceSearch: React.FC<VoiceSearchProps> = ({
    onVoiceResult,
    onVoiceError,
    variant = 'button',
    disabled = false
}) => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    
    const startListening = async () => {
        try {
            setIsListening(true);
            // Voice recognition implementation would go here
            // This is a placeholder for the actual voice recognition API
        } catch (error) {
            setIsListening(false);
            onVoiceError('Voice recognition failed');
        }
    };
    
    const stopListening = () => {
        setIsListening(false);
        if (transcript) {
            onVoiceResult(transcript);
            setTranscript('');
        }
    };
    
    return (
        <Pressable
            style={[
                styles.voiceSearch,
                styles[`voiceSearch${variant}`],
                isListening && styles.voiceSearchActive,
                disabled && styles.voiceSearchDisabled
            ]}
            onPress={isListening ? stopListening : startListening}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={isListening ? 'Stop voice search' : 'Start voice search'}
            accessibilityState={{ selected: isListening }}
        >
            <Icon
                name={isListening ? 'mic-off' : 'mic'}
                size={variant === 'floating' ? 24 : 16}
                color={isListening ? '#D32F2F' : '#8B4B7F'}
            />
            
            {isListening && (
                <View style={styles.voiceWaveform}>
                    <VoiceWaveform />
                </View>
            )}
        </Pressable>
    );
};
```

### Barcode Scanner Component

**Purpose**: Scan DVDs, books, and physical media for quick content addition

```typescript
interface BarcodeScannerProps {
    onBarcodeScanned: (barcode: string, type: string) => void;
    onScanError: (error: string) => void;
    onClose: () => void;
    allowedTypes?: string[];
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
    onBarcodeScanned,
    onScanError,
    onClose,
    allowedTypes = ['ean13', 'ean8', 'upc_a', 'upc_e']
}) => {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);
    
    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        })();
    }, []);
    
    const handleBarCodeScanned = ({ type, data }: BarCodeScanningResult) => {
        setScanned(true);
        onBarcodeScanned(data, type);
    };
    
    if (hasPermission === null) {
        return (
            <View style={styles.scannerLoading}>
                <Text>Requesting camera permission...</Text>
            </View>
        );
    }
    
    if (hasPermission === false) {
        return (
            <View style={styles.scannerError}>
                <Icon name="camera-off" size={48} color="#D32F2F" />
                <Text style={styles.scannerErrorTitle}>Camera Access Required</Text>
                <Text style={styles.scannerErrorMessage}>
                    Please enable camera access to scan barcodes
                </Text>
                <Button variant="primary" onPress={onClose}>
                    Close Scanner
                </Button>
            </View>
        );
    }
    
    return (
        <View style={styles.scannerContainer}>
            <Camera
                style={styles.scanner}
                onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
                barCodeScannerSettings={{
                    barCodeTypes: allowedTypes
                }}
            >
                {/* Scanner Overlay */}
                <View style={styles.scannerOverlay}>
                    <View style={styles.scannerHeader}>
                        <Text style={styles.scannerTitle}>Scan Barcode</Text>
                        <IconButton
                            icon={XIcon}
                            variant="ghost"
                            onPress={onClose}
                            accessibilityLabel="Close scanner"
                        />
                    </View>
                    
                    <View style={styles.scannerTarget}>
                        <View style={styles.scannerFrame} />
                        <Text style={styles.scannerInstructions}>
                            Position barcode within the frame
                        </Text>
                    </View>
                    
                    {scanned && (
                        <View style={styles.scannerSuccess}>
                            <Icon name="check-circle" size={24} color="#388E3C" />
                            <Text style={styles.scannerSuccessText}>Barcode scanned!</Text>
                            <Button
                                variant="secondary"
                                size="sm"
                                onPress={() => setScanned(false)}
                            >
                                Scan Again
                            </Button>
                        </View>
                    )}
                </View>
            </Camera>
        </View>
    );
};
```

## Platform-Specific Adaptations

### iOS Search Implementation

```typescript
const IOSSearchInput: React.FC<SearchInputProps> = ({ ...props }) => {
    return (
        <SearchInput
            {...props}
            // iOS-specific optimizations
            clearButtonMode="while-editing"
            returnKeyType="search"
            enablesReturnKeyAutomatically
            autoCorrect={false}
            spellCheck={false}
            // iOS search styling
            style={[
                props.style,
                {
                    // iOS-specific shadow
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 2
                }
            ]}
        />
    );
};
```

### Android Search Implementation

```typescript
const AndroidSearchInput: React.FC<SearchInputProps> = ({ ...props }) => {
    return (
        <SearchInput
            {...props}
            // Android-specific optimizations
            underlineColorAndroid="transparent"
            importantForAutofill="yes"
            autoComplete="off"
            // Material Design elevation
            style={[
                props.style,
                { elevation: 2 }
            ]}
        />
    );
};
```

### Web Search Implementation

```typescript
const WebSearchInput: React.FC<SearchInputProps> = ({ onSubmit, ...props }) => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            onSubmit(props.value);
        }
        if (e.key === 'Escape') {
            // Clear or close suggestions
        }
    };

    return (
        <SearchInput
            {...props}
            onSubmit={onSubmit}
            // Web-specific optimizations
            autoComplete="off"
            spellCheck="false"
            onKeyDown={handleKeyDown}
        />
    );
};
```

## Testing and Quality Assurance

### Search Component Testing

```typescript
describe('SearchInput Component', () => {
    it('displays suggestions correctly', async () => {
        const suggestions = [
            {
                id: '1',
                text: 'Ted Bundy',
                type: 'person' as const,
                subtitle: 'Serial killer case'
            }
        ];
        
        const { getByPlaceholderText, getByText } = render(
            <SearchInput
                value=""
                onChangeText={jest.fn()}
                onSubmit={jest.fn()}
                suggestions={suggestions}
            />
        );
        
        const input = getByPlaceholderText(/Search/);
        fireEvent.changeText(input, 'Ted');
        
        await waitFor(() => {
            expect(getByText('Ted Bundy')).toBeTruthy();
            expect(getByText('Serial killer case')).toBeTruthy();
        });
    });
    
    it('handles accessibility correctly', () => {
        const { getByRole } = render(
            <SearchInput
                value=""
                onChangeText={jest.fn()}
                onSubmit={jest.fn()}
                accessibilityLabel="Search True Crime content"
            />
        );
        
        const searchBox = getByRole('searchbox');
        expect(searchBox.props.accessibilityLabel).toBe('Search True Crime content');
    });
});
```

This comprehensive search system provides intelligent content discovery while maintaining the respectful presentation required for True Crime content and ensuring excellent accessibility for all users.