import React, { useMemo, useRef } from 'react';
import {
  FlatList,
  Dimensions,
  View,
  RefreshControl,
  ListRenderItem,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ContentCard } from './ContentCard';
import { useThemeColor } from '@/hooks/useThemeColor';
import type { Content } from '@/types/api';

interface ContentGridProps {
  contents: Content[];
  onContentPress: (content: Content) => void;
  onAddToWatchlist?: (contentId: string) => void;
  onRemoveFromWatchlist?: (contentId: string) => void;
  onMarkWatched?: (contentId: string) => void;
  getIsInWatchlist?: (contentId: string) => boolean;
  getIsWatched?: (contentId: string) => boolean;
  onLoadMore?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  isRefreshing?: boolean;
  hasNextPage?: boolean;
  error?: string | null;
  emptyMessage?: string;
  numColumns?: number;
  contentContainerClassName?: string;
  showQuickActions?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

export function ContentGrid({
  contents,
  onContentPress,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  onMarkWatched,
  getIsInWatchlist,
  getIsWatched,
  onLoadMore,
  onRefresh,
  isLoading = false,
  isLoadingMore = false,
  isRefreshing = false,
  hasNextPage = false,
  error = null,
  emptyMessage = 'No content found',
  numColumns = 2,
  contentContainerClassName = '',
  showQuickActions = true,
}: ContentGridProps) {
  const flatListRef = useRef<FlatList>(null);
  
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  // Calculate card width based on number of columns
  const cardPadding = 16;
  const gridPadding = 24;
  const cardSpacing = 12;
  const totalSpacing = gridPadding * 2 + (numColumns - 1) * cardSpacing;
  const cardWidth = (screenWidth - totalSpacing) / numColumns;

  const renderContent: ListRenderItem<Content> = ({ item, index }) => (
    <View
      style={{
        marginRight: (index + 1) % numColumns === 0 ? 0 : cardSpacing,
        marginBottom: cardSpacing,
      }}
    >
      <ContentCard
        content={item}
        onPress={onContentPress}
        onAddToWatchlist={onAddToWatchlist}
        onRemoveFromWatchlist={onRemoveFromWatchlist}
        onMarkWatched={onMarkWatched}
        isInWatchlist={getIsInWatchlist?.(item.id) || false}
        isWatched={getIsWatched?.(item.id) || false}
        showQuickActions={showQuickActions}
        width={cardWidth}
      />
    </View>
  );

  const renderLoadingFooter = () => {
    if (!isLoadingMore) return null;

    return (
      <View className="py-4 items-center">
        <LoadingSpinner size="small" />
        <ThemedText className="text-sm mt-2 text-gray-500">
          Loading more content...
        </ThemedText>
      </View>
    );
  };

  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View className="flex-1 items-center justify-center py-12">
          <LoadingSpinner size="large" />
          <ThemedText className="text-lg mt-4" style={{ color: textColor }}>
            Discovering content...
          </ThemedText>
        </View>
      );
    }

    if (error) {
      return (
        <View className="flex-1 items-center justify-center py-12 px-6">
          <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4">
            <ThemedText className="text-2xl">⚠️</ThemedText>
          </View>
          <ThemedText className="text-lg font-semibold mb-2" style={{ color: textColor }}>
            Something went wrong
          </ThemedText>
          <ThemedText className="text-center text-gray-500 mb-4">
            {error}
          </ThemedText>
          {onRefresh && (
            <View className="bg-primary px-6 py-3 rounded-lg">
              <ThemedText 
                className="text-white font-medium"
                onPress={onRefresh}
              >
                Try Again
              </ThemedText>
            </View>
          )}
        </View>
      );
    }

    return (
      <View className="flex-1 items-center justify-center py-12 px-6">
        <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-4">
          <ThemedText className="text-2xl">🔍</ThemedText>
        </View>
        <ThemedText className="text-lg font-semibold mb-2" style={{ color: textColor }}>
          No content found
        </ThemedText>
        <ThemedText className="text-center text-gray-500">
          {emptyMessage}
        </ThemedText>
      </View>
    );
  };

  const handleEndReached = () => {
    if (hasNextPage && !isLoadingMore && onLoadMore) {
      onLoadMore();
    }
  };

  const keyExtractor = (item: Content, index: number) => `${item.id}-${index}`;

  const contentContainerStyle = useMemo(() => ({
    paddingHorizontal: gridPadding,
    paddingTop: cardPadding,
    paddingBottom: cardPadding,
    flexGrow: 1,
  }), []);

  if (contents.length === 0) {
    return (
      <ThemedView style={{ backgroundColor, flex: 1 }}>
        {renderEmptyState()}
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ backgroundColor, flex: 1 }}>
      <FlatList
        ref={flatListRef}
        data={contents}
        renderItem={renderContent}
        keyExtractor={keyExtractor}
        numColumns={numColumns}
        contentContainerStyle={contentContainerStyle}
        ListFooterComponent={renderLoadingFooter}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#8B4B7F"
              colors={['#8B4B7F']}
            />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={numColumns * 3}
        windowSize={10}
        getItemLayout={(data, index) => ({
          length: cardWidth / 0.75 + 80 + cardSpacing, // Card height + spacing
          offset: (cardWidth / 0.75 + 80 + cardSpacing) * Math.floor(index / numColumns),
          index,
        })}
        className={contentContainerClassName}
      />
    </ThemedView>
  );
}