import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';

const { width: screenWidth } = Dimensions.get('window');
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ContentCard } from '@/components/discovery/ContentCard';
import { useSearch } from '@/hooks/useSearch';
import type { Content } from '@/types/api';


export default function DiscoverScreen() {
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // Enhanced responsive grid system with proper boundary calculations
  const getResponsiveLayout = () => {
    // Add buffer to prevent edge overflow and ensure border radius is preserved
    const safeScreenWidth = screenWidth - 8; // 4px buffer on each side for border radius
    
    if (safeScreenWidth >= 1200) {
      // Desktop large
      return { numColumns: 4, cardSpacing: 12, horizontalPadding: 24 };
    } else if (safeScreenWidth >= 768) {
      // Tablet/Desktop
      return { numColumns: 3, cardSpacing: 10, horizontalPadding: 20 };
    } else if (safeScreenWidth >= 480) {
      // Large mobile
      return { numColumns: 2, cardSpacing: 8, horizontalPadding: 16 };
    } else {
      // Small mobile
      return { numColumns: 2, cardSpacing: 6, horizontalPadding: 12 };
    }
  };
  
  const { numColumns, cardSpacing, horizontalPadding } = getResponsiveLayout();
  const totalPadding = horizontalPadding * 2;
  const totalSpacing = (numColumns - 1) * cardSpacing;
  // Use Math.floor with additional buffer to ensure we don't exceed screen bounds
  // This prevents border radius clipping on rightmost cards
  const availableWidth = screenWidth - totalPadding - totalSpacing - 4; // Extra 4px buffer
  const cardWidth = Math.floor(availableWidth / numColumns);
  
  // Initialize search hook with auto-search disabled to prevent render loops
  const {
    query,
    setQuery,
    results,
    isLoading,
    isSearching,
    error,
    search,
    clearResults,
    hasNextPage,
    loadMore,
    isLoadingMore,
  } = useSearch({ 
    autoSearch: false, // Disable auto-search to prevent infinite loops
    minQueryLength: 2,
    debounceMs: 300 
  });

  const handleSearchSubmit = useCallback(() => {
    if (query.trim().length >= 2) {
      setShowSearchResults(true);
      search();
    }
  }, [query, search]);

  const handleContentPress = useCallback((content: Content) => {
    console.log('Selected content:', content.title, 'ID:', content.id);
    // Navigate to content detail screen using watchmode_id since that's what the backend expects
    router.push(`/content/${content.watchmodeId || content.id}`);
  }, []);

  const handleClearSearch = useCallback(() => {
    setQuery('');
    setShowSearchResults(false);
    clearResults();
  }, [setQuery, clearResults]);

  const renderSearchResults = () => {
    if (!showSearchResults) return null;

    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B4B7F" />
          <Text style={styles.loadingText}>Searching content...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Search failed: {error}</Text>
          <Pressable style={styles.retryButton} onPress={() => search()}>
            <Text style={styles.retryButtonText}>Retry Search</Text>
          </Pressable>
        </View>
      );
    }

    if (results.length === 0) {
      return (
        <View style={styles.noResultsContainer}>
          <Text style={styles.noResultsText}>No results found for "{query}"</Text>
          <Text style={styles.noResultsSubtext}>Try different keywords or check spelling</Text>
        </View>
      );
    }

    return (
      <View style={styles.searchResultsContainer}>
        <View style={styles.searchResultsHeader}>
          <Text style={styles.searchResultsTitle}>
            {results.length} results for "{query}"
          </Text>
          <Pressable onPress={handleClearSearch}>
            <Text style={styles.clearSearchText}>Clear</Text>
          </Pressable>
        </View>
        
        <FlatList
          data={results}
          renderItem={({ item, index }) => {
            // Calculate if this is the last item in a row
            const isLastInRow = (index + 1) % numColumns === 0;
            const isInLastRow = Math.floor(index / numColumns) === Math.floor((results.length - 1) / numColumns);
            
            return (
              <View style={{ 
                width: cardWidth,
                marginRight: isLastInRow ? 0 : cardSpacing,
                marginBottom: isInLastRow ? 0 : cardSpacing,
                // Ensure the card doesn't exceed bounds and preserve border radius
                maxWidth: cardWidth,
                overflow: 'visible', // Allow border radius to render properly
                // Add slight padding to prevent clipping on rightmost cards
                paddingRight: isLastInRow ? 2 : 0,
              }}>
                <ContentCard
                  content={item}
                  onPress={handleContentPress}
                  width={cardWidth - (isLastInRow ? 2 : 0)} // Reduce width slightly for last cards
                  showQuickActions={true}
                />
              </View>
            );
          }}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? {
            justifyContent: 'flex-start',
            paddingHorizontal: 0,
            // Ensure the wrapper doesn't overflow and allows proper border radius
            width: '100%',
            overflow: 'visible',
            flexWrap: 'nowrap', // Prevent wrapping that could cause clipping
          } : undefined}
          contentContainerStyle={{
            paddingBottom: 20,
            paddingHorizontal: horizontalPadding,
            // Ensure content container doesn't exceed screen bounds
            maxWidth: screenWidth,
            overflow: 'visible', // Allow border radius to be properly visible
          }}
          onEndReached={() => {
            if (hasNextPage && !isLoadingMore) {
              loadMore();
            }
          }}
          onEndReachedThreshold={0.1}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color="#8B4B7F" />
              </View>
            ) : null
          }
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.titleEmoji}>🔍</Text>
            <Text style={styles.title}>Discover</Text>
          </View>
          <Text style={styles.subtitle}>True Crime content across all your platforms</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearchSubmit}
            placeholder="Search for cases, killers, documentaries..."
            placeholderTextColor="#8A8A94"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable
              style={styles.clearButton}
              onPress={handleClearSearch}
            >
              <Text style={styles.clearButtonText}>×</Text>
            </Pressable>
          )}
        </View>

        {/* Search Results */}
        {renderSearchResults()}

        {/* Show default content only when not showing search results */}
        {!showSearchResults && (
          <>
            {/* Quick Filters */}
            <View style={styles.filtersContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {[
                  'Trending',
                  'Serial Killers', 
                  'Missing Persons',
                  'Netflix',
                  'Documentaries',
                  'Recent'
                ].map((filter) => (
                  <Pressable key={filter} style={styles.filterChip}>
                    <Text style={styles.filterText}>{filter}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Content Sections */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Trending This Week</Text>
              <Text style={styles.sectionSubtitle}>Popular content across all platforms</Text>
              <View style={styles.contentGrid}>
                <Text style={styles.placeholderText}>Content will load here when backend is connected</Text>
              </View>
            </View>

            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Recently Added</Text>
              <Text style={styles.sectionSubtitle}>New content from the past month</Text>
              <View style={styles.contentGrid}>
                <Text style={styles.placeholderText}>New releases and documentaries</Text>
              </View>
            </View>

            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Recommended for You</Text>
              <Text style={styles.sectionSubtitle}>Based on your viewing history</Text>
              <View style={styles.contentGrid}>
                <Text style={styles.placeholderText}>Personalized recommendations</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1C',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 32,
    paddingHorizontal: 4,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#EAEAF4',
    letterSpacing: -0.02,
  },
  subtitle: {
    fontSize: 16,
    color: '#8A8A94',
    lineHeight: 24,
    fontWeight: '400',
  },
  searchContainer: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  searchInput: {
    backgroundColor: '#2C2C30',
    borderColor: '#4A4A52',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingRight: 50,
    fontSize: 16,
    color: '#EAEAF4',
    fontWeight: '400',
    lineHeight: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8A8A94',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  filtersContainer: {
    marginBottom: 30,
    paddingHorizontal: 4,
  },
  filterChip: {
    backgroundColor: '#2C2C30',
    borderColor: '#4A4A52',
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  filterText: {
    color: '#EAEAF4',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.25,
  },
  sectionContainer: {
    marginBottom: 30,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#EAEAF4',
    marginBottom: 6,
    letterSpacing: -0.01,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#8A8A94',
    marginBottom: 20,
    lineHeight: 24,
    fontWeight: '400',
  },
  contentGrid: {
    backgroundColor: '#2C2C30',
    borderRadius: 12,
    padding: 24,
    minHeight: 140,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4A4A52',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  placeholderText: {
    color: '#8A8A94',
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 24,
    fontWeight: '400',
  },
  // Search Results Styles
  searchResultsContainer: {
    marginBottom: 30,
  },
  searchResultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#8B4B7F',
    backgroundColor: 'rgba(139, 75, 127, 0.05)',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  searchResultsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#EAEAF4',
    letterSpacing: -0.02,
    lineHeight: 30,
    flex: 1,
  },
  clearSearchText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6B35',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  // Removed searchResultsGrid and searchResultRow - handled inline now
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: '#8A8A94',
    fontSize: 16,
    marginTop: 12,
  },
  loadMoreContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  errorText: {
    color: '#F44336',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#8B4B7F',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  noResultsText: {
    color: '#EAEAF4',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  noResultsSubtext: {
    color: '#8A8A94',
    fontSize: 14,
    textAlign: 'center',
  },
});