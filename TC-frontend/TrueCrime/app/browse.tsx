import React, { useState, useCallback } from 'react';
import { View, Pressable, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ContentGrid } from '@/components/discovery/ContentGrid';
import { FilterPanel } from '@/components/discovery/FilterPanel';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useContentTracking } from '@/hooks/useContentTracking';
import { trpc } from '@/lib/trpc';
import type { Content, SearchFilters, ContentType } from '@/types/api';

const categories = {
  trending: {
    title: 'Trending Content',
    subtitle: 'Popular True Crime content this week',
    category: 'trending' as const,
    timeframe: 'week' as const,
  },
  recent: {
    title: 'Recently Added',
    subtitle: 'New content from the past month',
    category: 'recently_added' as const,
    timeframe: 'month' as const,
  },
  popular: {
    title: 'All-Time Popular',
    subtitle: 'Most-watched True Crime content',
    category: 'popular' as const,
    timeframe: 'all' as const,
  },
  recommended: {
    title: 'Recommended for You',
    subtitle: 'Based on your viewing history',
    category: 'recommended' as const,
    timeframe: 'all' as const,
  },
  'highest_rated': {
    title: 'Highest Rated',
    subtitle: 'Top-rated content by users',
    category: 'highest_rated' as const,
    timeframe: 'all' as const,
  },
  'serial killers': {
    title: 'Serial Killers',
    subtitle: 'Content about serial killer cases',
    category: 'trending' as const,
    timeframe: 'all' as const,
    contentType: 'DOCUMENTARY' as ContentType,
  },
  'missing persons': {
    title: 'Missing Persons',
    subtitle: 'Cases of missing people',
    category: 'trending' as const,
    timeframe: 'all' as const,
  },
  netflix: {
    title: 'Netflix Content',
    subtitle: 'True Crime available on Netflix',
    category: 'trending' as const,
    timeframe: 'all' as const,
  },
  documentaries: {
    title: 'Documentaries',
    subtitle: 'True Crime documentaries',
    category: 'trending' as const,
    timeframe: 'all' as const,
    contentType: 'DOCUMENTARY' as ContentType,
  },
} as const;

export default function BrowseScreen() {
  const params = useLocalSearchParams();
  const categoryParam = typeof params.category === 'string' ? params.category.toLowerCase() : 'trending';
  
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({ region: 'US', includeUnavailable: false });
  const [currentPage, setCurrentPage] = useState(1);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({ light: '#E5E5E5', dark: '#4A4A52' }, 'text');

  // Get category config
  const categoryConfig = categories[categoryParam as keyof typeof categories] || categories.trending;

  // Build query parameters
  const queryParams = {
    page: currentPage,
    limit: 20,
    category: categoryConfig.category,
    timeframe: categoryConfig.timeframe,
    ...('contentType' in categoryConfig && categoryConfig.contentType && { contentType: categoryConfig.contentType }),
  };

  // Fetch content
  const contentQuery = trpc.content.list.useQuery(queryParams, {
    keepPreviousData: true,
  });

  // Content tracking
  const {
    addToWatchlist,
    removeFromWatchlist,
    markAsWatched,
    isInWatchlist,
    isWatched,
  } = useContentTracking();

  const handleContentPress = useCallback((content: Content) => {
    router.push({
      pathname: '/content/[id]',
      params: { id: content.id },
    });
  }, []);

  const handleGoBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/discover');
    }
  }, []);

  const handleLoadMore = useCallback(() => {
    if (contentQuery.data?.pagination.hasNext && !contentQuery.isFetching) {
      setCurrentPage(prev => prev + 1);
    }
  }, [contentQuery.data?.pagination.hasNext, contentQuery.isFetching]);

  const handleRefresh = useCallback(() => {
    setCurrentPage(1);
    contentQuery.refetch();
  }, [contentQuery]);

  const handleFiltersApply = useCallback(() => {
    // In a real implementation, you would apply filters to the query
    setCurrentPage(1);
    contentQuery.refetch();
  }, [contentQuery]);

  const handleClearFilters = useCallback(() => {
    setFilters({ region: 'US', includeUnavailable: false });
    setCurrentPage(1);
    contentQuery.refetch();
  }, [contentQuery]);

  // Count active filters
  const activeFilterCount = Object.values(filters).filter(value => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return value !== undefined && value !== null;
  }).length;

  // Combine all pages of results
  const allResults = contentQuery.data?.results || [];

  return (
    <ThemedView style={{ backgroundColor, flex: 1 }}>
      {/* Header */}
      <View 
        className="p-4 border-b"
        style={{ 
          paddingTop: Platform.OS === 'ios' ? 56 : 16,
          borderBottomColor: borderColor,
        }}
      >
        <View className="flex-row items-center mb-3">
          <Pressable
            onPress={handleGoBack}
            className="mr-3 p-2"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </Pressable>
          
          <View className="flex-1">
            <ThemedText className="text-xl font-bold" style={{ color: textColor }}>
              {categoryConfig.title}
            </ThemedText>
            <ThemedText className="text-sm text-gray-500 mt-1">
              {categoryConfig.subtitle}
            </ThemedText>
          </View>

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
              style={{ marginRight: activeFilterCount > 0 ? 4 : 0 }}
            />
            {activeFilterCount > 0 && (
              <ThemedText className="text-sm font-medium text-white">
                {activeFilterCount}
              </ThemedText>
            )}
          </Pressable>
        </View>

        {/* Results Count */}
        {contentQuery.data?.pagination && (
          <ThemedText className="text-sm text-gray-500">
            {contentQuery.data.pagination.total.toLocaleString()} items
          </ThemedText>
        )}
      </View>

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <View className="px-4 py-2 border-b" style={{ borderBottomColor: borderColor }}>
          <View className="flex-row flex-wrap">
            {filters.contentType && (
              <View className="flex-row items-center bg-primary/20 border border-primary rounded-full px-3 py-1 mr-2 mb-2">
                <ThemedText className="text-xs font-medium text-primary mr-1">
                  {filters.contentType.replace('_', ' ')}
                </ThemedText>
                <Pressable onPress={() => setFilters(prev => ({ ...prev, contentType: undefined }))}>
                  <Ionicons name="close" size={14} color="#8B4B7F" />
                </Pressable>
              </View>
            )}
            
            {filters.caseType && (
              <View className="flex-row items-center bg-primary/20 border border-primary rounded-full px-3 py-1 mr-2 mb-2">
                <ThemedText className="text-xs font-medium text-primary mr-1">
                  {filters.caseType.replace('_', ' ')}
                </ThemedText>
                <Pressable onPress={() => setFilters(prev => ({ ...prev, caseType: undefined }))}>
                  <Ionicons name="close" size={14} color="#8B4B7F" />
                </Pressable>
              </View>
            )}

            {filters.platforms && filters.platforms.length > 0 && (
              <View className="flex-row items-center bg-primary/20 border border-primary rounded-full px-3 py-1 mr-2 mb-2">
                <ThemedText className="text-xs font-medium text-primary mr-1">
                  {filters.platforms.length === 1 ? filters.platforms[0] : `${filters.platforms.length} platforms`}
                </ThemedText>
                <Pressable onPress={() => setFilters(prev => ({ ...prev, platforms: undefined }))}>
                  <Ionicons name="close" size={14} color="#8B4B7F" />
                </Pressable>
              </View>
            )}

            <Pressable
              onPress={handleClearFilters}
              className="flex-row items-center bg-gray-200 dark:bg-gray-700 rounded-full px-3 py-1 mb-2"
            >
              <ThemedText className="text-xs font-medium text-gray-600 dark:text-gray-300">
                Clear All
              </ThemedText>
            </Pressable>
          </View>
        </View>
      )}

      {/* Content Grid */}
      <View className="flex-1">
        <ContentGrid
          contents={allResults}
          onContentPress={handleContentPress}
          onAddToWatchlist={addToWatchlist}
          onRemoveFromWatchlist={removeFromWatchlist}
          onMarkWatched={markAsWatched}
          getIsInWatchlist={isInWatchlist}
          getIsWatched={isWatched}
          onLoadMore={handleLoadMore}
          onRefresh={handleRefresh}
          isLoading={contentQuery.isLoading}
          isLoadingMore={contentQuery.isFetching && currentPage > 1}
          isRefreshing={contentQuery.isRefetching}
          hasNextPage={contentQuery.data?.pagination.hasNext}
          error={contentQuery.error?.message || null}
          emptyMessage={`No ${categoryConfig.title.toLowerCase()} found. Try adjusting your filters or check back later.`}
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
        onClearFilters={handleClearFilters}
        availablePlatforms={['Netflix', 'Hulu', 'Amazon Prime', 'HBO Max', 'Investigation Discovery', 'Peacock', 'Discovery+']}
        availableGenres={['True Crime', 'Documentary', 'Mystery', 'Crime', 'Thriller', 'Investigation']}
      />
    </ThemedView>
  );
}