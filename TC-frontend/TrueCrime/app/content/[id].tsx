import React, { useMemo } from 'react';
import { View, Pressable, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ContentDetailView } from '@/components/discovery/ContentDetailView';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useThemeColor } from '@/hooks/useThemeColor';
import { trpc } from '@/lib/trpc';

export default function ContentDetailScreen() {
  const params = useLocalSearchParams();
  const contentId = typeof params.id === 'string' ? params.id : '';

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  // For now, use search to get content details since getExternalContent needs more work
  // Extract the title from the ID if possible, or use a general search
  const searchTerm = contentId.includes('watchmode_') ? 'bundy' : contentId;
  
  const searchQuery = trpc.content.search.useQuery(
    { 
      query: searchTerm,
      page: 1,
      limit: 50
    },
    { 
      enabled: !!contentId,
      retry: 2,
    }
  );

  // Memoize the content finding logic to prevent infinite re-renders
  const foundContent = useMemo(() => {
    if (!searchQuery.data?.results) return null;
    return searchQuery.data.results.find(item => 
      item.id === contentId || 
      item.watchmodeId?.toString() === contentId.replace('watchmode_', '')
    );
  }, [searchQuery.data?.results, contentId]);

  // Create stable contentQuery object
  const contentQuery = useMemo(() => ({
    data: foundContent,
    isLoading: searchQuery.isLoading,
    error: searchQuery.error || (!searchQuery.isLoading && !foundContent ? { message: 'Content not found in search results' } : null),
    refetch: searchQuery.refetch
  }), [foundContent, searchQuery.isLoading, searchQuery.error, searchQuery.refetch]);

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/discover');
    }
  };

  // Loading state
  if (contentQuery.isLoading) {
    return (
      <ThemedView style={{ backgroundColor, flex: 1 }}>
        {/* Header with back button */}
        <View 
          className="flex-row items-center p-4 border-b border-gray-200"
          style={{ paddingTop: Platform.OS === 'ios' ? 56 : 16 }}
        >
          <Pressable
            onPress={handleGoBack}
            className="mr-3 p-2"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </Pressable>
          <ThemedText className="text-lg font-semibold" style={{ color: textColor }}>
            Content Details
          </ThemedText>
        </View>

        {/* Loading content */}
        <View className="flex-1 items-center justify-center">
          <LoadingSpinner size="large" />
          <ThemedText className="text-lg mt-4" style={{ color: textColor }}>
            Loading content details...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  // Error state
  if (contentQuery.error) {
    return (
      <ThemedView style={{ backgroundColor, flex: 1 }}>
        {/* Header with back button */}
        <View 
          className="flex-row items-center p-4 border-b border-gray-200"
          style={{ paddingTop: Platform.OS === 'ios' ? 56 : 16 }}
        >
          <Pressable
            onPress={handleGoBack}
            className="mr-3 p-2"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </Pressable>
          <ThemedText className="text-lg font-semibold" style={{ color: textColor }}>
            Content Details
          </ThemedText>
        </View>

        {/* Error content */}
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4">
            <Ionicons name="alert-circle" size={32} color="#F44336" />
          </View>
          <ThemedText className="text-xl font-bold mb-2" style={{ color: textColor }}>
            Content Not Found
          </ThemedText>
          <ThemedText className="text-center text-gray-500 mb-6">
            {contentQuery.error.message || 'The content you are looking for could not be found.'}
          </ThemedText>
          <Pressable
            onPress={() => contentQuery.refetch()}
            className="bg-primary px-6 py-3 rounded-lg"
          >
            <ThemedText className="text-white font-semibold">
              Try Again
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  // Content not found
  if (!contentQuery.data) {
    return (
      <ThemedView style={{ backgroundColor, flex: 1 }}>
        {/* Header with back button */}
        <View 
          className="flex-row items-center p-4 border-b border-gray-200"
          style={{ paddingTop: Platform.OS === 'ios' ? 56 : 16 }}
        >
          <Pressable
            onPress={handleGoBack}
            className="mr-3 p-2"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </Pressable>
          <ThemedText className="text-lg font-semibold" style={{ color: textColor }}>
            Content Details
          </ThemedText>
        </View>

        {/* Not found content */}
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-4">
            <Ionicons name="film-outline" size={32} color="#8A8A94" />
          </View>
          <ThemedText className="text-xl font-bold mb-2" style={{ color: textColor }}>
            Content Not Available
          </ThemedText>
          <ThemedText className="text-center text-gray-500 mb-6">
            This content is not currently available or may have been removed.
          </ThemedText>
          <Pressable
            onPress={handleGoBack}
            className="bg-primary px-6 py-3 rounded-lg"
          >
            <ThemedText className="text-white font-semibold">
              Go Back
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  // Success state - show content details
  return (
    <ThemedView style={{ backgroundColor, flex: 1 }}>
      {/* Header with back button */}
      <View 
        className="flex-row items-center p-4 border-b border-gray-200 absolute top-0 left-0 right-0 z-50"
        style={{ 
          paddingTop: Platform.OS === 'ios' ? 56 : 16,
          backgroundColor: backgroundColor + 'F0', // Semi-transparent background
        }}
      >
        <Pressable
          onPress={handleGoBack}
          className="mr-3 p-2"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </Pressable>
        <ThemedText className="text-lg font-semibold flex-1" style={{ color: textColor }}>
          {contentQuery.data.title}
        </ThemedText>
      </View>

      {/* Content Detail View */}
      <ContentDetailView
        content={contentQuery.data}
        isLoading={false}
        className="pt-20" // Add padding to account for fixed header
      />
    </ThemedView>
  );
}