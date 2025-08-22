import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Pressable,
  Platform,
  Keyboard,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { SearchBar } from '@/components/discovery/SearchBar';
import { ContentGrid } from '@/components/discovery/ContentGrid';
import { FilterPanel } from '@/components/discovery/FilterPanel';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useSearch } from '@/hooks/useSearch';
import { useContentTracking } from '@/hooks/useContentTracking';
import type { Content, SearchFilters } from '@/types/api';

const sortOptions = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'rating_desc', label: 'Highest Rated' },
  { value: 'rating_asc', label: 'Lowest Rated' },
  { value: 'release_date_desc', label: 'Newest First' },
  { value: 'release_date_asc', label: 'Oldest First' },
  { value: 'popularity_desc', label: 'Most Popular' },
  { value: 'title_asc', label: 'A-Z' },
] as const;

interface SortSelectorProps {
  selectedSort: string;
  onSortChange: (sort: string) => void;
  isVisible: boolean;
  onClose: () => void;
}

function SortSelector({ selectedSort, onSortChange, isVisible, onClose }: SortSelectorProps) {
  const backgroundColor = useThemeColor({}, 'background');
  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#2C2C30' }, 'card');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({ light: '#E5E5E5', dark: '#4A4A52' }, 'border');

  if (!isVisible) return null;

  return (
    <View className="absolute top-12 right-4 z-50">
      <ThemedView 
        className="min-w-[200px] rounded-xl border shadow-lg"
        style={{ backgroundColor: cardBg, borderColor }}
      >
        {sortOptions.map((option, index) => (
          <Pressable
            key={option.value}
            onPress={() => {
              onSortChange(option.value);
              onClose();
            }}
            className={`p-4 ${index < sortOptions.length - 1 ? 'border-b' : ''}`}
            style={{ borderBottomColor: borderColor }}
          >
            <View className="flex-row items-center justify-between">
              <ThemedText 
                className={selectedSort === option.value ? 'font-semibold' : ''}
                style={{ color: selectedSort === option.value ? '#8B4B7F' : textColor }}
              >
                {option.label}
              </ThemedText>
              {selectedSort === option.value && (
                <Ionicons name="checkmark" size={16} color="#8B4B7F" />
              )}
            </View>
          </Pressable>
        ))}
      </ThemedView>
    </View>
  );
}

export default function SearchScreen() {
  const params = useLocalSearchParams();
  const initialQuery = typeof params.q === 'string' ? params.q : '';

  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [currentSort, setCurrentSort] = useState<string>('relevance');

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({ light: '#E5E5E5', dark: '#4A4A52' }, 'border');

  // Search functionality
  const {
    query,
    setQuery,
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    results,
    pagination,
    suggestions,
    recentSearches,
    isLoading,
    isLoadingMore,
    isSearching,
    search,
    loadMore,
    error,
    hasNextPage,
  } = useSearch({
    initialQuery,
    autoSearch: true,
  });

  // Content tracking
  const {
    addToWatchlist,
    removeFromWatchlist,
    markAsWatched,
    isInWatchlist,
    isWatched,
  } = useContentTracking();

  // Set initial query if provided via params
  useEffect(() => {
    if (initialQuery && initialQuery !== query) {
      setQuery(initialQuery);
    }
  }, [initialQuery, query, setQuery]);

  const handleContentPress = useCallback((content: Content) => {
    router.push({
      pathname: '/content/[id]',
      params: { id: content.id },
    });
  }, []);

  const handleSearchSubmit = useCallback((searchQuery: string) => {
    search(searchQuery);
    Keyboard.dismiss();
  }, [search]);

  const handleGoBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/discover');
    }
  }, []);

  const handleFiltersApply = useCallback(() => {
    // Trigger search with current query and new filters
    if (query.trim()) {
      search(query);
    }
  }, [query, search]);

  const handleSortChange = useCallback((sort: string) => {
    setCurrentSort(sort);
    // Note: In a real implementation, you would update the search query
    // with the new sort parameter and re-fetch results
    console.log('Sort changed to:', sort);
  }, []);

  // Count active filters
  const activeFilterCount = Object.values(filters).filter(value => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return value !== undefined && value !== null;
  }).length;

  const hasResults = results.length > 0;
  const showEmptyState = !isLoading && !hasResults && query.length > 0;

  return (
    <ThemedView style={{ backgroundColor, flex: 1 }}>
      {/* Header */}
      <View 
        className="flex-row items-center p-4 border-b"
        style={{ 
          paddingTop: Platform.OS === 'ios' ? 56 : 16,
          borderBottomColor: borderColor,
        }}
      >
        <Pressable
          onPress={handleGoBack}
          className="mr-3 p-2"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </Pressable>
        
        <View className="flex-1">
          <SearchBar
            value={query}
            onChangeText={setQuery}
            onSubmit={handleSearchSubmit}
            suggestions={suggestions}
            recentSearches={recentSearches}
            isLoading={isSearching}
            placeholder="Search True Crime content..."
          />
        </View>
      </View>

      {/* Search Stats and Controls */}
      {(hasResults || showEmptyState) && (
        <View className="flex-row items-center justify-between p-4">
          <View className="flex-1">
            {hasResults && pagination && (
              <ThemedText className="text-sm text-gray-500">
                {pagination.total.toLocaleString()} results for "{query}"
              </ThemedText>
            )}
            {showEmptyState && (
              <ThemedText className="text-sm text-gray-500">
                No results found for "{query}"
              </ThemedText>
            )}
          </View>

          <View className="flex-row items-center space-x-2">
            {/* Filter Button */}
            <Pressable
              onPress={() => setShowFilters(true)}
              className={`flex-row items-center px-3 py-2 rounded-full border ${
                activeFilterCount > 0 ? 'bg-primary border-primary' : ''
              }`}
              style={{
                borderColor: activeFilterCount > 0 ? '#8B4B7F' : borderColor,
              }}
            >
              <Ionicons 
                name="filter" 
                size={16} 
                color={activeFilterCount > 0 ? '#FFFFFF' : textColor}
                style={{ marginRight: 4 }}
              />
              <ThemedText 
                className="text-sm font-medium"
                style={{ color: activeFilterCount > 0 ? '#FFFFFF' : textColor }}
              >
                Filter
                {activeFilterCount > 0 && ` (${activeFilterCount})`}
              </ThemedText>
            </Pressable>

            {/* Sort Button */}
            <Pressable
              onPress={() => setShowSort(!showSort)}
              className="flex-row items-center px-3 py-2 rounded-full border"
              style={{ borderColor }}
            >
              <Ionicons 
                name="swap-vertical" 
                size={16} 
                color={textColor}
                style={{ marginRight: 4 }}
              />
              <ThemedText className="text-sm font-medium" style={{ color: textColor }}>
                Sort
              </ThemedText>
            </Pressable>
          </View>
        </View>
      )}

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <View className="px-4 pb-2">
          <View className="flex-row flex-wrap">
            {filters.contentType && (
              <View className="flex-row items-center bg-primary/20 border border-primary rounded-full px-3 py-1 mr-2 mb-2">
                <ThemedText className="text-xs font-medium text-primary mr-1">
                  {filters.contentType.replace('_', ' ')}
                </ThemedText>
                <Pressable onPress={() => updateFilter('contentType', undefined)}>
                  <Ionicons name="close" size={14} color="#8B4B7F" />
                </Pressable>
              </View>
            )}
            
            {filters.caseType && (
              <View className="flex-row items-center bg-primary/20 border border-primary rounded-full px-3 py-1 mr-2 mb-2">
                <ThemedText className="text-xs font-medium text-primary mr-1">
                  {filters.caseType.replace('_', ' ')}
                </ThemedText>
                <Pressable onPress={() => updateFilter('caseType', undefined)}>
                  <Ionicons name="close" size={14} color="#8B4B7F" />
                </Pressable>
              </View>
            )}

            {filters.platforms && filters.platforms.length > 0 && (
              <View className="flex-row items-center bg-primary/20 border border-primary rounded-full px-3 py-1 mr-2 mb-2">
                <ThemedText className="text-xs font-medium text-primary mr-1">
                  {filters.platforms.length === 1 ? filters.platforms[0] : `${filters.platforms.length} platforms`}
                </ThemedText>
                <Pressable onPress={() => updateFilter('platforms', undefined)}>
                  <Ionicons name="close" size={14} color="#8B4B7F" />
                </Pressable>
              </View>
            )}

            {activeFilterCount > 0 && (
              <Pressable
                onPress={clearFilters}
                className="flex-row items-center bg-gray-200 dark:bg-gray-700 rounded-full px-3 py-1 mb-2"
              >
                <ThemedText className="text-xs font-medium text-gray-600 dark:text-gray-300">
                  Clear All
                </ThemedText>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* Search Results */}
      <View className="flex-1">
        <ContentGrid
          contents={results}
          onContentPress={handleContentPress}
          onAddToWatchlist={addToWatchlist}
          onRemoveFromWatchlist={removeFromWatchlist}
          onMarkWatched={markAsWatched}
          getIsInWatchlist={isInWatchlist}
          getIsWatched={isWatched}
          onLoadMore={loadMore}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          hasNextPage={hasNextPage}
          error={error}
          emptyMessage={query.length > 0 ? 
            `No results found for "${query}". Try adjusting your search or filters.` : 
            'Start typing to search for True Crime content...'
          }
          numColumns={2}
        />
      </View>

      {/* Filter Panel */}
      <FilterPanel
        isVisible={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onFiltersChange={setFilters}
        onApplyFilters={handleFiltersApply}
        onClearFilters={clearFilters}
        availablePlatforms={['Netflix', 'Hulu', 'Amazon Prime', 'HBO Max', 'Investigation Discovery']}
        availableGenres={['True Crime', 'Documentary', 'Mystery', 'Crime', 'Thriller']}
      />

      {/* Sort Selector */}
      <SortSelector
        selectedSort={currentSort}
        onSortChange={handleSortChange}
        isVisible={showSort}
        onClose={() => setShowSort(false)}
      />

      {/* Overlay to close sort selector */}
      {showSort && (
        <Pressable
          onPress={() => setShowSort(false)}
          className="absolute inset-0"
          style={{ zIndex: 40 }}
        />
      )}
    </ThemedView>
  );
}